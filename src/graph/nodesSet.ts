import { TFile } from "obsidian";
import { NodeWrapper, ONode } from "./elements/node";
import { InteractiveManager } from "./interactiveManager";
import { getBackgroundColor, getFile, getFileInteractives, getImageUri } from "src/helperFunctions";
import { Graph } from "./graph";
import { Assets, Texture } from "pixi.js";
import { DisconnectionCause, INVALID_KEYS, LINK_KEY } from "src/globalVariables";

export class NodesSet {
    nodesMap = new Map<string, NodeWrapper>();
    connectedNodes = new Set<string>();
    disconnectedNodes: {[cause: string] : Set<string>} = {};
    
    graph: Graph;
    managers = new Map<string, InteractiveManager>();
    disabledInteractives = new Map<string, Set<string>>();

    // ============================== CONSTRUCTOR ==============================

    constructor(graph: Graph, managers: InteractiveManager[]) {
        this.graph = graph;
        this.initializeManagers(managers);
        this.initializeDisconnectedNodes();
    }

    private initializeManagers(managers: InteractiveManager[]): void {
        for (const manager of managers) {
            if (manager.name === LINK_KEY) continue;
            this.managers.set(manager.name, manager);
            this.disabledInteractives.set(manager.name, new Set<string>());
        }
    }

    private initializeDisconnectedNodes(): void {
        for (const value of Object.values(DisconnectionCause)) {
            this.disconnectedNodes[value] = new Set<string>();
        }
    }

    // ================================ LOADING ================================

    load(): void {
        for (const key of this.managers.keys()) {
            this.addMissingInteractiveTypes(key);
        }
        const addedNodes = this.addMissingNodes();
        if (addedNodes.size > 0) this.loadAssets(addedNodes);
    }

    /**
     * Initializes the tag types for the nodes set.
     * @returns True if there are missing nodes in the graph, false otherwise.
     */
    private addMissingInteractiveTypes(key: string): boolean | undefined {
        if (!this.managers.has(key)) return;

        let missingTypes = new Set<string>();
        let isNodeMissing = false;
        for (const node of this.graph.renderer.nodes) {
            if (this.nodesMap.has(node.id)) continue;

            const file = getFile(this.graph.dispatcher.graphsManager.plugin.app, node.id);
            if (!file) continue;

            isNodeMissing = true;
            const interactives = getFileInteractives(key, this.graph.dispatcher.graphsManager.plugin.app, file);
            this.addInteractivesToSet(key, interactives, missingTypes);
        }

        this.managers.get(key)?.addTypes(missingTypes);
        return isNodeMissing;
    }

    private addInteractivesToSet(key: string, interactives: Set<string>, missingTypes: Set<string>): void {
        let hasType = false;
        for (const interactive of interactives) {
            if (!this.managers.get(key)?.interactives.has(interactive)) {
                if (this.isTypeValid(key, interactive)) {
                    missingTypes.add(interactive);
                    hasType = true;
                }
            }
            else {
                hasType = true;
            }
        }
        if (!hasType && !this.managers.get(key)?.interactives.has(this.graph.staticSettings.noneType[key])) {
            missingTypes.add(this.graph.staticSettings.noneType[key]);
        }
    }

    private isTypeValid(key: string, type: string): boolean {
        if (this.graph.staticSettings.unselectedInteractives[key].includes(type)) return false;
        if (INVALID_KEYS[key].includes(type)) return false;
        return true;
    }

    /**
     * Adds missing nodes to the nodes set.
     * @returns A set of node IDs that are missing from the nodes set.
     */
    private addMissingNodes(): Set<string> {
        let missingNodes = new Set<string>();
        for (const node of this.graph.renderer.nodes) {
            let nodeWrapper = this.nodesMap.get(node.id);
            if (nodeWrapper) {
                this.updateNodeWrapper(nodeWrapper, node);
            }
            else {
                missingNodes.add(node.id);
                this.createNodeWrapper(node);
            }
        }
        return missingNodes;
    }

    private updateNodeWrapper(nodeWrapper: NodeWrapper, node: ONode): void {
        if (node !== nodeWrapper.node) {
            nodeWrapper.disconnect();
            nodeWrapper.node = node;
            nodeWrapper.connect();
        }
    }

    private createNodeWrapper(node: ONode): void {
        const nodeWrapper = new NodeWrapper(
            node,
            this.graph.dispatcher.graphsManager.plugin.app,
            this.graph.staticSettings,
            [...this.managers.values()]
        );
        nodeWrapper.connect();
        this.nodesMap.set(nodeWrapper.node.id, nodeWrapper);
        this.connectedNodes.add(nodeWrapper.node.id);
    }
    
