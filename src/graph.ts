
import { Assets, Texture }  from 'pixi.js';
import { App, Component, TFile, WorkspaceLeaf } from 'obsidian';
import { Renderer } from './types';
import { Node, NodeWrapper } from './node';
import { GraphNodeContainer } from './container';
import { TagsManager } from './tagsManager';
import { ExtendedGraphSettings } from './settings';
import { Link, LinkWrapper } from './link';


export class Graph extends Component {
    containersMap: Map<string, GraphNodeContainer>;
    connectedLinksMap: Map<string, LinkWrapper>;
    disconnectedLinksMap: Map<string, LinkWrapper>;
    spritesSize: number;
    renderer: Renderer;
    tagsManager: TagsManager;
    app: App;
    canvas: Element;
    leaf: WorkspaceLeaf;
    settings: ExtendedGraphSettings;

    constructor(renderer: Renderer, leaf: WorkspaceLeaf, app: App, canvas: Element, settings: ExtendedGraphSettings) {
        super();
        this.containersMap = new Map<string, GraphNodeContainer>();
        this.connectedLinksMap = new Map<string, LinkWrapper>();
        this.disconnectedLinksMap = new Map<string, LinkWrapper>();
        this.spritesSize = 200;
        this.renderer = renderer;
        this.leaf = leaf;
        this.settings = settings;
        this.tagsManager = new TagsManager(this.leaf, this.settings);
        this.addChild(this.tagsManager);
        this.app = app;
        this.canvas = canvas;
    }

    onload() {
        console.log("Loading Graph");
        let requestList: Promise<void>[] = [];

        // Create the graphics
        this.renderer.nodes.forEach((node: Node) => {
            // Create a graph node
            let nodeWrapper = new NodeWrapper(node, this.app, this.settings.imageProperty);
            let image_uri = nodeWrapper.getImageUri();
            if (image_uri) {
                requestList.push(this.initNode(nodeWrapper, image_uri));
            }
        });

        this.renderer.links.forEach((link: Link) => {
            let linkWrapper = new LinkWrapper(link);
            requestList.push(this.initLink(linkWrapper));
        })

        Promise.all(requestList).then(res => {
            // Initialize color for the tags of each node
            this.tagsManager.update(this.getAllTagTypesFromCache());

            this.leaf.trigger('extended-graph:graph-ready');
        });
    }

    onunload(): void {
        console.log("Unload Graph");
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
        linkWrapper.setTint(new Uint8Array([255, 0, 0]));
    }

    private async initNode(nodeWrapper: NodeWrapper, image_uri: string) : Promise<void> {
        await nodeWrapper.waitReady();
        console.log(nodeWrapper.node);
        if (!this.containersMap.has(nodeWrapper.getID()) && this.renderer.px) {
            // load texture
            await Assets.load(image_uri).then((texture: Texture) => {
                // @ts-ignore
                const shape: {x: number, y: number, radius: number} = nodeWrapper.node.circle.geometry.graphicsData[0].shape;
                
                // create the container
                let container = new GraphNodeContainer(nodeWrapper, texture, shape.radius);
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
    
    getGraphNodeContainerFromFile(file: TFile) : GraphNodeContainer | null {
        let foundContainer = null;
        this.containersMap.forEach((container: GraphNodeContainer) => {
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

    disconnect(linkWrapper: LinkWrapper) : void {
        if (! this.connectedLinksMap.get(linkWrapper.id) || this.disconnectedLinksMap.get(linkWrapper.id)) {
            return;
        }

        this.connectedLinksMap.delete(linkWrapper.id);
        this.disconnectedLinksMap.set(linkWrapper.id, linkWrapper);
        this.renderer.links.remove(linkWrapper._link);

        linkWrapper.setRenderable(false);

        this.postMessageToWorker();
    }

    connect(linkWrapper: LinkWrapper) : void {
        if (this.connectedLinksMap.get(linkWrapper.id) || ! this.disconnectedLinksMap.get(linkWrapper.id)) {
            return;
        }

        this.disconnectedLinksMap.delete(linkWrapper.id);
        this.connectedLinksMap.set(linkWrapper.id, linkWrapper);
        this.renderer.links.push(linkWrapper._link);

        linkWrapper.setRenderable(true);

        this.postMessageToWorker();
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

    resetArcs() : void {
        this.containersMap.forEach((container: GraphNodeContainer) => {
            container.removeArcs();
            container.addArcs(this.tagsManager);
        });
    }

    removeArcs() : void {
        this.containersMap.forEach((container: GraphNodeContainer) => {
            container.removeArcs();
        });
    }

    updateArcsColor(type: string, color: Uint8Array) : void {
        this.containersMap.forEach((container: GraphNodeContainer) => {
            container.updateArc(type, color, this.tagsManager);
        });
    }

    disableTag(type: string) : void {
        this.containersMap.forEach((container: GraphNodeContainer) => {
            container.updateAlpha(type, false, this.tagsManager);
        });
    }

    enableTag(type: string) : void {
        this.containersMap.forEach((container: GraphNodeContainer) => {
            container.updateAlpha(type, true, this.tagsManager);
        });
    }

    updateBackground(theme: string) : void {
        this.containersMap.forEach((container: GraphNodeContainer) => {
            container.updateBackgroundColor(this.getBackgroundColor());
        });
    }





    test() : void {
        let linkWrapper = Array.from(this.connectedLinksMap.values())[0];
        if (linkWrapper) {
            //console.log("Disconnecting ", linkWrapper.id);
            //this.disconnect(linkWrapper);
            //console.log("Connecting ", linkWrapper.id);
            //this.connect(linkWrapper);
        }
    }
}
