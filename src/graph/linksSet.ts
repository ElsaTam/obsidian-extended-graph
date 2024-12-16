import { WorkspaceLeaf } from "obsidian";
import { InteractiveManager } from "./interactiveManager";
import { getLinkID, Link, LinkWrapper } from "./link";
import { Renderer } from "./renderer";
import { GraphViewData } from "src/views/viewData";
import { NONE_TYPE } from "src/globalVariables";

export class LinksSet {
    linksMap = new Map<string, LinkWrapper>();
    connectedLinks = new Set<string>();
    disconnectedLinks = new Set<string>();
    disconnectedTypes = new Set<string>();

    leaf: WorkspaceLeaf;
    renderer: Renderer;
    linksManager: InteractiveManager;

    constructor(leaf: WorkspaceLeaf, renderer: Renderer, linksManager: InteractiveManager) {
        this.leaf = leaf;
        this.renderer = renderer;
        this.linksManager = linksManager;
    }

    load() : Promise<void>[] {
        let requestList: Promise<void>[] = [];
        
        this.renderer.links.forEach((link: Link) => {
            let linkWrapper = new LinkWrapper(link, link.source.id, link.target.id);
            requestList.push(this.initLink(linkWrapper));
        })

        return requestList;
    }

    private async initLink(linkWrapper: LinkWrapper) : Promise<void> {
        await linkWrapper.waitReady();
        linkWrapper.init();
        this.linksMap.set(linkWrapper.id, linkWrapper);
        this.connectedLinks.add(linkWrapper.id);
    }
    
    get(id: string) : LinkWrapper | undefined {
        return this.linksMap.get(id);
    }

    updateLinksFromEngine() {
        const newLinksIDs = this.renderer.links.map(l => getLinkID(l));
        let linksToAdd: string[] = [];
        let linksToRemove: string[] = [];
        this.disconnectedLinks.forEach(id => {
            if (newLinksIDs.includes(id)) {
                linksToAdd.push(id);
            }
        });
        this.connectedLinks.forEach(id => {
            if (!newLinksIDs.includes(id)) {
                linksToRemove.push(id);
            }
        });
        linksToAdd.forEach(id => {
            this.disconnectedLinks.delete(id);
            this.connectedLinks.add(id);
        });
        linksToRemove.forEach(id => {
            this.disconnectedLinks.delete(id);
            this.connectedLinks.add(id);
        });
    }

    getActiveType(id: string) : string | null {
        let linkWrapper = this.linksMap.get(id);
        if (!linkWrapper) return null;
        let firstActiveType = [...linkWrapper.types].find(type => this.linksManager.isActive(type));
        return firstActiveType ? firstActiveType : null;
    }

    disableLinks(types: string[]) : boolean {
        let hasChanged = false;

        this.connectedLinks.forEach(id => {
            const linkWrapper = this.linksMap.get(id);
            if (!linkWrapper) return;

            if([...linkWrapper.types].some(type => this.linksManager.isActive(type))) {
                // TODO : update color
                return;
            }

            hasChanged = true;
    
            this.connectedLinks.delete(id);
            this.disconnectedLinks.add(id);
            this.renderer.links.remove(linkWrapper.link);
        });
        this.disconnectedTypes = new Set<string>([...this.disconnectedTypes, ...types]);

        return hasChanged;
    }

    enableLinks(types: string[]) : boolean {
        let hasChanged = false;
        
        this.disconnectedLinks.forEach(id => {
            const linkWrapper = this.linksMap.get(id);
            if (!linkWrapper) return;

            if([...linkWrapper.types].every(type => !this.linksManager.isActive(type))) {
                return;
            }

            // TODO : update color

            hasChanged = true;

            this.disconnectedLinks.delete(id);
            this.connectedLinks.add(id);
            this.renderer.links.push(linkWrapper.link);
        });
        types.forEach(type => this.disconnectedTypes.delete(type));

        return hasChanged;
    }

    updateLinksColor(type: string, color: Uint8Array) : void {
        this.linksMap.forEach((linkWrapper, id) => {
            if (this.getActiveType(id) == type) {
                linkWrapper.setColor(color);
            }
        });
    }
    
    loadView(viewData: GraphViewData) : void {
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