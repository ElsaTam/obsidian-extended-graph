
import { Assets, Texture }  from 'pixi.js';
import { App, Component, TFile, WorkspaceLeaf } from 'obsidian';
import { Renderer } from './renderer';
import { Node, NodeWrapper } from './node';
import { NodeContainer } from './nodeContainer';
import { ExtendedGraphSettings } from '../settings';
import { Link, LinkWrapper } from './link';
import { InteractiveManager } from './interactiveManager';
import { GraphView } from 'src/views/view';
import { GraphViewData } from 'src/views/viewData';


export class Graph extends Component {
    interactiveManagers = new Map<string, InteractiveManager>();
    nodesMap = new Map<string, NodeWrapper>();
    connectedNodesMap = new Map<string, NodeContainer>();
    disconnectedNodesMap = new Map<string, NodeContainer>();
    connectedLinksMap = new Map<string, LinkWrapper>();
    disconnectedLinksMap = new Map<string, LinkWrapper>();
    disconnectedLinks = new Set<string>();
    disabledTags = new Set<string>();
    spritesSize: number = 200;

    renderer: Renderer;
    app: App;
    canvas: Element;
    leaf: WorkspaceLeaf;
    settings: ExtendedGraphSettings;

    constructor(renderer: Renderer, leaf: WorkspaceLeaf, app: App, canvas: Element, settings: ExtendedGraphSettings) {
        super();
        this.renderer = renderer;
        this.leaf = leaf;
        this.settings = settings;
        this.interactiveManagers.set("tag", new InteractiveManager(this.leaf, this.settings, "tag"));
        this.interactiveManagers.set("link", new InteractiveManager(this.leaf, this.settings, "link"));
        this.interactiveManagers.forEach(manager => {
            this.addChild(manager);
        });
        this.app = app;
        this.canvas = canvas;
    }

    onload() {
        let requestList: Promise<void>[] = [];

        // Create the graphics
        this.renderer.nodes.forEach((node: Node) => {
            // Create a graph node
            let nodeWrapper = new NodeWrapper(node, this.app, this.settings.imageProperty);
            this.nodesMap.set(node.id, nodeWrapper);
            let image_uri = nodeWrapper.getImageUri();
            if (image_uri) {
                requestList.push(this.initNode(nodeWrapper, image_uri));
            }
        });

        this.renderer.links.forEach((link: Link) => {
            const source = this.nodesMap.get(link.source.id);
            const target = this.nodesMap.get(link.target.id);
            if (!source || !target) return;
            let linkWrapper = new LinkWrapper(link, source, target);
            requestList.push(this.initLink(linkWrapper));
        })

        Promise.all(requestList).then(res => {
            // Initialize color for the tags of each node
            this.reset(
                this.getAllTagTypesFromCache(),
                this.getAllLinksTypes()
            )

            this.leaf.trigger('extended-graph:graph-ready');
        });
    }

    onunload(): void {
        
    }

    private reset(tags: Set<string>, links: Set<string>) {
        this.interactiveManagers.get("tag")?.update(tags);
        this.interactiveManagers.get("link")?.update(links);
    }

    private getBackgroundColor() : Uint8Array {
        let bg = window.getComputedStyle(this.canvas).backgroundColor;
        let el: Element = this.canvas;
        while (bg.startsWith("rgba(") && bg.endsWith(", 0)") && el.parentElement) {
            el = el.parentElement as Element;
            bg = window.getComputedStyle(el).backgroundColor;
        }
        bg = bg.replace("rgba", "").replace("rgb", "").replace("(", "").replace(")", "");
        const RGB = bg.split(", ").map(c => parseInt(c));
        return Uint8Array.from(RGB);
    }

    private async initLink(linkWrapper: LinkWrapper) : Promise<void> {
        await linkWrapper.waitReady();
        linkWrapper.init();
        this.connectedLinksMap.set(linkWrapper.id, linkWrapper);
    }

    private async initNode(nodeWrapper: NodeWrapper, image_uri: string) : Promise<void> {
        await nodeWrapper.waitReady();
        if (!this.connectedNodesMap.has(nodeWrapper.getID()) && this.renderer.px) {
            // load texture
            await Assets.load(image_uri).then((texture: Texture) => {
                // @ts-ignore
                const shape: {x: number, y: number, radius: number} = nodeWrapper.node.circle.geometry.graphicsData[0].shape;
                
                // create the container
                let container = new NodeContainer(nodeWrapper, texture, shape.radius);
                container.updateBackgroundColor(this.getBackgroundColor());
    
                // add the container to the stage
                // @ts-ignore
                if (nodeWrapper.node.circle.getChildByName(nodeWrapper.getID())) {
                    container.destroy();
                    return;
                }

                // @ts-ignore
                nodeWrapper.node.circle.addChild(container);
                container.x = shape.x;
                container.y = shape.y;
    
                this.connectedNodesMap.set(nodeWrapper.getID(), container);
            });
        }
    }
    
