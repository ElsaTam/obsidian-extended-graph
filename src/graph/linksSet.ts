import { WorkspaceLeaf } from "obsidian";
import { InteractiveManager } from "./interactiveManager";
import { getLinkID, Link, LinkWrapper } from "./link";
import { Renderer } from "./renderer";
import { GraphViewData } from "src/views/viewData";
import { FUNC_NAMES, NONE_TYPE } from "src/globalVariables";
import { Graphics } from "pixi.js";

export class LinksSet {
    linksMap = new Map<string, LinkWrapper>();
    connectedLinks = new Set<string>();
    disconnectedLinks = new Set<string>();

    leaf: WorkspaceLeaf;
    renderer: Renderer;
    linksManager: InteractiveManager;

    constructor(leaf: WorkspaceLeaf, renderer: Renderer, linksManager: InteractiveManager) {
        FUNC_NAMES && console.log("[LinksSet] new");
        this.leaf = leaf;
        this.renderer = renderer;
        this.linksManager = linksManager;
    }

    load() : Promise<void>[] {
        FUNC_NAMES && console.log("[LinksSet] load");
        let requestList: Promise<void>[] = [];
        
        this.renderer.links.forEach((link: Link) => {
            if (this.linksMap.get(getLinkID(link))) return;
            let linkWrapper = new LinkWrapper(link, link.source.id, link.target.id);
            requestList.push(this.initLink(linkWrapper));
        })

        return requestList;
    }

    /**
     * Initialize the link wrapper and add it to the maps
     * @param linkWrapper 
     */
    private async initLink(linkWrapper: LinkWrapper) : Promise<void> {
        FUNC_NAMES && console.log("[LinksSet] initLink");
        await linkWrapper.waitReady();
        linkWrapper.init();
        this.linksMap.set(linkWrapper.id, linkWrapper);
        this.connectedLinks.add(linkWrapper.id);
    }
    
    /**
     * Get the link wrapper
     * @param id 
     * @returns 
     */
    get(id: string) : LinkWrapper {
        let link = this.linksMap.get(id);
        if (!link) {
            throw new Error(`No link for id ${id}.`)
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
    disableLinks(ids: Set<string>) : boolean {
        FUNC_NAMES && console.log("[LinksSet] disableLinks");
        let hasChanged = false;
        ids.forEach(id => {
            const linkWrapper = this.get(id);
            if (!linkWrapper.isActive) return;
            //this.renderer.links.remove(linkWrapper.link);
            this.connectedLinks.delete(id);
            this.disconnectedLinks.add(id);
            linkWrapper.setRenderable(false);
            hasChanged = true;
        });
        return hasChanged;
    }

    /**
     * Enable links
     * @param ids ids of the links
     * @returns true if a link was enabled
     */
    enableLinks(ids: Set<string>) : boolean {
        FUNC_NAMES && console.log("[LinksSet] enableLinks");
        let hasChanged = false;
        ids.forEach(id => {
            const linkWrapper = this.get(id);
            if (linkWrapper.isActive) return;
            //this.renderer.links.push(linkWrapper.link);
            this.disconnectedLinks.delete(id);
            this.connectedLinks.add(id);
            linkWrapper.setRenderable(true);
            hasChanged = true;
        });
        return hasChanged;
    }

    /**
     * Called when a child is added or removed to the stage
     */
    updateLinksFromEngine() {
        FUNC_NAMES && console.log("[LinksSet] updateLinksFromEngine");
        
        // Current links set by the Obsidian engine
        const newLinksIDs = this.renderer.links.map(l => getLinkID(l));
        
        // Get the links that needs to be removed
        let linksToRemove: string[] = newLinksIDs.filter(id => this.disconnectedLinks.has(id));

        // Get the links that were already existing and need to be reconnected
        let linksToAdd: string[] = newLinksIDs.filter(id => this.connectedLinks.has(id));

        // Get the new links that need to be created
        let linksToCreate: string[] = newLinksIDs.filter(id => !linksToRemove.includes(id) && !linksToAdd.includes(id));

        for (const id of linksToAdd) {
            let link = this.renderer.links.find(l => getLinkID(l) === id);
            if (!link) continue;
            const linkWrapper = this.get(id);

            linkWrapper.link = link;
            linkWrapper.waitReady().then(() => {
                let graphics = linkWrapper.link.px.children[0] as Graphics;
                if (!graphics.getChildByName(linkWrapper.name)) {
                    graphics.addChild(linkWrapper);
                }
                linkWrapper.setRenderable(true);
            })
        }
        if (linksToCreate.length > 0) {
            this.load();
        }
        for (const id of linksToRemove) {
            let link = this.renderer.links.find(l => getLinkID(l) === id);
            if (!link) continue;
            const linkWrapper = this.get(id);

            linkWrapper.link = link;
            linkWrapper.waitReady().then(() => {
                let graphics = linkWrapper.link.px.children[0] as Graphics;
                if (!graphics.getChildByName(linkWrapper.name)) {
                    graphics.addChild(linkWrapper);
                }
                linkWrapper.setRenderable(false);
            })
        }
    
        //(linksToAdd.length > 0)    && console.log("Links to add: ", linksToAdd);
        //(linksToCreate.length > 0) && console.log("Links to prevent create: ", linksToCreate);
        //(linksToRemove.length > 0) && console.log("Links to remove: ", linksToRemove);
        if (linksToRemove.length > 0) {
            this.leaf.trigger('extended-graph:engine-needs-update');
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
    
    /**
     * Update the links with a new view
     * @param viewData 
     */
    loadView(viewData: GraphViewData) : void {
        FUNC_NAMES && console.log("[LinksSet] loadView");
        let linksManager = this.linksManager;
        let linksToDisable: string[] = [];
        let linksToEnable: string[] = [];
        linksManager.getTypes().forEach(type => {
            if (linksManager.isActive(type) && viewData?.disabledLinks.includes(type)) {
                linksToDisable.push(type);
            }
            else if (!linksManager.isActive(type) && !viewData?.disabledLinks.includes(type)) {
                linksToEnable.push(type);
            }
        });
        linksManager.disable(linksToDisable);
        linksManager.enable(linksToEnable);
    }
}