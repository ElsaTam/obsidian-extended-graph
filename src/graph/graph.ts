
import { Component } from 'obsidian';
import { DisconnectionCause, FamilyTree, FOLDER_KEY, FoldersSet, getLinkID, GraphInstances, InteractiveManager, LINK_KEY, LinksSet, NodesSet, TAG_KEY } from 'src/internal';


export class Graph extends Component {
    instances: GraphInstances;

    // Elements

    // Disconnection chains
    nodesDisconnectionCascade = new Map<string, {isDiconnected: boolean, links: Set<string>, nodes: Set<string>}>();
    linksDisconnectionCascade = new Map<string, {isDiconnected: boolean, links: Set<string>, nodes: Set<string>}>();
    
    // Functions to override
    onOptionsChangeOriginal: () => void;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances) {
        super();

        this.instances = instances;
        this.instances.graph = this;

        // Interactive managers
        this.initializeInteractiveManagers();

        // Sets
        this.instances.nodesSet  = new NodesSet(this.instances, this.getNodeManagers());
        this.instances.linksSet  = new LinksSet(this.instances, this.getLinkManagers());
        if (instances.settings.enableFeatures[instances.type]['folders']) {
            this.instances.foldersSet = new FoldersSet(this.instances, this.getFolderManagers());
        }

        // Functions to override
        this.overrideOnOptionsChange();
    }

    private initializeInteractiveManagers(): void {
        const keys = this.getInteractiveManagerKeys();
        for (const key of keys) {
            const manager = new InteractiveManager(this.instances, key);
            this.instances.interactiveManagers.set(key, manager);
            this.addChild(manager);
        }
    }

    private getInteractiveManagerKeys(): string[] {
        const keys: string[] = [];
        if (this.instances.settings.enableFeatures[this.instances.type]['properties']) {
            for (const property in this.instances.settings.additionalProperties) {
                if (this.instances.settings.additionalProperties[property]) keys.push(property);
            }
        }
        if (this.instances.settings.enableFeatures[this.instances.type]['tags'])    keys.push(TAG_KEY);
        if (this.instances.settings.enableFeatures[this.instances.type]['links'])   keys.push(LINK_KEY);
        if (this.instances.settings.enableFeatures[this.instances.type]['folders']) keys.push(FOLDER_KEY);
        return keys;
    }

    private getNodeManagers(): InteractiveManager[] {
        return Array.from(this.instances.interactiveManagers.values()).filter(m => m.name !== LINK_KEY && m.name !== FOLDER_KEY);
    }

    private getLinkManagers(): InteractiveManager[] {
        const manager = this.instances.interactiveManagers.get(LINK_KEY);
        return manager ? [manager] : [];
    }

    private getFolderManagers(): InteractiveManager[] {
        const manager = this.instances.interactiveManagers.get(FOLDER_KEY);
        return manager ? [manager] : [];
    }

    private overrideOnOptionsChange(): void {
        this.onOptionsChangeOriginal = this.instances.view.onOptionsChange;
        this.instances.view.onOptionsChange = () => {};
    }

    // ================================ LOADING ================================

    onload(): void {
        this.initSets().then(() => {
            this.instances.dispatcher.onGraphReady();
        }).catch(e => {
            console.error(e);
        });
    }

    private async initSets(): Promise<void> {
        // Let time to the engine to apply user filters
        await this.delay(this.instances.settings.delay);

        this.instances.nodesSet.load();
        this.instances.linksSet.load();
        this.instances.foldersSet?.load();
        this.buildFamilyTree();
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =============================== UNLOADING ===============================

    onunload(): void {
        this.restoreOriginalFunctions();
        this.enableDisconnectedNodes();
        this.enableDisconnectedLinks();
        this.updateWorker();
        this.instances.nodesSet.unload();
        this.instances.linksSet.unload();
        this.instances.foldersSet?.unload();
    }

    private restoreOriginalFunctions(): void {
        this.instances.view.onOptionsChange = this.onOptionsChangeOriginal;
    }

    private enableDisconnectedNodes(): void {
        for (const cause of Object.values(DisconnectionCause)) {
            this.instances.nodesSet.enableElements([...this.instances.nodesSet.disconnectedIDs[cause]], cause);
        }
    }

    private enableDisconnectedLinks(): void {
        for (const cause of Object.values(DisconnectionCause)) {
            this.instances.linksSet.enableElements([...this.instances.linksSet.disconnectedIDs[cause]], cause);
        }
    }

    // ============================= UPDATING LINKS ============================

    /**
     * Disables link types specified in the types array.
     * @param types - Array of link types to disable.
     * @returns boolean - True if links were found and disabled, otherwise false.
     */
    disableLinkTypes(types: string[]): boolean {
        //const links = this.instances.linksSet.getElementsByTypes(LINK_KEY, types);
        let linksToDisable: string[] = [];
        for (const type of types) {
            linksToDisable = linksToDisable.concat(this.instances.linksSet.disableType(LINK_KEY, type));
        }
        if (linksToDisable) {
            this.disableLinks(new Set<string>(linksToDisable));
            return true;
        }
        return false;
    }

    /**
     * Enables link types specified in the types array.
     * @param types - Array of link types to enable.
     * @returns boolean - True if links were found and enabled, otherwise false.
    */
    enableLinkTypes(types: string[]): boolean {
        //const links = this.instances.linksSet.getElementsByTypes(LINK_KEY, types);
        let linksToEnable: string[] = [];
        for (const type of types) {
            linksToEnable = linksToEnable.concat(this.instances.linksSet.enableType(LINK_KEY, type));
        }
        if (linksToEnable) {
            this.enableLinks(new Set<string>(linksToEnable));
            return true;
        }
        return false;
    }

    /**
     * Disables links specified by their IDs.
     * @param ids - Set of link IDs to disable.
     */
    disableLinks(ids: Set<string>): boolean {
        const disabledLinks = this.instances.linksSet.disableElements([...ids], DisconnectionCause.USER);

        if (this.instances.settings.enableFeatures[this.instances.type]['source'] || this.instances.settings.enableFeatures[this.instances.type]['target']) {
            for (const linkID of ids) {
                const cascade = this.linksDisconnectionCascade.get(linkID) || {isDiconnected: true, links: new Set<string>(), nodes: new Set<string>()};

                // Disable nodes by cascading
                const cascadeDisabledNodes = this.getNodesByCascadingLink(linkID);
                cascade.nodes = new Set([...cascade.nodes, ...cascadeDisabledNodes]);
                if (disabledLinks.has(linkID)) this.instances.nodesSet.disableElements([...cascadeDisabledNodes], DisconnectionCause.USER);
                
                // Disable links by cascading
                for (const nodeID of cascadeDisabledNodes) {
                    const cascadeDisabledLinks = this.getLinksByCascadingNode(nodeID, [...ids]);
                    cascade.links = new Set([...cascade.links, ...cascadeDisabledLinks]);
                    if (disabledLinks.has(linkID)) this.instances.linksSet.disableElements([...cascadeDisabledLinks], DisconnectionCause.USER);
                }

                if (!this.linksDisconnectionCascade.has(linkID)) this.linksDisconnectionCascade.set(linkID, cascade);
            }
        }

        if (disabledLinks.size > 0) this.disableOrphans();

        return disabledLinks.size > 0;
    }

    private getNodesByCascadingLink(linkID: string, invalidNodeIDs: readonly string[] = []) : Set<string> {
        const nodesToDisable = new Set<string>();
        const link = this.instances.linksSet.extendedElementsMap.get(linkID)?.coreElement;
        if (!link) return nodesToDisable;

        if (this.instances.settings.enableFeatures[this.instances.type]['source'] && !invalidNodeIDs.includes(link.source.id)) {
            nodesToDisable.add(link.source.id);
        }
        if (this.instances.settings.enableFeatures[this.instances.type]['target'] && !invalidNodeIDs.includes(link.target.id)) {
            nodesToDisable.add(link.target.id);
        }
        return nodesToDisable;
    }

    private getLinksByCascadingNode(nodeID: string, invalidLinkIDs: readonly string[] = []) : Set<string> {
        const linksToDisable = new Set<string>();
        const node = this.instances.nodesSet.extendedElementsMap.get(nodeID)?.coreElement;
        if (!node) return new Set<string>();

        for (const forward in node.forward) {
            const linkID = getLinkID({source: {id: nodeID}, target: {id: forward}});
            if (!invalidLinkIDs.includes(linkID)) linksToDisable.add(linkID);
        }
        for (const reverse in node.reverse) {
            const linkID = getLinkID({source: {id: reverse}, target: {id: nodeID}});
            if (!invalidLinkIDs.includes(linkID)) linksToDisable.add(linkID);
        }
        return linksToDisable;
    }

    /**
     * Enables links specified by their IDs.
     * @param ids - Set of link IDs to enable.
     */
    private enableLinks(ids: Set<string>): boolean {
        const cascades = this.getAndCleanCascadeLinks(ids);

        // Get remaining disabled nodes and links from other active cascades
        let nodesToKeepDisabled: string[] = [];
        for (const [id, cascade] of this.nodesDisconnectionCascade) {
            if (cascade.isDiconnected) nodesToKeepDisabled.push(id);
            nodesToKeepDisabled = nodesToKeepDisabled.concat([...cascade.nodes]);
        }
        for (const [id, cascade] of this.linksDisconnectionCascade) {
            nodesToKeepDisabled = nodesToKeepDisabled.concat([...cascade.nodes]);
        }
        let linksToKeepDisabled: string[] = [];
        for (const [id, cascade] of this.linksDisconnectionCascade) {
            if (cascade.isDiconnected) linksToKeepDisabled.push(id);
            linksToKeepDisabled = linksToKeepDisabled.concat([...cascade.links]);
        }
        for (const [id, cascade] of this.nodesDisconnectionCascade) {
            linksToKeepDisabled = linksToKeepDisabled.concat([...cascade.links]);
        }

        // Get the links to enable directly from the user input
        const linksToEnable = [...ids.values()].filter(id => !linksToKeepDisabled.includes(id));

        for (const linkID of linksToEnable) {
            // Cascade first, in order to enable the nodes
            this.enableCascadeChainFromLink(linkID, cascades, nodesToKeepDisabled, linksToKeepDisabled);
        }
        
        // Enable links directly
        this.instances.linksSet.enableElements(linksToEnable, DisconnectionCause.USER);

        if (linksToEnable.length > 0) this.enableOrphans();

        return linksToEnable.length > 0;
    }

    private getAndCleanCascadeLinks(linkIDs: Set<string>): Map<string, {links: Set<string>, nodes: Set<string>}> {
        const cascades = new Map<string, {links: Set<string>, nodes: Set<string>}>();
        for (const linkID of linkIDs) {
            const cascade = structuredClone(this.linksDisconnectionCascade.get(linkID)) || {links: new Set<string>(), nodes: new Set<string>()};
            this.linksDisconnectionCascade.set(linkID, {isDiconnected: false, links: new Set<string>(), nodes: new Set<string>()});
            cascades.set(linkID, cascade);
        }
        return cascades;
    }

    private enableCascadeChainFromLink(linkID: string, cascades: Map<string, {links: Set<string>, nodes: Set<string>}>, nodesToKeepDisabled: string[] = [], linksToKeepDisabled: string[] = []) : void {
        const cascade = cascades.get(linkID);
        if (!cascade) return;

        // Enable nodes by cascading
        const nodesToEnable = [...cascade.nodes].filter(id => !nodesToKeepDisabled.includes(id));
        this.instances.nodesSet.enableElements(nodesToEnable, DisconnectionCause.USER);

        // Enable links by cascading
        const linksToEnable = [...cascade.links].filter(id => !linksToKeepDisabled.includes(id));
        this.instances.linksSet.enableElements(linksToEnable, DisconnectionCause.USER);
    }

    addLinkInCascadesAfterCreation(linkID: string): boolean {
        const extendedLink = this.instances.linksSet.extendedElementsMap.get(linkID);
        if (extendedLink) return false;

        let shouldBeDisabled = false;

        // Add in nodes cascading
        for (const [disabledNodeID, cascade] of this.nodesDisconnectionCascade) {
            const cascadeDisabledLinks = this.getLinksByCascadingNode(disabledNodeID, [linkID]);
            if (cascadeDisabledLinks.has(linkID)) {
                cascade.links.add(linkID);
                shouldBeDisabled = true;
            }
        }

        // Add in links cascading
        for (const [disabledLinkID, cascade] of this.linksDisconnectionCascade) {
            const cascadeDisabledNodes = this.getNodesByCascadingLink(linkID);
            for (const disabledNodeID of cascadeDisabledNodes) {
                const cascadeDisabledLinks = this.getLinksByCascadingNode(disabledNodeID, [linkID]);
                if (cascadeDisabledLinks.has(linkID)) {
                    cascade.links.add(linkID);
                    shouldBeDisabled = true;
                }
            }
        }
        return shouldBeDisabled;
    }

    // ============================ UPDATING NODES =============================

    disableNodeInteractiveTypes(key: string, types: string[]): boolean {
        let nodesToDisable: string[] = [];
        for (const type of types) {
            nodesToDisable = nodesToDisable.concat(this.instances.nodesSet.disableType(key, type));
        }
        if (!this.instances.settings.fadeOnDisable && nodesToDisable.length > 0) {
            return this.disableNodes(nodesToDisable);
        }
        else if (this.instances.settings.fadeOnDisable && nodesToDisable.length > 0) {
            return this.fadeOutNodes(nodesToDisable);
        }
        return false;
    }

    enableNodeInteractiveTypes(key: string, types: string[]): boolean {
        let nodesToEnable: string[] = [];
        for (const type of types) {
            nodesToEnable = nodesToEnable.concat(this.instances.nodesSet.enableType(key, type));
        }
        if (!this.instances.settings.fadeOnDisable && nodesToEnable.length > 0) {
            return this.enableNodes(nodesToEnable);
        }
        else if (this.instances.settings.fadeOnDisable && nodesToEnable.length > 0) {
            return this.fadeInNodes(nodesToEnable);
        }
        return false;
    }

    /**
     * Disables nodes specified by their IDs and cascades the disconnection to related links.
     * @param ids - Array of node IDs to disable.
     */
    disableNodes(ids: string[]): boolean {
        // Disable nodes directly
        const disabledNodes = this.instances.nodesSet.disableElements(ids, DisconnectionCause.USER);

        for (const nodeID of ids) {
            const cascade = this.nodesDisconnectionCascade.get(nodeID) || {isDiconnected: true, links: new Set<string>(), nodes: new Set<string>()};

            // Disable links by cascading
            const cascadeDisabledLinks = this.getLinksByCascadingNode(nodeID);
            cascade.links = new Set([...cascade.links, ...cascadeDisabledLinks]);
            if (disabledNodes.has(nodeID)) this.instances.linksSet.disableElements([...cascadeDisabledLinks], DisconnectionCause.USER);

            /*// Disable nodes by cascading
            for (const linkID of cascadeDisabledLinks) {
                const cascadeDisabledNodes = this.getNodesByCascadingLink(linkID, [...ids]);
                cascade.nodes = new Set([...cascade.nodes, ...cascadeDisabledNodes]);
                if (disabledNodes.has(nodeID)) this.instances.nodesSet.disableNodes([...cascadeDisabledNodes], DisconnectionCause.NODE_CASCADE);
            }*/

            if (!this.nodesDisconnectionCascade.has(nodeID)) this.nodesDisconnectionCascade.set(nodeID, cascade);
        }

        if (disabledNodes.size > 0) this.disableOrphans();

        return disabledNodes.size > 0;
    }

    /**
     * Enables nodes specified by their IDs and cascades the reconnection to related links.
     * @param ids - Array of node IDs to enable.
     */
    private enableNodes(ids: string[]): boolean {
        // Get all the cascade chains and clean them in the map structure
        const cascades = this.getAndCleanCascadeNodes(new Set<string>(ids));

        // Get remaining disabled nodes and links from other active cascades
        let nodesToKeepDisabled: string[] = [];
        for (const [id, cascade] of this.nodesDisconnectionCascade) {
            if (cascade.isDiconnected) nodesToKeepDisabled.push(id);
            nodesToKeepDisabled = nodesToKeepDisabled.concat([...cascade.nodes]);
        }
        for (const [id, cascade] of this.linksDisconnectionCascade) {
            nodesToKeepDisabled = nodesToKeepDisabled.concat([...cascade.nodes]);
        }
        let nodesToEnable = new Set<string>([...ids.values()].filter(id =>
            !nodesToKeepDisabled.includes(id)
        ));

        // Enable nodes directly
        this.instances.nodesSet.enableElements([...nodesToEnable], DisconnectionCause.USER);

        let linksToKeepDisabled: string[] = [];
        for (const [id, cascade] of this.linksDisconnectionCascade) {
            if (cascade.isDiconnected) linksToKeepDisabled.push(id);
            linksToKeepDisabled = linksToKeepDisabled.concat([...cascade.links]);
        }
        for (const [id, cascade] of this.nodesDisconnectionCascade) {
            linksToKeepDisabled = linksToKeepDisabled.concat([...cascade.links]);
        }
        for (const nodeID of nodesToEnable) {
            this.enableCascadeChainFromNode(nodeID, cascades, nodesToKeepDisabled, linksToKeepDisabled);
        }

        if (nodesToEnable.size > 0) {
            this.disableOrphans();
            this.enableOrphans();
        }

        return nodesToEnable.size > 0;
    }

    private getAndCleanCascadeNodes(nodeIDs: Set<string>): Map<string, {links: Set<string>, nodes: Set<string>}> {
        const cascades = new Map<string, {links: Set<string>, nodes: Set<string>}>();
        for (const nodeID of nodeIDs) {
            const cascade = structuredClone(this.nodesDisconnectionCascade.get(nodeID)) || {links: new Set<string>(), nodes: new Set<string>()};
            this.nodesDisconnectionCascade.set(nodeID, {isDiconnected: false, links: new Set<string>(), nodes: new Set<string>()});
            cascades.set(nodeID, cascade);
        }
        return cascades;
    }

    private enableCascadeChainFromNode(nodeID: string, cascades: Map<string, {links: Set<string>, nodes: Set<string>}>, nodesToKeepDisabled: string[] = [], linksToKeepDisabled: string[] = []) : void {
        const cascade = cascades.get(nodeID);
        if (!cascade) return;

        // Enable nodes by cascading
        const nodesToEnable = [...cascade.nodes].filter(id => !nodesToKeepDisabled.includes(id));
        this.instances.nodesSet.enableElements(nodesToEnable, DisconnectionCause.USER);

        // Enable links by cascading
        const linksToEnable = [...cascade.links].filter(id => !linksToKeepDisabled.includes(id));
        this.instances.linksSet.enableElements(linksToEnable, DisconnectionCause.USER);
    }

    addNodeInCascadesAfterCreation(nodeID: string): boolean {
        const extendedNode = this.instances.nodesSet.extendedElementsMap.get(nodeID);
        if (extendedNode) return false;

        let shouldBeDisabled = false;

        // Add in links cascading
        for (const [disabledLinkID, cascade] of this.linksDisconnectionCascade) {
            const cascadeDisabledNodes = this.getNodesByCascadingLink(nodeID);
            if (cascadeDisabledNodes.has(nodeID)) {
                cascade.nodes.add(nodeID);
                shouldBeDisabled = true;
            }
        }
        return shouldBeDisabled;
    }

    disableOrphans() : boolean {
        if (this.instances.engine.options.showOrphans) return false;
        const newOrphans = [...this.instances.nodesSet.connectedIDs].filter(id =>
            this.instances.nodesSet.extendedElementsMap.get(id)?.coreElement.renderer && this.nodeIsOrphan(id)
        );
        if (newOrphans.length === 0) return false;
        const nodesDisabled = this.instances.nodesSet.disableElements(newOrphans, DisconnectionCause.ORPHAN);
        return nodesDisabled.size > 0;
    }

    enableOrphans() : boolean {
        const oldOrphans = this.instances.nodesSet.disconnectedIDs[DisconnectionCause.ORPHAN];
        if (oldOrphans.size === 0) return false;

        // Show all orphans
        if (this.instances.engine.options.showOrphans) {
            this.instances.nodesSet.enableElements([...oldOrphans], DisconnectionCause.ORPHAN);
        }
        // Show nodes that are not orphans anymore
        else {
            const nonOrphans = [...oldOrphans].filter(id => !this.nodeIsOrphan(id));
            if (nonOrphans.length === 0) return false;
            
            this.instances.nodesSet.enableElements(nonOrphans, DisconnectionCause.ORPHAN);
        }
        return true;
    }
    
    private nodeIsOrphan(id: string) : boolean {
        for (const linkID of this.instances.linksSet.connectedIDs) {
            const link = this.instances.linksSet.extendedElementsMap.get(linkID)?.coreElement;
            if (!link) continue;
            if (link.source.id === id || link.target.id === id) return false;
        }
        return true;
    }

    
    private fadeOutNodes(ids: string[]): boolean {
        for (const id of ids) {
            const extendedElement = this.instances.nodesSet.extendedElementsMap.get(id);
            if (!extendedElement) continue;
            extendedElement.graphicsWrapper?.fadeOut();
        }
        return false;
    }

    private fadeInNodes(ids: string[]): boolean {
        for (const id of ids) {
            const extendedElement = this.instances.nodesSet.extendedElementsMap.get(id);
            if (!extendedElement) continue;
            extendedElement.graphicsWrapper?.fadeIn();
        }
        return false;
    }
    
    // ============================ UPDATING WORKER ============================

    /**
     * Updates the worker with the current state of nodes and links.
     */
    updateWorker(): void {
        const nodes = this.getNodesForWorker();
        const links = this.getLinksForWorker();

        this.instances.renderer.worker.postMessage({
            nodes: nodes,
            links: links,
            alpha: 0.3,
            run: true
        });
    }

    private getNodesForWorker(): { [node: string]: number[] } {
        const nodes: { [node: string]: number[] } = {};
        // Add connected nodes
        for (const id of this.instances.nodesSet.connectedIDs) {
            const extendedNode = this.instances.nodesSet.extendedElementsMap.get(id);
            if (extendedNode) nodes[id] = [extendedNode.coreElement.x, extendedNode.coreElement.y];
        }
        // Add tags
        for (const node of this.instances.renderer.nodes.filter(n => n.type === "tag")) {
            nodes[node.id] = [node.x, node.y];
        }
        return nodes;
    }

    private getLinksForWorker(): string[][] {
        const links: string[][] = [];
        // Add connected links
        for (const id of this.instances.linksSet.connectedIDs) {
            const extendedLink = this.instances.linksSet.extendedElementsMap.get(id);
            if (extendedLink) links.push([extendedLink.coreElement.source.id, extendedLink.coreElement.target.id]);
        }
        // Add links to tags
        for (const link of this.instances.renderer.links.filter(l => l.target.type === "tag")) {
            links.push([link.source.id, link.target.id]);
        }
        return links;
    }

    // ============================ UPDATING WORKER ============================

    private async buildFamilyTree() {
        const familyTree = new FamilyTree(this.instances);
        familyTree.create();
    }
}
