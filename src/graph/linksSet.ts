import { InteractiveManager } from "./interactiveManager";
import { getLinkID, LineLinkWrapper, Link, LinkWrapper } from "./elements/link";
import { Graph } from "./graph";
import { DisconnectionCause, INVALID_KEYS } from "src/globalVariables";
import { getAPI as getDataviewAPI } from "obsidian-dataview";
import { getFile } from "src/helperFunctions";

export class LinksSet {
    linksMap = new Map<string, {wrapper: LinkWrapper | null, link: Link}>();
    connectedLinks = new Set<string>();
    disconnectedLinks: {[cause: string] : Set<string>} = {};
    linkTypesMap: Map<string, Set<string>> | null = null; // key: type / value: link ids

    graph: Graph;
    linksManager: InteractiveManager | null;

    /**
     * Constructor for LinksSet.
     * @param graph - The graph instance.
     * @param linksManager - The links manager.
     */
    constructor(graph: Graph, linksManager: InteractiveManager | null) {
        this.graph = graph;
        this.linksManager = linksManager;

        if (this.linksManager) {
            this.linkTypesMap = new Map<string, Set<string>>();
        }
        for (const value of Object.values(DisconnectionCause)) {
            this.disconnectedLinks[value] = new Set<string>();
        }
    }

    /**
     * Loads the links set, initializing link types and connecting links.
     */
    load() {
        let areLinksMissing = this.addMissingTypes();
        let addedLinks = this.addMissingLinks();
    }

    /**
     * Unloads the links set, disconnecting and destroying all links.
     */
    unload() {
        this.linksMap.forEach(l => {
            l.wrapper?.disconnect();
            l.wrapper?.destroy({children:true});
        });
        this.linksMap.clear();
        this.connectedLinks.clear();
        for (const value of Object.values(DisconnectionCause)) {
            this.disconnectedLinks[value].clear();
        }
        this.linkTypesMap?.clear();
    }

    /**
     * Initializes the link types for the links set.
     * @returns True if there are missing links in the graph, false otherwise.
     */
    private addMissingTypes() : boolean | undefined {
        if (!this.linksManager || !this.linkTypesMap) return;

        const setType = (function(type: string, id: string, types: Set<string>) {
            if (this.graph.settings.unselectedInteractives["link"].includes(type) || INVALID_KEYS["link"].includes(type)) return;
            
            if (!this.linkTypesMap.has(type)) {
                this.linkTypesMap.set(type, new Set<string>());
            }
            this.linkTypesMap.get(type)?.add(id);
            types.add(type);
        }).bind(this);

        let missingTypes = new Set<string>();
        let isLinkMissing = false;

        // Create link types
        const dv = getDataviewAPI();
        for (const link of this.graph.renderer.links) {
            const linkID = getLinkID(link);
            const sourceFile = getFile(this.graph.dispatcher.graphsManager.plugin.app, link.source.id);
            if (!sourceFile) continue;
            if (this.linksMap.get(linkID)) continue;

            isLinkMissing = true;
            let linkTypes = new Set<string>();

            // Links with dataview inline properties
            if (dv) {
                const sourcePage = dv.page(link.source.id);
                for (const [key, value] of Object.entries(sourcePage)) {
                    if (key === "file" || key === this.graph.settings.imageProperty) continue;
                    if (value === null || value === undefined || value === '') continue;

                    if ((typeof value === "object") && ("path" in value) && ((value as any).path === link.target.id)) {
                        setType(key, linkID, linkTypes);
                    }
                    else if (Array.isArray(value)) {
                        for (const l of value) {
                            if ((typeof l === "object") && ("path" in l) && ((l as any).path === link.target.id)) {
                                setType(key, linkID, linkTypes);
                            }
                        }
                    }
                }
            }

            // Links in the frontmatter
            else {
                const frontmatterLinks = this.graph.dispatcher.graphsManager.plugin.app.metadataCache.getFileCache(sourceFile)?.frontmatterLinks;
                if (frontmatterLinks) {
                    // For each link in the frontmatters, check if target matches
                    for (const linkCache of frontmatterLinks) {
                        const linkType = linkCache.key.split('.')[0];
                        const targetID = this.graph.dispatcher.graphsManager.plugin.app.metadataCache.getFirstLinkpathDest(linkCache.link, ".")?.path;
                        if (targetID === link.target.id) {
                            setType(linkType, linkID, linkTypes);
                        }
                    }
                }
            }

            if (linkTypes.size === 0) {
                setType(this.graph.settings.noneType["link"], linkID, missingTypes);
            }

            missingTypes = new Set([...missingTypes, ...linkTypes]);
        }

        this.linksManager.addTypes(missingTypes);
        return isLinkMissing;
    }

