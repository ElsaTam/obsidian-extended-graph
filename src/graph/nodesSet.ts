import { App, TFile } from "obsidian";
import { ONode, NodeWrapper } from "./elements/node";
import { InteractiveManager } from "./interactiveManager";
import { getBackgroundColor, getFile, getFileInteractives, getImageUri } from "src/helperFunctions";
import { Graph } from "./graph";
import { Assets } from "pixi.js";
import { DisconnectionCause, INVALID_KEYS } from "src/globalVariables";

export class NodesSet {
    nodesMap = new Map<string, NodeWrapper>();
    connectedNodes = new Set<string>();
    disconnectedNodes: {[cause: string] : Set<string>} = {};
    
    graph: Graph;
    managers = new Map<string, InteractiveManager>();
    disabledInteractives = new Map<string, Set<string>>();

    constructor(graph: Graph, managers: InteractiveManager[]) {
        this.graph = graph;
        for (const manager of managers) {
            if (manager.name === "link") continue;
            this.managers.set(manager.name, manager);
            this.disabledInteractives.set(manager.name, new Set<string>());
        }

        for (const value of Object.values(DisconnectionCause)) {
            this.disconnectedNodes[value] = new Set<string>();
        }
    }

    load() : void {
        let areNodesMissing = false;
        for (const [key, manager] of this.managers) {
            areNodesMissing = !!this.addMissingInteractiveTypes(key) || areNodesMissing;
        }
        let addedNodes = this.addMissingNodes();
        if (addedNodes.size > 0) this.loadAssets(addedNodes);
    }

    /**
     * Unloads the nodes set, removing all nodes and clearing related data.
     */
    unload() {
        this.nodesMap.forEach(wrapper => {
            wrapper.node.circle?.removeChild(wrapper);
            wrapper.clearGraphics();
            wrapper.destroy();
        });
        this.nodesMap.clear();
        this.connectedNodes.clear();
        for (const value of Object.values(DisconnectionCause)) {
            this.disconnectedNodes[value].clear();
        }
        this.managers.clear();
        this.disabledInteractives?.clear();
    }

    /**
     * Initializes the tag types for the nodes set.
     * @returns True if there are missing nodes in the graph, false otherwise.
     */
    private addMissingInteractiveTypes(key: string) : boolean | undefined {
        if (!this.managers.has(key)) return;

        const setType = (function(type: string, types: Set<string>) : boolean {
            if (this.graph.staticSettings.unselectedInteractives[key].includes(type)) return false;
            if (INVALID_KEYS[key].includes(type)) return false;

            types.add(type);
            return true;
        }).bind(this);

        // Create tag types
        let missingTypes = new Set<string>();
        let isNodeMissing = false;
        for (const node of this.graph.renderer.nodes) {
            const nodeID = node.id;
            const file = getFile(this.graph.dispatcher.graphsManager.plugin.app, nodeID);
            if (!file) continue;
            if (this.nodesMap.has(nodeID)) continue;

            isNodeMissing = true;
            let interactives = getFileInteractives(key, this.graph.dispatcher.graphsManager.plugin.app, file);
            let hasType = false;
            for (const interactive of interactives) {
                if (!this.managers.get(key)?.interactives.has(interactive)) {
                    hasType = setType(interactive, missingTypes) || hasType;
                }
                else {
                    hasType = true;
                }
            }
            if (!hasType && !this.managers.get(key)?.interactives.has(this.graph.staticSettings.noneType[key])) {
                missingTypes.add(this.graph.staticSettings.noneType[key]);
            }
        }

        this.managers.get(key)?.addTypes(missingTypes);
        return isNodeMissing;
    }

    /**
     * Adds missing nodes to the nodes set.
     * @returns A set of node IDs that are missing from the nodes set.
     */
    addMissingNodes() : Set<string> {
        let missingNodes = new Set<string>();
        for (const node of this.graph.renderer.nodes) {
            let nodeWrapper = this.nodesMap.get(node.id);
            if (nodeWrapper && node !== nodeWrapper.node) {
                nodeWrapper.disconnect();
                nodeWrapper.node = node;
                nodeWrapper.connect();
            }
            else if (!nodeWrapper) {
                missingNodes.add(node.id);
                let nodeWrapper = new NodeWrapper(
                    node,
                    this.graph.dispatcher.graphsManager.plugin.app,
                    this.graph.staticSettings,
                    [...this.managers.values()]
                );
                nodeWrapper.connect();
                this.nodesMap.set(nodeWrapper.node.id, nodeWrapper);
                this.connectedNodes.add(nodeWrapper.node.id);
            }
        }
        return missingNodes;
    }
    
