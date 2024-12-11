
import { kn, ObsidianRenderer } from 'src/types';
import { ObsidianNode, GraphNode } from 'src/node';
import { GraphNodeContainer } from 'src/container';
import { Assets, Texture }  from 'pixi.js';
import { App, TFile } from 'obsidian';
import { MapChangeEvent, TagsManager } from 'src/tagsManager';


export class GraphicsManager {
    containersMap: Map<string, GraphNodeContainer>;
    spritesSize: number;
    renderer: ObsidianRenderer;
    tagsManager: TagsManager;
    app: App;
    canvas: Element;

    constructor(renderer: ObsidianRenderer, app: App, canvas: Element) {
        this.containersMap = new Map<string, GraphNodeContainer>();
        this.spritesSize = 200;
        this.renderer = renderer;
        this.tagsManager = new TagsManager();
        this.app = app;
        this.canvas = canvas;
    }

    init() {
        let requestList: Promise<void>[] = [];

        // Create the graphics
        this.renderer.nodes.forEach((node: ObsidianNode) => {
            // Create a graph node
            let graphNode = new GraphNode(node, this.app);
            let image_uri = graphNode.getImageUri();
            if (image_uri) {
                requestList.push(this.initNode(graphNode, image_uri));
            }
        });

        Promise.all(requestList).then(res => {
            // Initialize color for the tags of each node
            this.tagsManager.update(this.getAllTagTypesFromCache());
            
            // Create arcs
            this.containersMap.forEach((container: GraphNodeContainer) => {
                container.addArcs(this.tagsManager);
            });

            this.tagsManager.on('add', event => {
                this.containersMap.forEach((container: GraphNodeContainer) => {
                    container.removeArcs();
                    container.addArcs(this.tagsManager);
                    this.renderer.changed();
                });
            });

            this.tagsManager.on('remove', event => {
                this.containersMap.forEach((container: GraphNodeContainer) => {
                    container.removeArcs();
                    container.addArcs(this.tagsManager);
                    this.renderer.changed();
                });
            });

            this.tagsManager.on('change', (event: MapChangeEvent) => {
                this.containersMap.forEach((container: GraphNodeContainer) => {
                    container.updateArc(event.tagType, this.tagsManager);
                    container.updateAlpha(this.tagsManager, this.getBackgroundColor());
                    this.renderer.changed();
                });
            });
        });
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
}
