import { WorkspaceLeaf } from "obsidian";
import { InteractiveManager } from "./interactiveManager";
import { getLinkID, Link, LinkWrapper } from "./link";
import { Renderer } from "./renderer";
import { GraphViewData } from "src/views/viewData";
import { FUNC_NAMES, NONE_TYPE } from "src/globalVariables";
import { Graphics } from "pixi.js";
import { WorkspaceLeafExt } from "./graphEventsDispatcher";
import { Graph } from "./graph";

export class LinksSet {
    linksMap = new Map<string, LinkWrapper>();
    connectedLinks = new Set<string>();
    disconnectedLinks = new Set<string>();

    graph: Graph;
    linksManager: InteractiveManager;

    constructor(graph: Graph, linksManager: InteractiveManager) {
        FUNC_NAMES && console.log("[LinksSet] new");
        this.graph = graph;
        this.linksManager = linksManager;
    }

    load() : Promise<void>[] {
        FUNC_NAMES && console.log("[LinksSet] load");
        let requestList: Promise<void>[] = [];
        
        this.graph.renderer.links.forEach((link: Link) => {
            if (this.linksMap.get(getLinkID(link))) return;
            let linkWrapper = new LinkWrapper(link, link.source.id, link.target.id, this.graph.settings);
            requestList.push(this.initLink(linkWrapper));
        })

        return requestList;
    }

    unload() {
        this.linksMap.forEach(wrapper => {
            wrapper.disconnect();
            wrapper.destroy();
        });
        this.linksMap.clear();
        this.connectedLinks.clear();
        this.disconnectedLinks.clear();
    }

    /**
     * Initialize the link wrapper and add it to the maps
     * @param linkWrapper 
     */
    private async initLink(linkWrapper: LinkWrapper) : Promise<void> {
        FUNC_NAMES && console.log("[LinksSet] initLink");
        await linkWrapper.init(this.graph.renderer).then(() => {
            linkWrapper.connect();
            this.linksMap.set(linkWrapper.id, linkWrapper);
            this.connectedLinks.add(linkWrapper.id);
        }, () => {
            linkWrapper.destroy();
        });
    }
    
    /**
     * Get the link wrapper
     * @param id 
     * @returns 
     */
    get(id: string) : LinkWrapper {
        let link = this.linksMap.get(id);
        if (!link) {
            throw new Error(`No link for id ${id}.`);
        }
        return link;
    }

    /**
     * Get the currently active type of the link
     * @param id id of the link
     * @returns active type
     */
    getActiveType(id: string) : string {
        let firstActiveType = [...this.get(id).types].find(type => this.linksManager.isActive(type));
        return firstActiveType ? firstActiveType : NONE_TYPE;
    }

    /**
     * Disable links
     * @param ids ids of the links
     * @returns true if a link was disabled
     */
    async disableLinks(ids: Set<string>) : Promise<boolean> {
        FUNC_NAMES && console.log("[LinksSet] disableLinks");
        let promises: Promise<void>[] = [];
        ids.forEach(id => {
            const linkWrapper = this.get(id);
            promises.push(linkWrapper.waitReady(this.graph.renderer).then((ready) => {
                if (ready) {
                    linkWrapper.setRenderable(false);
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
        FUNC_NAMES && console.log("[LinksSet] enableLinks");
        let promises: Promise<void>[] = [];
        ids.forEach(id => {
            const linkWrapper = this.get(id);
            promises.push(linkWrapper.waitReady(this.graph.renderer).then((ready) => {
                if (ready) {
                    linkWrapper.connect();
                    linkWrapper.setRenderable(true);
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
        FUNC_NAMES && console.log("[LinksSet] updateLinksFromEngine");
        
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

            try {
                const linkWrapper = this.get(id);
                linkWrapper.link = link;
                linkWrapper.connect();
                linkWrapper.setRenderable(true);
            }
            catch (error) {

            }
        }
        for (const id of linksToRemove) {
            let link = this.graph.renderer.links.find(l => getLinkID(l) === id);
            if (!link) continue;
            const linkWrapper = this.get(id);

            linkWrapper.link = link;
            linkWrapper.setRenderable(false);
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
        FUNC_NAMES && console.log("[LinksSet] updateLinksColor");
        this.linksMap.forEach((linkWrapper, id) => {
            if (this.getActiveType(id) == type) {
                linkWrapper.setColor(color);
            }
        });
    }
}