import { App, TFile } from "obsidian";
import { Node, NodeWrapper } from "./elements/node";
import { InteractiveManager } from "./interactiveManager";
import { getBackgroundColor, getFile, getImageUri, getTags } from "src/helperFunctions";
import { Graph } from "./graph";
import { Assets } from "pixi.js";
import { INVALID_KEYS } from "src/globalVariables";

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

        if (this.tagsManager) {
            this.disabledTags = new Set<string>();
        }
        if (this.tagsManager && !this.graph.settings.fadeOnDisable) {
            this.disconnectedNodes = new Set<string>();
        }
    }

    load() : void {
        this.initTagTypes();

        // Create node wrappers
        for (const node of this.graph.renderer.nodes) {
            let nodeWrapper = new NodeWrapper(
                node,
                this.graph.dispatcher.graphsManager.plugin.app,
                this.graph.settings,
                this.tagsManager
            );
            nodeWrapper.connect();
            this.nodesMap.set(nodeWrapper.node.id, nodeWrapper);
            this.connectedNodes.add(nodeWrapper.node.id);
        }

        // Load assets (images)
        let imageURIs: string[] = [];
        this.graph.renderer.nodes.forEach((node: Node) => {
            let imageUri = getImageUri(this.graph.dispatcher.graphsManager.plugin.app, this.graph.settings.imageProperty, node.id);
            (imageUri) && imageURIs.push(imageUri);
        });
        Assets.load(imageURIs).then(() => {
            for (let [id, nodeWrapper] of this.nodesMap) {
                nodeWrapper.initGraphics();
                nodeWrapper.updateGraphics();
            }
        });
    }

    unload() {
        this.nodesMap.forEach(wrapper => {
            wrapper.node.circle?.removeChild(wrapper);
            wrapper.clearGraphics();
            wrapper.destroy();
        });
        this.nodesMap.clear();
        this.connectedNodes.clear();
        this.disconnectedNodes?.clear();
        this.disabledTags?.clear();
    }

    private initTagTypes() {
        if (!this.tagsManager) return;

        let setType = (function(type: string, id: string, types: Set<string>) : boolean {
            if (this.graph.settings.unselectedInteractives["tag"].includes(type)) return false;
            if (INVALID_KEYS["tag"].includes(type)) return false;

            types.add(type);
            return true;
        }).bind(this);

        // Create tag types
        let types = new Set<string>();
        for (const node of this.graph.renderer.nodes) {
            const nodeID = node.id;
            const file = getFile(this.graph.dispatcher.graphsManager.plugin.app, nodeID);
            if (!file) continue;

            let tags = getTags(this.graph.dispatcher.graphsManager.plugin.app, file);
            let hasType = false;
            for (const tag of tags) {
                hasType = setType(tag, nodeID, types) || hasType;
            }
            if (!hasType) {
                types.add(this.graph.settings.noneType["tag"]);
            }
        }

        this.tagsManager.update(types);
    }
    
    /**
     * Update the background color. Called when the theme changes.
     */
    updateOpacityLayerColor() : void {
        this.nodesMap.forEach(wrapper => {
            wrapper.nodeImage?.updateOpacityLayerColor(getBackgroundColor(this.graph.renderer));
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
     * Get the node wrapper corresponding to a file
     * @param file the file
     */
    getNodeWrapperFromFile(file: TFile) : NodeWrapper | null {
        let foundContainer = null;
        this.nodesMap.forEach((wrapper: NodeWrapper) => {
            if (wrapper.node.id === file.path) {
                foundContainer = wrapper;
                return;
            }
        });
        return foundContainer;
    }

    /**
     * Get tag types for all nodes in the set, from the cache
     * @param app 
     * @returns 
     */
    getAllTagsInGraph(app: App) : Set<string> | null {
        if (!this.graph.settings.enableTags) return null;
        let types = new Set<string>();

        this.nodesMap.forEach(wrapper => {
            let tagTypes = wrapper.arcsWrapper?.types;
            (tagTypes) && (types = new Set<string>([...types, ...tagTypes]));
        });
        types = new Set([...types].sort());
        
        return types;
    }
    
    /**
     * Disable a tag
     * @param type type of the tag
     */
    disableTag(type: string) : string[] {
        this.disabledTags?.add(type);
        let nodesToDisable: string[] = [];
        for (const [id, wrapper] of this.nodesMap) {
            if (!wrapper.arcsWrapper && type === this.graph.settings.noneType["tag"]) {
                nodesToDisable.push(id);
                continue;
            }
            if (!wrapper.arcsWrapper || !wrapper.arcsWrapper.hasType(type)) {
                continue;
            }

            const wasActive = wrapper.isActive;
            wrapper.arcsWrapper.disableType(type);
            wrapper.updateState();
            if(wrapper.isActive != wasActive && !wrapper.isActive) {
                nodesToDisable.push(id);
            }
        }

        return nodesToDisable;
    }

    /**
     * Enable a tag
     * @param type type of the tag
     */
    enableTag(type: string) : string[] {
        this.disabledTags?.delete(type);
        let nodesToEnable: string[] = [];
        for (const [id, wrapper] of this.nodesMap) {
            if (!wrapper.arcsWrapper && type === this.graph.settings.noneType["tag"]) {
                nodesToEnable.push(id);
                continue;
            }
            if (!wrapper.arcsWrapper || !wrapper.arcsWrapper.hasType(type)) {
                continue;
            }
            
            const wasActive = wrapper.isActive;
            wrapper.arcsWrapper.enableType(type);
            wrapper.updateState();
            if(wrapper.isActive != wasActive && wrapper.isActive) {
                nodesToEnable.push(id);
            }
        }
        return nodesToEnable;
    }
    
    /**
     * Reset arcs for each node
     */
    resetArcs() : void {
        if (!this.graph.settings.enableTags) return;
        for (let [id, wrapper] of this.nodesMap) {
            let file = getFile(wrapper.app, id);
            if (!wrapper.arcsWrapper || !file) continue;
            wrapper.arcsWrapper.clearGraphics();
            let types = getTags(wrapper.app, file);
            wrapper.arcsWrapper.types = types;
            wrapper.arcsWrapper.initGraphics();
            wrapper.arcsWrapper.updateGraphics();
        }
    }

    /**
     * Update the color of arcs for a certain tag type
     * @param type tag type
     * @param color new color
     */
    updateArcsColor(type: string, color: Uint8Array) : void {
        if (!this.graph.settings.enableTags) return;
        this.nodesMap.forEach(w => {
            w.arcsWrapper?.updateTypeColor(type, color);
        });
    }

    disableNodes(ids: string[]) : void {
        for (const id of ids) {
            const nodeWrapper = this.nodesMap.get(id);
            this.connectedNodes.delete(id);
            this.disconnectedNodes?.add(id);
            if (nodeWrapper) {
                nodeWrapper.updateNode();
                nodeWrapper.node.clearGraphics();
                this.graph.renderer.nodes.remove(nodeWrapper.node);
            }
        }
    }

    enableNodes(ids: string[]) : void {
        for (const id of ids) {
            this.disconnectedNodes?.delete(id);
            this.connectedNodes.add(id);
            const nodeWrapper = this.nodesMap.get(id);
            if (nodeWrapper) {
                nodeWrapper.node.initGraphics();
                this.graph.renderer.nodes.push(nodeWrapper.node);
                nodeWrapper.updateNode();
                nodeWrapper.updateGraphics();
                nodeWrapper.connect();
                //nodeWrapper.updateGraphics();
            }
        }
    }

    connectNodes() : void {
        for (const [id, nodeWrapper] of this.nodesMap) {
            nodeWrapper.updateNode();
            nodeWrapper.updateGraphics();
            nodeWrapper.connect();
        }
    }

    enableAll() : void {
        if (!this.disconnectedNodes) return;
        this.enableNodes(Array.from(this.disconnectedNodes));
    }

    highlightNode(file: TFile, highlight: boolean) : void {
        if (!this.graph.settings.enableFocusActiveNote) return;
        let nodeWrapper = this.nodesMap.get(file.path);
        if (!nodeWrapper) return;

        if (highlight) {
            nodeWrapper.highlight(this.graph.settings.focusScaleFactor, this.graph.renderer.colors.fillFocused.rgb);
        }
        else {
            nodeWrapper.highlight(1);
        }
    }
}