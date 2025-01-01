import { InteractiveManager } from "./interactiveManager";
import { getLinkID, LineLinkWrapper, Link, LinkWrapper } from "./elements/link";
import { Graph } from "./graph";
import { DisconnectionCause, INVALID_KEYS, LINK_KEY } from "src/globalVariables";
import { DataviewApi, getAPI as getDataviewAPI } from "obsidian-dataview";
import { getFile } from "src/helperFunctions";
import { TFile } from "obsidian";

export class LinksSet {
    linksMap = new Map<string, {wrapper: LinkWrapper | null, link: Link}>();
    connectedLinks = new Set<string>();
    disconnectedLinks: {[cause: string] : Set<string>} = {};
    linkTypesMap: Map<string, Set<string>> | null = null; // key: type / value: link ids

    graph: Graph;
    linksManager: InteractiveManager | null;

    // ============================== CONSTRUCTOR ==============================

    /**
     * Constructor for LinksSet.
     * @param graph - The graph instance.
     * @param manager - The links manager.
     */
    constructor(graph: Graph, manager: InteractiveManager | undefined) {
        this.graph = graph;
        this.initializeManager(manager);
        this.initializeLinkTypesMap();
        this.initializeDisconnectedLinks();
    }

    private initializeManager(manager?: InteractiveManager) {
        this.linksManager = manager ? manager : null;
    }

    private initializeLinkTypesMap() {
        if (this.linksManager) {
            this.linkTypesMap = new Map<string, Set<string>>();
        }
    }

    private initializeDisconnectedLinks(): void {
        for (const value of Object.values(DisconnectionCause)) {
            this.disconnectedLinks[value] = new Set<string>();
        }
    }

    // ================================ LOADING ================================

    /**
     * Loads the links set, initializing link types and connecting links.
     */
    load() {
        this.addMissingInteractiveTypes();
        this.addMissingLinks();
    }

    /**
     * Initializes the link types for the links set.
     */
    private addMissingInteractiveTypes(): void {
        if (!this.linksManager || !this.linkTypesMap) return;

        let missingTypes = new Set<string>();

        // Create link types
        const dv = getDataviewAPI(this.graph.dispatcher.graphsManager.plugin.app);
        for (const link of this.graph.renderer.links) {
            const sourceFile = getFile(this.graph.dispatcher.graphsManager.plugin.app, link.source.id);
            if (!sourceFile) continue;

            const linkTypes = dv ? this.getLinkTypesWithDataview(dv, link): this.getLinkTypesWithFrontmatter(link, sourceFile);

            if (linkTypes.size === 0) {
                this.addTypeToMap(this.graph.staticSettings.noneType[LINK_KEY], getLinkID(link), missingTypes);
            }

            missingTypes = new Set([...missingTypes, ...linkTypes]);
        }

        this.linksManager.addTypes(missingTypes);
    }

    private getLinkTypesWithDataview(dv: DataviewApi, link: Link): Set<string> {
        const linkTypes = new Set<string>();
        const linkID = getLinkID(link);
        const sourcePage = dv.page(link.source.id);
        for (const [key, value] of Object.entries(sourcePage)) {
            if (key === "file" || key === this.graph.staticSettings.imageProperty) continue;
            if (value === null || value === undefined || value === '') continue;

            if ((typeof value === "object") && ("path" in value) && ((value as any).path === link.target.id)) {
                this.addTypeToMap(key, linkID, linkTypes);
            }
            else if (Array.isArray(value)) {
                for (const l of value) {
                    if ((typeof l === "object") && ("path" in l) && ((l as any).path === link.target.id)) {
                        this.addTypeToMap(key, linkID, linkTypes);
                    }
                }
            }
        }
        return linkTypes;
    }

    private getLinkTypesWithFrontmatter(link: Link, file: TFile): Set<string> {
        const linkTypes = new Set<string>();
        const linkID = getLinkID(link);
        const frontmatterLinks = this.graph.dispatcher.graphsManager.plugin.app.metadataCache.getFileCache(file)?.frontmatterLinks;
        if (frontmatterLinks) {
            // For each link in the frontmatters, check if target matches
            for (const linkCache of frontmatterLinks) {
                const linkType = linkCache.key.split('.')[0];
                const targetID = this.graph.dispatcher.graphsManager.plugin.app.metadataCache.getFirstLinkpathDest(linkCache.link, ".")?.path;
                if (targetID === link.target.id) {
                    this.addTypeToMap(linkType, linkID, linkTypes);
                }
            }
        }
        return linkTypes;
    }

    private addTypeToMap(type: string, linkID: string, types: Set<string>) {
        if (!this.isTypeValid(type) || !this.linkTypesMap) return;
        if (!this.linkTypesMap.has(type)) {
            this.linkTypesMap.set(type, new Set<string>());
        }
        this.linkTypesMap.get(type)?.add(linkID);
        types.add(type);
    }

    private isTypeValid(type: string): boolean {
        if (this.graph.staticSettings.unselectedInteractives[LINK_KEY].includes(type)) return false;
        if (INVALID_KEYS[LINK_KEY].includes(type)) return false;
        return true;
    }

    private addMissingLinks(): Set<string> {
        const missingLinks = new Set<string>();
        for (const link of this.graph.renderer.links) {
            const linkID = getLinkID(link);
            
            const L = this.linksMap.get(linkID);
            if (L) {
                this.updateLinkWrapper(L, link);
            }
            else {
                missingLinks.add(linkID);
                this.createLinkWrapper(link);
            }
        }
        return missingLinks;
    }

