import { App, TFile, WorkspaceLeaf } from "obsidian";
import { Node, NodeWrapper } from "./node";
import { Renderer } from "./renderer";
import { ExtendedGraphSettings } from "src/settings";
import { InteractiveManager } from "./interactiveManager";
import { GraphViewData } from "src/views/viewData";
import { getBackgroundColor } from "src/helperFunctions";
import { FUNC_NAMES } from "src/globalVariables";

export class NodesSet {
    nodesMap = new Map<string, NodeWrapper>();
    connectedNodes = new Set<string>();
    disconnectedNodes = new Set<string>();
    disabledTags = new Set<string>();
    
    spritesSize: number = 200;
    
    leaf: WorkspaceLeaf;
    renderer: Renderer;
    tagsManager: InteractiveManager;
    app: App;
    settings: ExtendedGraphSettings;

    constructor(leaf: WorkspaceLeaf, renderer: Renderer, tagsManager: InteractiveManager, app: App, settings: ExtendedGraphSettings) {
        FUNC_NAMES && console.log("[NodesSet] new");
        this.leaf = leaf;
        this.renderer = renderer;
        this.tagsManager = tagsManager;
        this.app = app;
        this.settings = settings;
    }

    load() : Promise<void>[] {
        FUNC_NAMES && console.log("[NodesSet] load");
        let requestList: Promise<void>[] = [];
        this.renderer.nodes.forEach((node: Node) => {
            let nodeWrapper = new NodeWrapper(node, this.app);
            requestList.push(this.initNode(nodeWrapper));
        });
        return requestList;
    }

    unload() {
        this.nodesMap.forEach(wrapper => {
            wrapper.node.circle?.removeChild(wrapper);
            wrapper.destroy();
        });
        this.nodesMap.clear();
        this.connectedNodes.clear();
        this.disconnectedNodes.clear();
        this.disabledTags.clear();
    }

    reset() {
        this.unload();
        this.load();
    }

    private async initNode(nodeWrapper: NodeWrapper) : Promise<void> {
        FUNC_NAMES && console.log("[NodesSet] initNode");
        await nodeWrapper.init(this.app, this.settings.imageProperty, this.renderer).then(() => {
            nodeWrapper.node.circle.addChild(nodeWrapper);
            this.nodesMap.set(nodeWrapper.node.id, nodeWrapper);
            this.connectedNodes.add(nodeWrapper.node.id);
        }, () => {
            nodeWrapper.destroy();
        });
    }

    /**
     * Get the node wrapper
     * @param id 
     * @returns 
     */
    get(id: string) : NodeWrapper {
        let node = this.nodesMap.get(id);
        if (!node) {
            throw new Error(`No node for id ${id}.`)
        }
        return node;
    }
    
    /**
     * Update the background color. Called when the theme changes.
     */
    updateBackground() : void {
        FUNC_NAMES && console.log("[NodesSet] updateBackground");
        this.nodesMap.forEach(container => {
            container.updateBackgroundColor(getBackgroundColor(this.renderer));
        });
    }

    /**
     * Check if the renderer is ready
     * @returns true if the renderer is ready
     */
    checkRendererReady() : boolean {
        FUNC_NAMES && console.log("[NodesSet] checkRendererReady");
        if (!(this.renderer.px
                && this.renderer.px.stage
                && this.renderer.px.stage.children
                && this.renderer.px.stage.children.length >= 2
                && this.renderer.px.stage.children[1].children)) {
            return false;
        }

        const stageChildren = this.renderer.px.stage.children[1].children;
        const stageNodes = stageChildren?.filter((child) => {
            let children = child.children;
            return (children) && (children.length > 0) && (children[0].constructor.name === "NodeWrapper");
        });
        if (!stageNodes) return true;

        for (const stageNode of stageNodes) {
            let correspondingNode = this.renderer.nodes.find(node => node.circle === stageNode);
            if (!correspondingNode) return false;
        }
        return true;
    }

    /**
     * Called when a child is added or removed to the stage
     */
    updateNodesFromEngine() {
        FUNC_NAMES && console.log("[NodesSet] updateNodesFromEngine");

        new Promise<void>((resolve) => {
            let timesRun = 0;
            const intervalId = setInterval(() => {
                timesRun += 1;
                if (this.checkRendererReady()) { clearInterval(intervalId); resolve(); }
                else if (timesRun === 10)      { clearInterval(intervalId); }
            }, 100);
        }).then(() => {
            // Current nodes set by the Obsidian engine
            const newNodesIDs = this.renderer.nodes.map(n => n.id);

            // Get the nodes that needs to be removed
            let nodesToRemove: string[] = newNodesIDs.filter(id => this.disconnectedNodes.has(id));

            // Get the nodes that were already existing and need to be reconnected
            let nodesToAdd: string[] = newNodesIDs.filter(id => this.connectedNodes.has(id));

            // Get the new nodes that need to be created
            let nodesToCreate: string[] = newNodesIDs.filter(id => !nodesToRemove.includes(id) && !nodesToAdd.includes(id));


            for (const id of nodesToAdd) {
                let node = this.renderer.nodes.find(n => n.id === id);
                if (!node) continue;

                let nodeWrapper = this.get(id);
                nodeWrapper.waitReady(this.renderer).then((ready: boolean) => {
                    nodeWrapper.node = node;
                    if (node.circle && !node.circle.getChildByName(nodeWrapper.name)) {
                        node.circle.addChild(nodeWrapper);
                    }
                });
            };
            if (nodesToRemove.length > 0) {
                this.leaf.trigger('extended-graph:engine-needs-update');
            }
            else if (nodesToCreate.length > 0) {
                this.leaf.trigger('extended-graph:graph-needs-update');
            }

        })
    }
    
