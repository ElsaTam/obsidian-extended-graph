
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
    containersMap = new Map<string, NodeContainer>();
    nodesMap = new Map<string, NodeWrapper>();
    connectedLinksMap = new Map<string, LinkWrapper>();
    disconnectedLinksMap = new Map<string, LinkWrapper>();
    disconnectedRelationships = new Set<string>();
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
        this.interactiveManagers.set("relationship", new InteractiveManager(this.leaf, this.settings, "relationship"));
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
            this.interactiveManagers.get("tag")?.update(this.getAllTagTypesFromCache());
            this.interactiveManagers.get("relationship")?.update(this.getAllRelationshipsTypes());

            this.leaf.trigger('extended-graph:graph-ready');
        });
    }

    onunload(): void {
        
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
        if (!this.containersMap.has(nodeWrapper.getID()) && this.renderer.px) {
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
    
                this.containersMap.set(nodeWrapper.getID(), container);
            });
        }
    }

    clear() : void {
        this.containersMap.forEach((container, key) => {
            if (container) {       
                if (this.renderer) {
                    this.renderer.px?.stage.removeChild(container);
                }
                container.destroy();
                this.containersMap.delete(key);
            }
        });
    }
    
    getGraphNodeContainerFromFile(file: TFile) : NodeContainer | null {
        let foundContainer = null;
        this.containersMap.forEach((container: NodeContainer) => {
            if (container.getGraphNode().isFile(file)) {
                foundContainer = container;
                return;
            }
        });
        return foundContainer;
    }

    getAllTagTypesFromCache() : Set<string> {
        let types = new Set<string>();

        this.containersMap.forEach(container => {
            let graphNode = container.getGraphNode();
            graphNode.updateTags(this.app);
            let nodeTypes = graphNode.getTags();
            nodeTypes.forEach(type => types.add(type))
        });
        
        return types;
    }

    getAllRelationshipsTypes() : Set<string> {
        let relationships = new Set<string>();

        let hasNoType = false;
        this.connectedLinksMap.forEach(linkWrapper => {
            linkWrapper.getTypes().forEach(type => relationships.add(type));
            hasNoType = hasNoType || linkWrapper.getTypes().length == 0;
        });

        if (hasNoType) {
            relationships.add("none");
        }
        
        return relationships;
    }

    disableRelationship(type: string) : void {
        let hasChanged = false;
        this.connectedLinksMap.forEach((linkWrapper, id) => {
            const linkTypes = linkWrapper.getTypes();
            if (!linkTypes.includes(type)) return;

            if(linkTypes.every(linkType => this.interactiveManagers.get("relationship")?.isActive(linkType))) {
                return;
            }

            hasChanged = true;
    
            this.connectedLinksMap.delete(id);
            this.disconnectedLinksMap.set(id, linkWrapper);
            this.renderer.links.remove(linkWrapper._link);
    
            linkWrapper.setRenderable(false);
        });
        this.disconnectedRelationships.add(type);

        if (hasChanged) this.postMessageToWorker();
    }

    enableRelationship(type: string) : void {
        let hasChanged = false;
        this.disconnectedLinksMap.forEach((linkWrapper, id) => {
            const linkTypes = linkWrapper.getTypes();
            if (!linkTypes.includes(type)) return;

            hasChanged = true;

            this.disconnectedLinksMap.delete(linkWrapper.id);
            this.connectedLinksMap.set(linkWrapper.id, linkWrapper);
            this.renderer.links.push(linkWrapper._link);
    
            linkWrapper.setRenderable(true);
        });
        this.disconnectedRelationships.delete(type);

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
        let manager = this.interactiveManagers.get("relationship");
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
        this.containersMap.forEach((container: NodeContainer) => {
            container.removeArcs();
            (manager) && container.addArcs(manager);
        });
    }

    removeArcs() : void {
        this.containersMap.forEach((container: NodeContainer) => {
            container.removeArcs();
        });
    }

    updateArcsColor(type: string, color: Uint8Array) : void {
        let manager = this.interactiveManagers.get("tag");
        if (!manager) return;
        this.containersMap.forEach((container: NodeContainer) => {
            container.updateArc(type, color, manager);
        });
    }

    disableTag(type: string) : void {
        let manager = this.interactiveManagers.get("tag");
        if (!manager) return;
        this.disabledTags.add(type);
        this.containersMap.forEach((container: NodeContainer) => {
            container.updateAlpha(type, false, manager);
        });
    }

    enableTag(type: string) : void {
        this.disabledTags.delete(type);
        let manager = this.interactiveManagers.get("tag");
        if (!manager) return;
        this.containersMap.forEach((container: NodeContainer) => {
            container.updateAlpha(type, true, manager);
        });
    }

    updateBackground(theme: string) : void {
        this.containersMap.forEach((container: NodeContainer) => {
            container.updateBackgroundColor(this.getBackgroundColor());
        });
    }

    newView(name: string) : void {
        let view = new GraphView(name);
        view.saveGraph(this);
        this.app.workspace.trigger('extended-graph:view-needs-saving', view.data);
    }


    test() : void {
        
    }
}