    getGraphNodeContainerFromFile(file: TFile) : NodeContainer | null {
        let foundContainer = null;
        (new Map([...this.connectedNodesMap, ...this.disconnectedNodesMap]))
            .forEach((container: NodeContainer) => {
                if (container.getGraphNode().isFile(file)) {
                    foundContainer = container;
                    return;
                }
            });
        return foundContainer;
    }

    getAllTagTypesFromCache() : Set<string> {
        let types = new Set<string>();

        (new Map([...this.connectedNodesMap, ...this.disconnectedNodesMap]))
            .forEach(container => {
                let node = container.getGraphNode();
                let nodeTypes = node.getTagsTypes(this.app);
                nodeTypes.forEach(type => types.add(type));
            });

        if (types.size == 0) {
            types.add("none");
        }
        
        return types;
    }

    getAllLinksTypes() : Set<string> {
        let links = new Set<string>();

        let hasNoType = false;
        this.connectedLinksMap.forEach(linkWrapper => {
            linkWrapper.getLinkTypes().forEach(type => links.add(type));
            hasNoType = hasNoType || linkWrapper.getLinkTypes().length == 0;
        });

        if (hasNoType) {
            links.add("none");
        }
        
        return links;
    }

    disableNodes(ids: string[]) : void {
        for(const id of ids) {
            let node = this.connectedNodesMap.get(id);
            if (!node) return;
            this.disconnectedNodesMap.set(id, node);
            this.connectedNodesMap.delete(id);
        }
        let newFilter = "";
        for(const id of this.disconnectedNodesMap.keys()) {
            newFilter += `-path:"${id}" `
        }
        this.applyAdditionalFilter(newFilter);
    }

    enableNodes(ids: string[]) : void {
        for(const id of ids) {
            let node = this.disconnectedNodesMap.get(id);
            if (!node) return;
            this.connectedNodesMap.set(id, node);
            this.disconnectedNodesMap.delete(id);
        }
        let newFilter = "";
        for(const id of this.disconnectedNodesMap.keys()) {
            newFilter += ` -path:"${id}"`
        }
        this.applyAdditionalFilter(newFilter);
    }

    private applyAdditionalFilter(newFilter: string) {
        // @ts-ignore
        let engine: any = this.leaf.view.dataEngine;
        let query = [];
        let filter = engine.filterOptions.search.getValue();
        filter += newFilter;
        (filter) && query.push({
            query: filter,
            color: null
        }),
        query = query.concat(engine.colorGroupOptions.getColoredQueries()),
        engine.setQuery(query),
        engine.onOptionsChange();
    }

    disableLinks(types: string[]) : void {
        let hasChanged = false;
        types.forEach(type => {
            this.connectedLinksMap.forEach((linkWrapper, id) => {
                const linkTypes = linkWrapper.getLinkTypes();
                if (!linkTypes.includes(type)) return;
    
                if(linkTypes.every(linkType => this.interactiveManagers.get("link")?.isActive(linkType))) {
                    return;
                }
    
                hasChanged = true;
        
                this.connectedLinksMap.delete(id);
                this.disconnectedLinksMap.set(id, linkWrapper);
                this.renderer.links.remove(linkWrapper._link);
        
                linkWrapper.setRenderable(false);
            });
            this.disconnectedLinks.add(type);
        });

        if (hasChanged) this.postMessageToWorker();
    }

    enableLinks(types: string[]) : void {
        let hasChanged = false;
        types.forEach(type => {
            this.disconnectedLinksMap.forEach((linkWrapper, id) => {
                const linkTypes = linkWrapper.getLinkTypes();
                if (!linkTypes.includes(type)) return;

                hasChanged = true;

                this.disconnectedLinksMap.delete(linkWrapper.id);
                this.connectedLinksMap.set(linkWrapper.id, linkWrapper);
                this.renderer.links.push(linkWrapper._link);
        
                linkWrapper.setRenderable(true);
            });
            this.disconnectedLinks.delete(type);
        });

        if (hasChanged) this.postMessageToWorker();
    }

    private postMessageToWorker() : void {
        let nodes: any = {};
        this.renderer.nodes.forEach(node => {
            nodes[node.id] = [node.x, node.y];
        });

        let links: any[] = [];
        this.renderer.links.forEach(link => {
            links.push([link.source.id, link.target.id]);
        });

        this.renderer.worker.postMessage({
            nodes: nodes,
            links: links,
            alpha: .3,
            run: !0
        });
    }