    /**
     * Get the node wrapper corresponding to a file
     * @param file the file
     */
    getNodeWrapperFromFile(file: TFile) : NodeWrapper {
        let foundContainer = null;
        this.nodesMap.forEach((container: NodeWrapper) => {
            if (container.file === file) {
                foundContainer = container;
                return;
            }
        });
        if (foundContainer) return foundContainer;
        throw new Error(`No node wrapper found for file ${file.name}.`);
    }

    /**
     * Get tag types for all nodes in the set, from the cache
     * @param app 
     * @returns 
     */
    getAllTagTypesFromCache(app: App) : Set<string> {
        let types = new Set<string>();

        this.nodesMap.forEach(container => {
            let nodeTypes = container.getTagsTypes(app);
            nodeTypes.forEach(type => types.add(type));
        });

        if (types.size == 0) {
            types.add("none");
        }
        
        return types;
    }
    
    /**
     * Disable a tag
     * @param type type of the tag
     */
    disableTag(type: string) : void {
        FUNC_NAMES && console.log("[NodesSet] disableTag");
        this.disabledTags.add(type);
        let nodesToDisable: string[] = [];
        this.nodesMap.forEach((wrapper: NodeWrapper, id: string) => {
            if (!wrapper.hasTagType(type)) return;

            const wasActive = wrapper.isActive;
            wrapper.updateArcState(type, this.tagsManager);
            if(wrapper.isActive != wasActive && !wrapper.isActive) {
                nodesToDisable.push(id);
            }
        });

        (nodesToDisable.length > 0) && this.disableNodes(nodesToDisable);
    }

    /**
     * Enable a tag
     * @param type type of the tag
     */
    enableTag(type: string) : void {
        FUNC_NAMES && console.log("[NodesSet] enableTag");
        this.disabledTags.delete(type);
        let nodesToEnable: string[] = [];
        this.nodesMap.forEach((wrapper: NodeWrapper, id: string) => {
            if (!wrapper.hasTagType(type)) return;
            
            const wasActive = wrapper.isActive;
            wrapper.updateArcState(type, this.tagsManager);
            if(wrapper.isActive != wasActive) {
                (wrapper.isActive) && nodesToEnable.push(id);
            }
        });
        (nodesToEnable.length > 0) && this.enableNodes(nodesToEnable);
    }
    
    /**
     * Reset arcs for each node
     */
    resetArcs() : void {
        FUNC_NAMES && console.log("[NodesSet] resetArcs");
        this.nodesMap.forEach((wrapper: NodeWrapper) => {
            wrapper.removeArcs();
            wrapper.addArcs(this.tagsManager);
        });
    }

    /**
     * Remove arcs for each node
     * @param types types of tags to remove
     */
    removeArcs(types?: string[]) : void {
        FUNC_NAMES && console.log("[NodesSet] removeArcs");
        this.nodesMap.forEach(w => w.removeArcs(types));
    }

    /**
     * Update the color of arcs for a certain tag type
     * @param type tag type
     * @param color new color
     */
    updateArcsColor(type: string, color: Uint8Array) : void {
        FUNC_NAMES && console.log("[NodesSet] updateArcsColor");
        this.nodesMap.forEach(c => c.hasTagType(type) && c.updateArc(type, color, this.tagsManager));
    }

    disableNodes(ids: string[]) : void {
        FUNC_NAMES && console.log("[NodesSet] disableNodes");
        ids.forEach(id => {
            this.disconnectedNodes.add(id);
            this.connectedNodes.delete(id);
        });
        this.applyAdditionalFilter();
    }

    enableNodes(ids: string[]) : void {
        FUNC_NAMES && console.log("[NodesSet] enableNodes");
        ids.forEach(id => {
            this.connectedNodes.add(id);
            this.disconnectedNodes.delete(id);
        });
        this.applyAdditionalFilter();
    }

    applyAdditionalFilter() {
        FUNC_NAMES && console.log("[NodesSet] applyAdditionalFilter");

        // @ts-ignore
        let engine: any = this.leaf.view.getViewType() === "graph" ? this.leaf.view.dataEngine : this.leaf.view.engine;
        engine.updateSearch();
    }
    
    loadView(viewData: GraphViewData) : void {
        FUNC_NAMES && console.log("[NodesSet] loadView");
        // Enable/Disable tags
        let tagsToDisable: string[] = [];
        let tagsToEnable: string[] = [];
        this.tagsManager.getTypes().forEach(type => {
            if (this.tagsManager.isActive(type) && viewData?.disabledTags.includes(type)) {
                tagsToDisable.push(type);
            }
            else if (!this.tagsManager.isActive(type) && !viewData?.disabledTags.includes(type)) {
                tagsToEnable.push(type);
            }
        });
        this.tagsManager.disable(tagsToDisable);
        this.tagsManager.enable(tagsToEnable);
    }
}