    private loadAssets(ids: Set<string>): void {
        const { imageURIs, emptyTextures } = this.getImageURIsAndEmptyTextures(ids);
        this.initNodesGraphics(imageURIs, emptyTextures);
    }

    private getImageURIsAndEmptyTextures(ids: Set<string>): { imageURIs: Map<string, string>, emptyTextures: string[] } {
        const imageURIs = new Map<string, string>();
        const emptyTextures: string[] = [];
        for (const id of ids) {
            const imageUri = getImageUri(this.graph.dispatcher.graphsManager.plugin.app, this.graph.staticSettings.imageProperty, id);
            if (imageUri && this.graph.staticSettings.enableImages) {
                imageURIs.set(id, imageUri);
            } else {
                emptyTextures.push(id);
            }
        }
        return { imageURIs, emptyTextures };
    }

    private initNodesGraphics(imageURIs: Map<string, string>, emptyTextures: string[]) {
        const backgroundColor = getBackgroundColor(this.graph.renderer);
        Assets.load([...imageURIs.values()]).then((textures: Record<string, Texture>) => {
            for (const [id, uri] of imageURIs) {
                this.initNodeGraphics(id, textures[uri], backgroundColor);
            }
        });
        for (const id of emptyTextures) {
            this.initNodeGraphics(id, undefined, backgroundColor);
        }
    }

    private initNodeGraphics(id: string, texture: Texture | undefined, backgroundColor: Uint8Array): void {
        const nodeWrapper = this.nodesMap.get(id);
        if (!nodeWrapper) return;
        nodeWrapper.initGraphics(texture);
        nodeWrapper.nodeImage.updateOpacityLayerColor(backgroundColor);
    }

    // =============================== UNLOADING ===============================

    /**
     * Unloads the nodes set, removing all nodes and clearing related data.
     */
    unload() {
        this.clearWrappers();
        this.clearMaps();
    }

    private clearWrappers() {
        this.nodesMap.forEach(wrapper => {
            wrapper.disconnect();
            wrapper.clearGraphics();
            wrapper.destroy();
        });
    }

    private clearMaps() {
        this.nodesMap.clear();
        this.connectedNodes.clear();
        for (const value of Object.values(DisconnectionCause)) {
            this.disconnectedNodes[value].clear();
        }
        this.managers.clear();
        this.disabledInteractives?.clear();
    }

    // ================================ GETTERS ================================
    
    /**
     * Gets the node wrapper corresponding to a file.
     * @param file - The file.
     * @returns The node wrapper corresponding to the file, or null if not found.
     */
    getNodeWrapperFromFile(file: TFile): NodeWrapper | null {
        return this.nodesMap.get(file.path) || null;
    }

    /**
     * Gets tag types for all nodes in the set, from the cache.
     * @param app - The application instance.
     * @returns A set of tag types, or null if tags are not enabled.
     */
    getAllInteractivesInGraph(key: string): Set<string> | null {
        if (!this.graph.staticSettings.enableTags) return null;

        const types = new Set<string>();

        this.nodesMap.forEach(wrapper => {
            const wrapperTypes = wrapper.arcsWrappers.get(key)?.types;
            if (wrapperTypes) {
                wrapperTypes.forEach(type => types.add(type));
            }
        });
        
        return new Set([...types].sort());
    }
    
    // ============================= INTERACTIVES ==============================

    /**
     * Disables a tag.
     * @param type - The type of the tag.
     * @returns An array of node IDs to be disabled.
     */
    disableInteractive(key: string, type: string): string[] {
        this.disabledInteractives.get(key)?.add(type);
        let nodesToDisable = this.toggleInteractive(key, type, false);
        return nodesToDisable;
    }

    /**
     * Enables a tag.
     * @param type - The type of the tag.
     * @returns An array of node IDs to be enabled.
     */
    enableInteractive(key: string, type: string): string[] {
        this.disabledInteractives.get(key)?.delete(type);
        let nodesToEnable = this.toggleInteractive(key, type, true);
        return nodesToEnable;
    }

    private toggleInteractive(key: string, type: string, enable: boolean): string[] {
        const nodesToUpdate: string[] = [];
        for (const [id, wrapper] of this.nodesMap) {
            // If the node does not have arcs for this interactive, and the type is NONE, toggle the node
            if (!wrapper.arcsWrappers.has(key) && type === this.graph.staticSettings.noneType[key]) {
                nodesToUpdate.push(id);
                continue;
            }
            // If the node does not have arcs for this interactive, or the type is not present, skip
            if (!wrapper.arcsWrappers.has(key) || !wrapper.arcsWrappers.get(key)?.hasType(type)) {
                continue;
            }
            
            const wasDisabled = !wrapper.isActive;
            wrapper.arcsWrappers.get(key)?.toggleType(type, enable);
            // If the node was disabled and is now enabled (or inverse), add it to the list of nodes to update
            if (wasDisabled !== wrapper.isAnyArcWrapperDisabled()) {
                wrapper.isActive = wasDisabled;
                nodesToUpdate.push(id);
            }
        }
        return nodesToUpdate;
    }
    