    loadAssets(ids: Set<string>) : void {
        let imageURIs: string[] = [];
        for (const id of ids) {
            let imageUri = getImageUri(this.graph.dispatcher.graphsManager.plugin.app, this.graph.staticSettings.imageProperty, id);
            (imageUri) && imageURIs.push(imageUri);
        }
        Assets.load(imageURIs).then(() => {
            for (const id of ids) {
                this.nodesMap.get(id)?.initGraphics();
            }
        });
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
     * Gets the node wrapper corresponding to a file.
     * @param file - The file.
     * @returns The node wrapper corresponding to the file, or null if not found.
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
     * Gets tag types for all nodes in the set, from the cache.
     * @param app - The application instance.
     * @returns A set of tag types, or null if tags are not enabled.
     */
    getAllInteractivesInGraph(key: string) : Set<string> | null {
        if (!this.graph.staticSettings.enableTags) return null;
        let types = new Set<string>();

        this.nodesMap.forEach(wrapper => {
            let types = wrapper.arcsWrappers.get(key)?.types;
            (types) && (types = new Set<string>([...types, ...types]));
        });
        types = new Set([...types].sort());
        
        return types;
    }
    
    /**
     * Disables a tag.
     * @param type - The type of the tag.
     * @returns An array of node IDs to be disabled.
     */
    disableInteractive(key: string, type: string) : string[] {
        this.disabledInteractives.get(key)?.add(type);
        let nodesToDisable: string[] = [];
        for (const [id, wrapper] of this.nodesMap) {
            if (!wrapper.arcsWrappers.has(key) && type === this.graph.staticSettings.noneType[key]) {
                nodesToDisable.push(id);
                continue;
            }
            if (!wrapper.arcsWrappers.has(key) || !wrapper.arcsWrappers.get(key)?.hasType(type)) {
                continue;
            }

            const wasActive = wrapper.isActive;
            wrapper.arcsWrappers.get(key)?.disableType(type);
            wrapper.updateState();
            if(wrapper.isActive != wasActive && !wrapper.isActive) {
                nodesToDisable.push(id);
            }
        }

        return nodesToDisable;
    }

    /**
     * Enables a tag.
     * @param type - The type of the tag.
     * @returns An array of node IDs to be enabled.
     */
    enableInteractive(key: string, type: string) : string[] {
        this.disabledInteractives.get(key)?.delete(type);
        let nodesToEnable: string[] = [];
        for (const [id, wrapper] of this.nodesMap) {
            if (!wrapper.arcsWrappers.has(key) && type === this.graph.staticSettings.noneType[key]) {
                nodesToEnable.push(id);
                continue;
            }
            if (!wrapper.arcsWrappers.has(key) || !wrapper.arcsWrappers.get(key)?.hasType(type)) {
                continue;
            }
            
            const wasActive = wrapper.isActive;
            wrapper.arcsWrappers.get(key)?.enableType(type);
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
    resetArcs(key: string) : void {
        if (!this.graph.staticSettings.enableTags) return;
        for (let [id, wrapper] of this.nodesMap) {
            let file = getFile(wrapper.app, id);
            let arcWrapper = wrapper.arcsWrappers.get(key);
            if (!arcWrapper || !file) continue;
            arcWrapper.clearGraphics();
            arcWrapper.setTypes(getFileInteractives(key, wrapper.app, file));
            arcWrapper.initGraphics();
            arcWrapper.updateGraphics();
        }
    }

    /**
     * Updates the color of arcs for a certain tag type.
     * @param type - The tag type.
     * @param color - The new color.
     */
    updateArcsColor(key: string, type: string, color: Uint8Array) : void {
        if (!this.graph.staticSettings.enableTags) return;
        this.nodesMap.forEach(w => {
            let arcWrapper = w.arcsWrappers.get(key);
            arcWrapper?.redrawArc(type, color);
        });
    }

    /**
     * Disables nodes specified by their IDs.
     * @param ids - Array of node IDs to disable.
     * @param cause - The cause for the disconnection.
     */
    disableNodes(ids: string[], cause: string) : void {
        for (const id of ids) {
            if (this.connectedNodes.has(id)) {
                this.connectedNodes.delete(id);
                this.disconnectedNodes[cause].add(id);
            }
            const nodeWrapper = this.nodesMap.get(id);
            if (nodeWrapper) {
                nodeWrapper.updateNode();
                nodeWrapper.node.clearGraphics();
                this.graph.renderer.nodes.remove(nodeWrapper.node);
            }
        }
    }

    /**
     * Enables nodes specified by their IDs.
     * @param ids - Array of node IDs to enable.
     * @param cause - The cause for the reconnection.
     */
    enableNodes(ids: string[], cause: string) : void {
        for (const id of ids) {
            if (this.disconnectedNodes[cause].has(id)) {
                this.connectedNodes.add(id);
                this.disconnectedNodes[cause].delete(id);
            }
            const nodeWrapper = this.nodesMap.get(id);
            if (nodeWrapper) {
                nodeWrapper.node.initGraphics();
                this.graph.renderer.nodes.push(nodeWrapper.node);
                nodeWrapper.updateNode();
                nodeWrapper.connect();
            }
        }
    }

    /**
     * Connects all node wrappers in the set to their obsidian node.
     */
    connectNodes() : void {
        for (const [id, nodeWrapper] of this.nodesMap) {
            nodeWrapper.updateNode();
            nodeWrapper.connect();
        }
    }

    /**
     * Highlights or unhighlights a node based on the provided file.
     * @param file - The file corresponding to the node.
     * @param highlight - Whether to highlight or unhighlight the node.
     */
    highlightNode(file: TFile, highlight: boolean) : void {
        if (!this.graph.staticSettings.enableFocusActiveNote) return;
        let nodeWrapper = this.nodesMap.get(file.path);
        if (!nodeWrapper) return;

        if (highlight) {
            nodeWrapper.highlight(this.graph.staticSettings.focusScaleFactor, this.graph.renderer.colors.fillFocused.rgb);
        }
        else {
            nodeWrapper.highlight(1);
        }
    }
}