    private addMissingLinks() : Set<string> {
        if (!this.linksManager || !this.linkTypesMap) return new Set<string>();

        let missingLinks = new Set<string>();
        for (const link of this.graph.renderer.links) {
            const linkID = getLinkID(link);
            
            if (this.linksMap.has(linkID)) {
                let L = this.linksMap.get(linkID);
                if (L && L.wrapper) {
                    L.wrapper.disconnect();
                    L.wrapper.link = link;
                    L.wrapper.connect();
                }
                (L) && (L.link = link);
            }
            else {
                missingLinks.add(linkID);
                let linkWrapper = null;

                // Get the types of the link
                let types = [...this.linkTypesMap.keys()].filter(type => this.linkTypesMap?.get(type)?.has(linkID));

                // If the link has a type
                if (!this.linkTypesMap.get(this.graph.settings.noneType["link"])?.has(linkID)) {
                    linkWrapper = new LineLinkWrapper(
                        link,
                        new Set<string>(types),
                        this.linksManager
                    );
                    linkWrapper.connect();
                }
                this.linksMap.set(linkID, {wrapper: linkWrapper, link: link});
                this.connectedLinks.add(linkID);
            }
        }
        return missingLinks;
    }

    /**
     * Gets the currently active type of the link.
     * @param id - The ID of the link.
     * @returns The active type.
     */
    getActiveType(id: string) : string {
        if (!this.linkTypesMap) return "";
        let firstActiveType = [...this.linkTypesMap.keys()].find(type => this.linksManager?.isActive(type) && this.linkTypesMap?.get(type)?.has(id));
        return firstActiveType ? firstActiveType : this.graph.settings.noneType["link"];
    }

    /**
     * Gets all link types.
     * @returns A set of all link types, or null if not available.
     */
    getAllLinkTypes() : Set<string> | null {
        return new Set<string>(this.linkTypesMap?.keys());
    }

    /**
     * Gets links of specified types.
     * @param types - An array of link types.
     * @returns A set of link IDs.
     */
    getLinks(types: string[]) : Set<string> | null {
        const links = new Set<string>();
        for (const type of types) {
            this.linkTypesMap?.get(type)?.forEach(linkID => {
                links.add(linkID);
            })
        }
        return links;
    }

    /**
     * Disables links specified by their IDs.
     * @param ids - A set of link IDs to disable.
     * @param cause - The cause for the disconnection.
     */
    disableLinks(ids: Set<string>, cause: string) : void {
        for (const id of ids) {
            if (this.connectedLinks.has(id)) {
                this.connectedLinks.delete(id);
                this.disconnectedLinks[cause].add(id);
            }
            const l = this.linksMap.get(id);
            if (l) {
                if (!this.graph.renderer.links.includes(l.link)) {
                    if (l.wrapper) {
                        l.wrapper.updateLink();
                        l.link = l.wrapper.link;
                    }
                    else {
                        const newLink = this.graph.renderer.links.find(l2 => l2.source.id === l.link.source.id && l2.target.id === l.link.target.id);
                        (newLink) && (l.link = newLink);
                    }
                }
                l.link.clearGraphics();
                this.graph.renderer.links.remove(l.link);
            }
        }
    }

    /**
     * Enables links specified by their IDs.
     * @param ids - A set of link IDs to enable.
     * @param cause - The cause for the reconnection.
     */
    enableLinks(ids: Set<string>, cause: string) : void {
        for (const id of ids) {
            if (this.disconnectedLinks[cause].has(id)) {
                this.connectedLinks.add(id);
                this.disconnectedLinks[cause].delete(id);
            }
            const l = this.linksMap.get(id);
            if (l) {
                if (!this.graph.renderer.links.includes(l.link)) {
                    l.link.initGraphics();
                    this.graph.renderer.links.push(l.link);
                }
                l.wrapper?.updateLink();
                l.wrapper?.connect();
                l.wrapper?.updateGraphics();
            }
        }
    }

    /**
     * Connects all link wrappers in the set to their Obsidian link
     */
    connectLinks() : void {
        for (const [id, l] of this.linksMap) {
            if (l.wrapper) {
                l.wrapper.updateLink();
                l.link = l.wrapper?.link;
                l.wrapper.connect();
            }
            else {
                const newLink = this.graph.renderer.links.find(l2 => l2.source.id === l.link.source.id && l2.target.id === l.link.target.id);
                (newLink) && (l.link = newLink);
            }
        }
    }

    /**
     * Updates the color of a link type.
     * @param type - The link type.
     * @param color - The new color.
     */
    updateLinksColor(type: string, color: Uint8Array) : void {
        for (const [id, l] of this.linksMap) {
            if (l.wrapper?.types.has(type)) {
                l.wrapper.updateGraphics();
            }
        }
    }
}