    /**
     * Reset arcs for each node
     */
    resetArcs(key: string): void {
        if (!this.graph.staticSettings.enableTags) return;
        for (const [id, wrapper] of this.nodesMap) {
            const file = getFile(wrapper.app, id);
            const arcWrapper = wrapper.arcsWrappers.get(key);
            if (!arcWrapper || !file) continue;

            arcWrapper.clearGraphics();
            arcWrapper.setTypes(getFileInteractives(key, wrapper.app, file));
            arcWrapper.initGraphics();
            arcWrapper.updateGraphics();
        }
    }

    // ============================= TOGGLE NODES ==============================

    /**
     * Disables nodes specified by their IDs.
     * @param ids - Array of node IDs to disable.
     * @param cause - The cause for the disconnection.
     */
    disableNodes(ids: string[], cause: string): Set<string> {
        return new Set(ids.filter(id => this.disableNode(id, cause)));
    }

    private disableNode(id: string, cause: string): boolean {
        const nodeWrapper = this.nodesMap.get(id);
        this.disconnectedNodes[cause].add(id);

        if (!this.connectedNodes.has(id) || !nodeWrapper) return false;
        
        this.connectedNodes.delete(id);
        nodeWrapper.fadeOut();
        nodeWrapper.updateNode();
        nodeWrapper.node.clearGraphics();
        this.graph.renderer.nodes.remove(nodeWrapper.node);
        return true;
    }

    /**
     * Enables nodes specified by their IDs.
     * @param ids - Array of node IDs to enable.
     * @param cause - The cause for the reconnection.
     */
    enableNodes(ids: string[], cause: string): Set<string> {
        return new Set(ids.filter(id => this.enableNode(id, cause)));
    }

    private enableNode(id: string, cause: string): boolean {
        const nodeWrapper = this.nodesMap.get(id);
        this.disconnectedNodes[cause].delete(id);
        if (this.isDisconnected(id) || !nodeWrapper) return false;
        
        this.connectedNodes.add(id);
        nodeWrapper.fadeIn();
        nodeWrapper.node.initGraphics();
        this.graph.renderer.nodes.push(nodeWrapper.node);
        nodeWrapper.updateNode();
        nodeWrapper.connect();
        return true;
    }

    /**
     * Connects all node wrappers in the set to their obsidian node.
     */
    connectNodes(): void {
        for (const [id, nodeWrapper] of this.nodesMap) {
            nodeWrapper.updateNode();
            nodeWrapper.connect();
        }
    }

    private isDisconnected(id: string): boolean {
        for (const cause of Object.values(DisconnectionCause)) {
            if (this.disconnectedNodes[cause].has(id)) return true;
        }
        return false;
    }

    // ================================ COLORS =================================
    
    /**
     * Update the background color. Called when the theme changes.
     */
    updateOpacityLayerColor(): void {
        const color = getBackgroundColor(this.graph.renderer);
        this.nodesMap.forEach(wrapper => {
            wrapper.nodeImage?.updateOpacityLayerColor(color);
        });
    }

    /**
     * Updates the color of arcs for a certain tag type.
     * @param type - The tag type.
     * @param color - The new color.
     */
    updateArcsColor(key: string, type: string, color: Uint8Array): void {
        if (!this.graph.staticSettings.enableTags) return;

        this.nodesMap.forEach(w => {
            w.arcsWrappers.get(key)?.redrawArc(type, color);
        });
    }

    // =============================== EMPHASIZE ===============================

    /**
     * Highlights or unhighlights a node based on the provided file.
     * @param file - The file corresponding to the node.
     * @param emphasize - Whether to highlight or unhighlight the node.
     */
    emphasizeNode(file: TFile, emphasize: boolean): void {
        if (!this.graph.staticSettings.enableFocusActiveNote) return;

        const nodeWrapper = this.nodesMap.get(file.path);
        if (!nodeWrapper) return;

        if (emphasize) {
            nodeWrapper.emphasize(this.graph.dynamicSettings.focusScaleFactor, this.graph.renderer.colors.fillFocused.rgb);
        } else {
            nodeWrapper.emphasize(1);
        }
    }
}