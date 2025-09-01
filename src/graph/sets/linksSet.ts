import { TFile } from "obsidian";
import { GraphLink } from "obsidian-typings";
import * as Color from '../../colors/color-bits';
import { AbstractSet, ExtendedGraphLink, getFile, getLinkID, getOutlinkTypes, GraphInstances, InteractiveManager } from "../../internal";

export class LinksSet extends AbstractSet<GraphLink> {
    extendedElementsMap: Map<string, ExtendedGraphLink>;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, managers: InteractiveManager[]) {
        super(instances, managers);

        this.coreCollection = this.instances.renderer.links;
    }

    // ================================ LOADING ================================

    protected override handleMissingElement(extendedLink: ExtendedGraphLink): void {

    }



    // =========================== EXTENDED ELEMENTS ===========================

    protected override createExtendedElement(link: GraphLink): ExtendedGraphLink {
        const id = getLinkID(link);

        const types = new Map<string, Set<string>>();
        for (const [key, manager] of this.managers) {
            types.set(key, this.getTypes(key, link));
        }

        const extendedGraphLink = new ExtendedGraphLink(
            this.instances,
            link,
            types,
            [...this.managers.values()]
        );

        this.extendedElementsMap.set(id, extendedGraphLink);
        this.connectedIDs.add(id);

        return extendedGraphLink;
    }

    // ================================ GETTERS ================================

    protected override getID(element: GraphLink): string {
        return getLinkID(element);
    }

    protected override getTypesFromFile(key: string, link: GraphLink, file: TFile): Set<string> {
        const outlinkTypes = getOutlinkTypes(this.instances.settings, file);
        return outlinkTypes.get(link.target.id) ?? new Set<string>();
    }

    protected getAbstractFile(link: GraphLink): TFile | null {
        return getFile(link.source.id);
    }


    // ================================== CSS ==================================

    onCSSChange(): void {
        this.extendedElementsMap.forEach(extendedLink => {
            if (extendedLink.texts) {
                for (const text of extendedLink.texts) {
                    text.computeCSSStyle();
                    text.applyCSSChanges();
                }
            }
        });
    }

    // ================================ COLORS =================================

    protected override updateTypeColorForElement(extendedLink: ExtendedGraphLink, key: string, type: string, color: Color.Color): void {
        super.updateTypeColorForElement(extendedLink, key, type, color);
        if (extendedLink.texts) {
            for (const text of extendedLink.texts) {
                text.updateTextColor();
            }
        }
    }

    // ========================== VAULT MODIFICATIONS ==========================

    delete(extendedLink: ExtendedGraphLink) {
        if (extendedLink.texts) {
            for (const text of extendedLink.texts) {
                text.destroy();
            }
        }
        super.delete(extendedLink);
    }

}