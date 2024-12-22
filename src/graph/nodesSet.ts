import { App, TFile, WorkspaceLeaf } from "obsidian";
import { Node, NodeWrapper } from "./node";
import { Renderer } from "./renderer";
import { InteractiveManager } from "./interactiveManager";
import { GraphViewData } from "src/views/viewData";
import { getBackgroundColor } from "src/helperFunctions";
import { FUNC_NAMES, NONE_TYPE } from "src/globalVariables";
import { ExtendedGraphSettings } from "src/settings/settings";
import { Graph } from "./graph";

export class NodesSet {
    nodesMap = new Map<string, NodeWrapper>();
    connectedNodes = new Set<string>();
    disconnectedNodes: Set<string> | null;
    disabledTags: Set<string> | null;
    
    graph: Graph;
    tagsManager: InteractiveManager | null;

    constructor(graph: Graph, tagsManager: InteractiveManager | null) {
        this.graph = graph;
        this.tagsManager = tagsManager;

        if (this.graph.settings.enableTags) {
            this.disabledTags = new Set<string>();
        }
        if (this.graph.settings.enableTags && !this.graph.settings.fadeOnDisable) {
            this.disconnectedNodes = new Set<string>();
        }
    }

    load() : Promise<void>[] {
        let requestList: Promise<void>[] = [];
        this.graph.renderer.nodes.forEach((node: Node) => {
            let nodeWrapper = new NodeWrapper(node, this.graph.dispatcher.graphsManager.plugin.app, this.graph.settings);
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
        this.disconnectedNodes?.clear();
        this.disabledTags?.clear();
    }

    private async initNode(nodeWrapper: NodeWrapper) : Promise<void> {
        await nodeWrapper.init(this.graph.dispatcher.graphsManager.plugin.app, this.graph.settings.imageProperty, this.graph.renderer).then(() => {
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
    updateOpacityLayerColor() : void {
        this.nodesMap.forEach(container => {
            container.updateOpacityLayerColor(getBackgroundColor(this.graph.renderer));
        });
    }

    /**
     * Check if the renderer is ready
     * @returns true if the renderer is ready
     */
    checkRendererReady() : boolean {
        if (!(this.graph.renderer.px
                && this.graph.renderer.px.stage
                && this.graph.renderer.px.stage.children
                && this.graph.renderer.px.stage.children.length >= 2
                && this.graph.renderer.px.stage.children[1].children)) {
            return false;
        }

        const stageChildren = this.graph.renderer.px.stage.children[1].children;
        const stageNodes = stageChildren?.filter((child) => {
            let children = child.children;
            return (children) && (children.length > 0) && (children[0].constructor.name === "NodeWrapper");
        });
        if (!stageNodes) return true;

        for (const stageNode of stageNodes) {
            let correspondingNode = this.graph.renderer.nodes.find(node => node.circle === stageNode);
            if (!correspondingNode) return false;
        }
        return true;
    }

    /**
     * Called when a child is added or removed to the stage
     */
    updateNodesFromEngine() {
        new Promise<void>((resolve) => {
            let timesRun = 0;
            const intervalId = setInterval(() => {
                timesRun += 1;
                if (this.checkRendererReady()) { clearInterval(intervalId); resolve(); }
                else if (timesRun === 10)      { clearInterval(intervalId); }
            }, 100);
        }).then(() => {
            // Current nodes set by the Obsidian engine
            const newNodesIDs = this.graph.renderer.nodes.map(n => n.id);

            // Get the nodes that needs to be removed
            let nodesToRemove: string[] = [];
            if (this.graph.settings.enableTags) {
                nodesToRemove = newNodesIDs.filter(id => this.disconnectedNodes?.has(id));
            }

            // Get the nodes that were already existing and need to be reconnected
            let nodesToAdd: string[] = newNodesIDs.filter(id => this.connectedNodes.has(id));

            // Get the new nodes that need to be created
            let nodesToCreate: string[] = newNodesIDs.filter(id => !nodesToRemove.includes(id) && !nodesToAdd.includes(id));


            for (const id of nodesToAdd) {
                let node = this.graph.renderer.nodes.find(n => n.id === id);
                if (!node) continue;

                let nodeWrapper = this.get(id);
                nodeWrapper.waitReady(this.graph.renderer).then((ready: boolean) => {
                    if (!node) return;
                    nodeWrapper.node = node;
                    if (node.circle && !node.circle.getChildByName(nodeWrapper.name)) {
                        node.circle.addChild(nodeWrapper);
                    }
                });
            };
            if (nodesToRemove.length > 0) {
                this.graph.dispatcher.onEngineNeedsUpdate();
            }
            else if (nodesToCreate.length > 0) {
                this.graph.dispatcher.onGraphNeedsUpdate();
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
    getAllTagTypesFromCache(app: App) : Set<string> | null {
        if (!this.graph.settings.enableTags) return null;
        let types = new Set<string>();

        this.nodesMap.forEach(container => {
            let nodeTypes = container.updateTags(app, this.graph.settings);
            types = new Set<string>([...types, ...nodeTypes]);
        });
        types = new Set([...types].sort());
        
        return types;
    }
    
    /**
     * Disable a tag
     * @param type type of the tag
     */
    disableTag(type: string) : void {
        if (!this.graph.settings.enableTags) return;
        this.disabledTags?.add(type);
        let nodesToDisable: string[] = [];
        this.nodesMap.forEach((wrapper: NodeWrapper, id: string) => {
            if (!wrapper.hasTagType(type)) return;

            const wasActive = wrapper.isActive;
            (this.tagsManager) && wrapper.updateArcState(type, this.tagsManager);
            if(wrapper.isActive != wasActive && !wrapper.isActive) {
                nodesToDisable.push(id);
            }
        });

        (!this.graph.settings.fadeOnDisable && nodesToDisable.length > 0) && this.disableNodes(nodesToDisable);
    }

    /**
     * Enable a tag
     * @param type type of the tag
     */
    enableTag(type: string) : void {
        if (!this.graph.settings.enableTags) return;
        this.disabledTags?.delete(type);
        let nodesToEnable: string[] = [];
        this.nodesMap.forEach((wrapper: NodeWrapper, id: string) => {
            if (!wrapper.hasTagType(type)) return;
            
            const wasActive = wrapper.isActive;
            (this.tagsManager) && wrapper.updateArcState(type, this.tagsManager);
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
        if (!this.graph.settings.enableTags) return;
        this.nodesMap.forEach((wrapper: NodeWrapper) => {
            wrapper.removeArcs();
            (this.tagsManager) && wrapper.addArcs(this.tagsManager);
        });
    }

    /**
     * Remove arcs for each node
     * @param types types of tags to remove
     */
    removeArcs(types?: string[]) : void {
        if (!this.graph.settings.enableTags) return;
        this.nodesMap.forEach(w => w.removeArcs(types));
    }

    /**
     * Update the color of arcs for a certain tag type
     * @param type tag type
     * @param color new color
     */
    updateArcsColor(type: string, color: Uint8Array) : void {
        if (!this.graph.settings.enableTags) return;
        this.nodesMap.forEach(w => w.hasTagType(type) && (type !== NONE_TYPE) && (this.tagsManager) && w.updateArc(type, color, this.tagsManager));
    }

    disableNodes(ids: string[]) : void {
        if (!this.graph.settings.enableTags) return;
        ids.forEach(id => {
            this.disconnectedNodes?.add(id);
            this.connectedNodes.delete(id);
        });
        this.graph.engine.updateSearch();
    }

    enableNodes(ids: string[]) : void {
        ids.forEach(id => {
            this.connectedNodes.add(id);
            this.disconnectedNodes?.delete(id);
        });
        this.graph.engine.updateSearch();
    }

    highlightNode(file: TFile, highlight: boolean) : void {
        if (!this.graph.settings.enableFocusActiveNote) return;
        let nodeWrapper = this.nodesMap.get(file.path);
        if (!nodeWrapper) return;

        if (highlight) {
            nodeWrapper.setScale(this.graph.settings.focusScaleFactor);
            nodeWrapper.updateBackgroundColor(this.graph.renderer.colors.fillFocused.rgb);
        }
        else {
            nodeWrapper.setScale(1);
            if (nodeWrapper.node.color)
                nodeWrapper.updateBackgroundColor(nodeWrapper.node.color.rgb);
            else if ("tag" === nodeWrapper.node.type)
                nodeWrapper.updateBackgroundColor(this.graph.renderer.colors.fillTag.rgb);
            else if ("unresolved" === nodeWrapper.node.type)
                nodeWrapper.updateBackgroundColor(this.graph.renderer.colors.fillUnresolved.rgb);
            else if ("attachment" === nodeWrapper.node.type)
                nodeWrapper.updateBackgroundColor(this.graph.renderer.colors.fillAttachment.rgb);
            else 
                nodeWrapper.updateBackgroundColor(this.graph.renderer.colors.fill.rgb);
        }
    }
}