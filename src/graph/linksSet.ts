import { InteractiveManager } from "./interactiveManager";
import { Graph } from "./graph";
import { getLinkID } from "src/helperFunctions";
import { Link } from "./link";
import { ColorSource } from "pixi.js";
import { INVALID_KEYS } from "src/globalVariables";
import { rgb2int } from "src/colors/colors";

export class LinksSet {
    linkTypesMap = new Map<string, Set<string>>(); // key: type / value: link ids
    linksMap = new Map<string, {link: Link, color: ColorSource}>();
    connectedLinks = new Set<string>();
    disconnectedLinks = new Set<string>();

    graph: Graph;
    linksManager: InteractiveManager;

    constructor(graph: Graph, linksManager: InteractiveManager) {
        this.graph = graph;
        this.linksManager = linksManager;
    }

    load() : Promise<void>[] {
        let requestList: Promise<void>[] = [];
        
        this.graph.renderer.links.forEach((link: Link) => {
            if (this.linksMap.get(getLinkID(link))) return;
            requestList.push(this.initLink(link));
        })

        return requestList;
    }

    unload() {
        this.linksMap.clear();
        this.connectedLinks.clear();
        this.disconnectedLinks.clear();
    }

    /**
     * Initialize the link wrapper and add it to the maps
     * @param linkWrapper 
     */
    private async initLink(link: Link) : Promise<void> {
        await this.waitReady(link).then(() => {
            this.linksMap.set(getLinkID(link), {link: link, color: "white"});
            this.connectedLinks.add(getLinkID(link));
        }, () => {});
    }

    async waitReady(link: Link): Promise<boolean> {
        let i = 0;
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (link.line) {
                    clearInterval(intervalId);
                    resolve(true);
                }
                if (i > 10 || !this.graph.renderer.links.includes(link)) {
                    clearInterval(intervalId);
                    resolve(false);
                }
                i += 1;
            }, 100);
        });
    }
    
    /**
     * Get the link wrapper
     * @param id 
     * @returns 
     */
    get(id: string) : Link {
        let wrapper = this.linksMap.get(id);
        if (!wrapper) {
            throw new Error(`No link for id ${id}.`);
        }
        return wrapper.link;
    }

    /**
     * Disable links
     * @param ids ids of the links
     * @returns true if a link was disabled
     */
    async disableLinks(ids: Set<string>) : Promise<boolean> {
        let promises: Promise<void>[] = [];
        ids.forEach(id => {
            const link = this.get(id);
            promises.push(this.waitReady(link).then((ready) => {
                if (ready) {
                    try {link.px.renderable = false;} catch {}
                }
                this.connectedLinks.delete(id);
                this.disconnectedLinks.add(id);
            }))
        });
        if (promises.length > 0) {
            await Promise.all(promises);
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * Enable links
     * @param ids ids of the links
     * @returns true if a link was enabled
     */
    async enableLinks(ids: Set<string>) : Promise<boolean> {
        let promises: Promise<void>[] = [];
        ids.forEach(id => {
            const link = this.get(id);
            promises.push(this.waitReady(link).then((ready) => {
                if (ready) {
                    try {link.px.renderable = true;} catch {}
                }
                this.disconnectedLinks.delete(id);
                this.connectedLinks.add(id);
            }))
        });
        if (promises.length > 0) {
            await Promise.all(promises);
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * Called when a child is added or removed to the stage
     */
    updateLinksFromEngine() {
        
        // Current links set by the Obsidian engine
        const newLinksIDs = this.graph.renderer.links.map(l => getLinkID(l));
        
        // Get the links that needs to be removed
        let linksToRemove: string[] = newLinksIDs.filter(id => this.disconnectedLinks.has(id));

        // Get the links that were already existing and need to be reconnected
        let linksToAdd: string[] = newLinksIDs.filter(id => this.connectedLinks.has(id));

        // Get the new links that need to be created
        let linksToCreate: string[] = newLinksIDs.filter(id => !linksToRemove.includes(id) && !linksToAdd.includes(id));

        for (const id of linksToAdd) {
            let link = this.graph.renderer.links.find(l => getLinkID(l) === id);
            if (!link) continue;
            try {link.px.renderable = true;} catch {}
        }
        for (const id of linksToRemove) {
            let link = this.graph.renderer.links.find(l => getLinkID(l) === id);
            if (!link) continue;
            try {link.px.renderable = false;} catch {}
        }
        if (linksToRemove.length > 0) {
            this.graph.dispatcher.onEngineNeedsUpdate();
        }
        else if (linksToCreate.length > 0) {
            this.graph.dispatcher.onGraphNeedsUpdate();
        }
    }

    /**
     * Update the color of a link type
     * @param type 
     * @param color 
     */
    updateLinksColor(type: string, color: Uint8Array) : void {
        this.linksMap.forEach((wrapper, id) => {
            if (this.getActiveType(id) == type) {
                wrapper.color = rgb2int(color);
            }
        });
    }

    setType(type: string, linkID: string) : boolean {
        if (this.graph.settings.unselectedInteractives["link"].includes(type)) return false;
        if (INVALID_KEYS["link"].includes(type)) return false;

        (!this.linkTypesMap.get(type)) && this.linkTypesMap.set(type, new Set<string>());
        this.linkTypesMap.get(type)?.add(linkID);
        return true;
    }

    getActiveType(id: string) : string {
        if (!this.linkTypesMap) return this.graph.settings.noneType["link"];
        for (const [type, ids] of this.linkTypesMap) {
            if (ids.has(id)) return type;
        }
        return this.graph.settings.noneType["link"];
    }

    getAllLinkTypes() : Set<string> {
        return new Set<string>(this.linkTypesMap.keys());
    }

    getLinks(types: string[]) : Set<string> | null {
        const links = new Set<string>();
        for (const type of types) {
            this.linkTypesMap.get(type)?.forEach(linkID => {
                links.add(linkID);
            })
        }
        return links;
    }

    draw() {
        for (const [id, wrapper] of this.linksMap) {
            if (wrapper.link.line) wrapper.link.line.tint = wrapper.color;
        }
    }
}