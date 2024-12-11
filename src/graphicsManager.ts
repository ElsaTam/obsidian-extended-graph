
import { ObsidianRenderer } from 'src/types';
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

    constructor(renderer: ObsidianRenderer, app: App) {
        this.containersMap = new Map<string, GraphNodeContainer>();
        this.spritesSize = 16;
        this.renderer = renderer;
        this.tagsManager = new TagsManager();
        this.app = app;
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
                });
            });

            this.tagsManager.on('remove', event => {
                this.containersMap.forEach((container: GraphNodeContainer) => {
                    container.removeArcs();
                    container.addArcs(this.tagsManager);
                });
            });

            this.tagsManager.on('change', (event: MapChangeEvent) => {
                this.containersMap.forEach((container: GraphNodeContainer) => {
                    container.updateArc(event.tagType, this.tagsManager);
                });
            });
        });
    }

    private async initNode(graphNode: GraphNode, image_uri: string) : Promise<void> {
        await graphNode.waitReady();
        graphNode.setAlpha(0);
        graphNode.updateColor();
        if (!this.containersMap.has(graphNode.getID()) && this.renderer.px) {
            // load texture
            await Assets.load(image_uri).then((texture: Texture) => {
                // create the container
                let container = new GraphNodeContainer(graphNode, texture);

                this.setContainerSize(container);
                this.setContainerPosition(container);
    
                // add the container to the stage
                if (this.renderer.px.stage.getChildByName(graphNode.getID())) {
                    container.destroy();
                    return;
                }
                this.renderer.px.stage.addChildAt(container, 1);
    
                this.containersMap.set(graphNode.getID(), container);
            });
        }
    }

    private setContainerSize(container: GraphNodeContainer) : void {
        let scale = this.spritesSize / container.getSize();
        scale *= this.renderer.fNodeSizeMult / this.renderer.nodeScale;
        container.scale.set(scale);
    }

    private setContainerPosition(container: GraphNodeContainer) : void {
        container.position.set(
            // @ts-ignore
            container.getObsidianNode().x * this.renderer.scale + this.renderer.panX,
            // @ts-ignore
            container.getObsidianNode().y * this.renderer.scale + this.renderer.panY
        );
    }

    updateAll() : void {
        if (!this.renderer) { return; }
        
        // For each sprite in the graph, update its position
        this.renderer.nodes.forEach((node: ObsidianNode) => {
            //console.log(node);
            const container = this.containersMap.get(node.id);
            if (!container) return
            this.setContainerSize(container);
            this.setContainerPosition(container);
        });

        //this.updateArcs();
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