    updateLinksColor(type: string, color: Uint8Array) : void {
        let manager = this.interactiveManagers.get("link");
        if (!manager) return;
        this.connectedLinksMap.forEach((linkWrapper: LinkWrapper) => {
            if (linkWrapper.getType(manager) == type) {
                linkWrapper.setColor(color);
            }
        });
        this.disconnectedLinksMap.forEach((linkWrapper: LinkWrapper) => {
            if (linkWrapper.getType(manager) == type) {
                linkWrapper.setColor(color);
            }
        });
    }

    resetArcs() : void {
        let manager = this.interactiveManagers.get("tag");
        (new Map([...this.connectedNodesMap, ...this.disconnectedNodesMap]))
            .forEach((container: NodeContainer) => {
                container.removeArcs();
                (manager) && container.addArcs(manager);
            });
    }

    removeArcs() : void {
        (new Map([...this.connectedNodesMap, ...this.disconnectedNodesMap]))
            .forEach((container: NodeContainer) => {
                container.removeArcs();
            });
    }

    updateArcsColor(type: string, color: Uint8Array) : void {
        let manager = this.interactiveManagers.get("tag");
        if (!manager) return;
        (new Map([...this.connectedNodesMap, ...this.disconnectedNodesMap]))
            .forEach((container: NodeContainer) => {
                container.updateArc(type, color, manager);
            });
    }

    disableTag(type: string) : void {
        let manager = this.interactiveManagers.get("tag");
        if (!manager) return;
        this.disabledTags.add(type);
        let disabledNodes: string[] = [];
        this.connectedNodesMap.forEach((container: NodeContainer, id: string) => {
            const wasActive = container._nodeWrapper.isActive;
            container.updateArcState(type, false, manager);
            if(container._nodeWrapper.isActive != wasActive) {
                (!container._nodeWrapper.isActive) && disabledNodes.push(id);
            }
        });
        (disabledNodes.length > 0) && this.leaf.trigger('extended-graph:disable-nodes', disabledNodes);
    }

    enableTag(type: string) : void {
        this.disabledTags.delete(type);
        let manager = this.interactiveManagers.get("tag");
        if (!manager) return;
        let enabledNodes: string[] = [];
        (new Map([...this.connectedNodesMap, ...this.disconnectedNodesMap]))
            .forEach((container: NodeContainer, id: string) => {
                const wasActive = container._nodeWrapper.isActive;
                container.updateArcState(type, true, manager);
                if(container._nodeWrapper.isActive != wasActive) {
                    (container._nodeWrapper.isActive) && enabledNodes.push(id);
                }
            });
        (enabledNodes.length > 0) && this.leaf.trigger('extended-graph:enable-nodes', enabledNodes);
    }

    updateBackground(theme: string) : void {
        (new Map([...this.connectedNodesMap, ...this.disconnectedNodesMap]))
            .forEach((container: NodeContainer) => {
                container.updateBackgroundColor(this.getBackgroundColor());
            });
    }

    loadView(viewData: GraphViewData) : void {
        // Enable/Disable tags
        let tagsManager = this.interactiveManagers.get("tag");
        let tagsToDisable: string[] = [];
        let tagsToEnable: string[] = [];
        if (tagsManager) {
            tagsManager.getTypes().forEach(type => {
                if (tagsManager.isActive(type) && viewData?.disabledTags.includes(type)) {
                    tagsToDisable.push(type);
                }
                else if (!tagsManager.isActive(type) && !viewData?.disabledTags.includes(type)) {
                    tagsToEnable.push(type);
                }
            });
            tagsManager.disable(tagsToDisable);
            tagsManager.enable(tagsToEnable);
        }

        // Enable/Disable links
        let linksManager = this.interactiveManagers.get("link");
        let linksToDisable: string[] = [];
        let linksToEnable: string[] = [];
        if (linksManager) {
            linksManager.getTypes().forEach(type => {
                if (linksManager.isActive(type) && viewData?.disabledLinks.includes(type)) {
                    linksToDisable.push(type);
                }
                else if (!linksManager.isActive(type) && !viewData?.disabledLinks.includes(type)) {
                    linksToEnable.push(type);
                }
            });
            linksManager.disable(linksToDisable);
            linksManager.enable(linksToEnable);
        }
    }

    newView(name: string) : void {
        let view = new GraphView(name);
        view.setID();
        view.saveGraph(this);
        this.app.workspace.trigger('extended-graph:view-needs-saving', view.data);
    }

    saveView(id: string) : void {
        let viewData = this.settings.views.find(v => v.id == id);
        if (!viewData) return;
        let view = new GraphView(viewData?.name);
        view.setID(id);
        view.saveGraph(this);
        this.app.workspace.trigger('extended-graph:view-needs-saving', view.data);
    }


    test() : void {
        
    }
}
