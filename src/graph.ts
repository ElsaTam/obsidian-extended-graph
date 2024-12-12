
import { Assets, Texture }  from 'pixi.js';
import { App, Component, TFile, WorkspaceLeaf } from 'obsidian';
import { Renderer } from './types';
import { ObsidianNode, GraphNode } from './node';
import { GraphNodeContainer } from './container';
import { TagsManager } from './tagsManager';
import { ExtendedGraphSettings } from './settings';


export class Graph extends Component {
    containersMap: Map<string, GraphNodeContainer>;
    spritesSize: number;
    renderer: Renderer;
    tagsManager: TagsManager;
    app: App;
    canvas: Element;
    currentTheme: string;
    classObserver: MutationObserver;
    leaf: WorkspaceLeaf;
    settings: ExtendedGraphSettings;

    constructor(renderer: Renderer, leaf: WorkspaceLeaf, app: App, canvas: Element, settings: ExtendedGraphSettings) {
        super();
        this.containersMap = new Map<string, GraphNodeContainer>();
        this.spritesSize = 200;
        this.renderer = renderer;
        this.leaf = leaf;
        this.settings = settings;
        this.tagsManager = new TagsManager(this.leaf, this.settings);
        this.addChild(this.tagsManager);
        this.app = app;
        this.canvas = canvas;
        this.currentTheme = this.app.vault.getConfig('theme') as string;
    }

    onload() {
        console.log("Loading Graph");
        let requestList: Promise<void>[] = [];

        // Create the graphics
        this.renderer.nodes.forEach((node: ObsidianNode) => {
            // Create a graph node
            let graphNode = new GraphNode(node, this.app, this.settings.imageProperty);
            let image_uri = graphNode.getImageUri();
            if (image_uri) {
                requestList.push(this.initNode(graphNode, image_uri));
            }
        });

        Promise.all(requestList).then(res => {
            // Initialize color for the tags of each node
            this.tagsManager.update(this.getAllTagTypesFromCache());

            this.leaf.trigger('extended-graph:graph-ready');

            const body = document.getElementsByTagName("body")[0];
            this.classObserver = new MutationObserver((mutationList) => {
                let item = mutationList.find(i => i.attributeName === "class");
                if (!item) return;
                const classes = body.classList.toString().split(" ");
                if (classes.contains("theme-dark") && this.currentTheme == "moonstone") {
                    this.currentTheme = "obsidian";
                    this.leaf.trigger('extended-graph:theme-change', this.currentTheme);
                }
                else if (classes.contains("theme-light") && this.currentTheme == "obsidian") {
                    this.currentTheme = "moonstone";
                    this.leaf.trigger('extended-graph:theme-change', this.currentTheme);
                }
            });
            this.classObserver.observe(body, { attributes: true });
        });
    }

    onunload(): void {
        console.log("Unload Graph");
        if (this.classObserver) {
            this.classObserver.disconnect();
        }
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

    private async initNode(graphNode: GraphNode, image_uri: string) : Promise<void> {
        await graphNode.waitReady();
        if (!this.containersMap.has(graphNode.getID()) && this.renderer.px) {
            // load texture
            await Assets.load(image_uri).then((texture: Texture) => {
                // @ts-ignore
                const shape: {x: number, y: number, radius: number} = graphNode.obsidianNode.circle.geometry.graphicsData[0].shape;
                
                // create the container
                let container = new GraphNodeContainer(graphNode, texture, shape.radius);
                container.updateBackgroundColor(this.getBackgroundColor());
    
                // add the container to the stage
                // @ts-ignore
                if (graphNode.obsidianNode.circle.getChildByName(graphNode.getID())) {
                    container.destroy();
                    return;
                }

                // @ts-ignore
                graphNode.obsidianNode.circle.addChild(container);
                container.x = shape.x;
                container.y = shape.y;
    
                this.containersMap.set(graphNode.getID(), container);
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
}