    private updateLinkWrapper(L: {wrapper: LinkWrapper | null; link: Link;}, link: Link) {
        if (L.wrapper && L.wrapper.link !== link) {
            L.wrapper.disconnect();
            L.wrapper.link = link;
            L.wrapper.connect();
        }
        L.link = link;
    }

    private createLinkWrapper(link: Link) {
        let linkWrapper = null;
        const linkID = getLinkID(link);

        if (this.linkTypesMap && this.linksManager) {
            // Get the types of the link
            const types = [...this.linkTypesMap.keys()].filter(type => this.linkTypesMap?.get(type)?.has(linkID));

            // If the link has a type
            if (!this.linkTypesMap.get(this.graph.staticSettings.noneType[LINK_KEY])?.has(linkID)) {
                linkWrapper = new LineLinkWrapper(
                    link,
                    new Set<string>(types),
                    this.linksManager
                );
                linkWrapper.connect();
            }
        }
        this.linksMap.set(linkID, {wrapper: linkWrapper, link: link});
        this.connectedLinks.add(linkID);
    }

    // =============================== UNLOADING ===============================

    /**
     * Unloads the links set, disconnecting and destroying all links.
     */
    unload() {
        this.clearWrappers();
        this.clearMaps();
    }

    private clearWrappers() {
        this.linksMap.forEach(l => {
            l.wrapper?.disconnect();
            l.wrapper?.destroy({children:true});
        });
    }

    private clearMaps() {
        this.linksMap.clear();
        this.connectedLinks.clear();
        for (const value of Object.values(DisconnectionCause)) {
            this.disconnectedLinks[value].clear();
        }
        this.linkTypesMap?.clear();
    }

    // ================================ GETTERS ================================

    /**
     * Gets the currently active type of the link.
     * @param id - The ID of the link.
     * @returns The active type.
     */
    getActiveType(id: string): string {
        if (!this.linkTypesMap) return "";
        const firstActiveType = [...this.linkTypesMap.keys()].find(type => this.linksManager?.isActive(type) && this.linkTypesMap?.get(type)?.has(id));
        return firstActiveType ? firstActiveType : this.graph.staticSettings.noneType[LINK_KEY];
    }

    /**
     * Gets all link types.
     * @returns A set of all link types, or null if not available.
     */
    getAllLinkTypes(): Set<string> | null {
        return new Set<string>(this.linkTypesMap?.keys());
    }

    /**
     * Gets links of specified types.
     * @param types - An array of link types.
     * @returns A set of link IDs.
     */
    getLinks(types: string[]): Set<string> | null {
        const links = new Set<string>();
        for (const type of types) {
            this.linkTypesMap?.get(type)?.forEach(linkID => {
                links.add(linkID);
            })
        }
        return links;
    }

    // ============================= TOGGLE LINKS ==============================

    /**
     * Disables links specified by their IDs.
     * @param ids - A set of link IDs to disable.
     * @param cause - The cause for the disconnection.
     */
    disableLinks(ids: Set<string>, cause: string): Set<string> {
        return new Set<string>([...ids].filter(id => this.disableLink(id, cause)));
    }

    private disableLink(id: string, cause: string): boolean {
        const L = this.linksMap.get(id);
        this.disconnectedLinks[cause].add(id);
        if (!this.connectedLinks.has(id) || !L) return false;

        this.connectedLinks.delete(id);
        if (!this.graph.renderer.links.includes(L.link)) {
            if (L.wrapper) {
                L.wrapper.updateLink();
                L.link = L.wrapper.link;
            }
            else {
                const newLink = this.findNewLink(L.link);
                if (newLink) L.link = newLink;
            }
        }
        L.link.clearGraphics();
        this.graph.renderer.links.remove(L.link);
        return true;
    }

    /**
     * Enables links specified by their IDs.
     * @param ids - A set of link IDs to enable.
     * @param cause - The cause for the reconnection.
     */
    enableLinks(ids: Set<string>, cause: string): Set<string> {
        return new Set<string>([...ids].filter(id => this.enableLink(id, cause)));
    }

    private enableLink(id: string, cause: string): boolean {
        const L = this.linksMap.get(id);
        this.disconnectedLinks[cause].delete(id);
        if (this.isDisconnected(id) || !L) return false;

        this.connectedLinks.add(id);
        if (!this.graph.renderer.links.includes(L.link)) {
            L.link.initGraphics();
            this.graph.renderer.links.push(L.link);
        }
        if (L.wrapper) {
            L.wrapper.updateLink();
            L.wrapper.connect();
            L.wrapper.updateGraphics();
        }
        return true;
    }

    private isDisconnected(id: string): boolean {
        for (const cause of Object.values(DisconnectionCause)) {
            if (this.disconnectedLinks[cause].has(id)) return true;
        }
        return false;
    }

    /**
     * Connects all link wrappers in the set to their Obsidian link
     */
    connectLinks(): void {
        for (const [id, L] of this.linksMap) {
            if (L.wrapper) {
                L.wrapper.updateLink();
                L.link = L.wrapper.link;
                L.wrapper.connect();
            }
            else {
                const newLink = this.findNewLink(L.link);
                if (newLink) L.link = newLink;
            }
        }
    }

    private findNewLink(link: Link) {
        return this.graph.renderer.links.find(l2 => l2.source.id === link.source.id && l2.target.id === link.target.id);
    }

    // ================================ COLORS =================================

    /**
     * Updates the color of a link type.
     * @param type - The link type.
     * @param color - The new color.
     */
    updateLinksColor(type: string, color: Uint8Array): void {
        for (const [id, l] of this.linksMap) {
            if (l.wrapper?.types.has(type)) {
                l.wrapper.updateGraphics();
            }
        }
    }
}