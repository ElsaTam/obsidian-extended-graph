import { InteractiveManager } from "./interactiveManager";
import { CurveLinkWrapper, getLinkID, LineLinkWrapper, Link, LinkWrapper } from "./elements/link";
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

    load() {
        this.initLinkTypes();
        
        for (const link of this.graph.renderer.links) {
            const linkID = getLinkID(link);
            if (this.linksMap.get(linkID)) continue;

            let linkWrapper = null;

            if (this.linksManager && this.linkTypesMap) {
                // Get the types of the link
                let types = [...this.linkTypesMap.keys()].filter(type => this.linkTypesMap?.get(type)?.has(linkID));

                // If the link has a type
                if (! this.linkTypesMap.get(this.graph.settings.noneType["link"])?.has(linkID)) {
                    if (this.graph.settings.linkCurves)
                        linkWrapper = new CurveLinkWrapper(link, new Set<string>(types), this.linksManager);
                    else
                        linkWrapper = new LineLinkWrapper(link, new Set<string>(types), this.linksManager);
                    linkWrapper.connect();
                }
            }
            this.linksMap.set(linkID, {wrapper: linkWrapper, link: link});
            this.connectedLinks.add(linkID);
        }
    }

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

    private initLinkTypes() : void {
        if (!this.linksManager || !this.linkTypesMap) return;
        let setType = (function(type: string, id: string, types: Set<string>) {
            if (this.graph.settings.unselectedInteractives["link"].includes(type)) return;
            if (INVALID_KEYS["link"].includes(type)) return;

            (!this.linkTypesMap.get(type)) && this.linkTypesMap.set(type, new Set<string>());
            this.linkTypesMap.get(type)?.add(id);
            types.add(type);
        }).bind(this);

        // Create link types
        const dv = getDataviewAPI();
        for (const link of this.graph.renderer.links) {
            const linkID = getLinkID(link);
            const sourceFile = getFile(this.graph.dispatcher.graphsManager.plugin.app, link.source.id);
            if (!sourceFile) continue;

            let types = new Set<string>();

            // Links with dataview inline properties
            if (dv) {
                let sourcePage = dv.page(link.source.id);
                for (const [key, value] of Object.entries(sourcePage)) {
                    if (key === "file" || key === this.graph.settings.imageProperty) continue;
                    if (value === null || value === undefined || value === '') continue;

                    if ((typeof value === "object") && ("path" in value) && ((value as any).path === link.target.id)) {
                        setType(key, linkID, types);
                    }

                    if (Array.isArray(value)) {
                        for (const l of value) {
                            if ((typeof l === "object") && ("path" in l) && ((l as any).path === link.target.id)) {
                                setType(key, linkID, types);
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
                            setType(linkType, linkID, types);
                        }
                    }
                }
            }

            if (types.size === 0) {
                setType(this.graph.settings.noneType["link"], linkID, types);
            }
        }

        this.linksManager.update(new Set(this.linkTypesMap.keys()));
    }

    /**
     * Get the currently active type of the link
     * @param id id of the link
     * @returns active type
     */
    getActiveType(id: string) : string {
        if (!this.linkTypesMap) return "";
        let firstActiveType = [...this.linkTypesMap.keys()].find(type => this.linksManager?.isActive(type) && this.linkTypesMap?.get(type)?.has(id));
        return firstActiveType ? firstActiveType : this.graph.settings.noneType["link"];
    }

    getAllLinkTypes() : Set<string> | null {
        return new Set<string>(this.linkTypesMap?.keys());
    }

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
     * Disable links
     * @param ids ids of the links
     * @returns true if a link was disabled
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
     * Enable links
     * @param ids ids of the links
     * @returns true if a link was enabled
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
     * Update the color of a link type
     * @param type 
     * @param color 
     */
    updateLinksColor(type: string, color: Uint8Array) : void {
        for (const [id, l] of this.linksMap) {
            if (l.wrapper?.types.has(type)) {
                l.wrapper.updateGraphics();
            }
        }
    }
}