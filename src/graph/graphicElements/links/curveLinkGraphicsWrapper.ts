import { ExtendedGraphLink, GraphicsWrapper, InteractiveManager, LinkCurveSingleTypeGraphics, LinkCurveMultiTypesGraphics, LinkCurveGraphics, fadeIn, getIndexInHanger, pixiAddChildAt } from "../../../internal";


export class CurveLinkGraphicsWrapper implements GraphicsWrapper {
    name: string;
    extendedElement: ExtendedGraphLink;
    managerGraphicsMap: Map<string, LinkCurveGraphics>;
    pixiElement: LinkCurveGraphics;

    constructor(extendedElement: ExtendedGraphLink) {
        this.name = extendedElement.id;
        this.extendedElement = extendedElement;
        this.managerGraphicsMap = new Map();
    }

    // ============================= INITALIZATION =============================

    createGraphics(): void {
        let layer = 1;
        const instances = this.extendedElement.instances;
        for (const [key, manager] of instances.linksSet.managers) {
            if (!instances.settings.interactiveSettings[key].showOnGraph
                && !instances.settings.curvedLinks
            ) continue;
            const validTypes = this.extendedElement.getTypes(key);
            this.createManagerGraphics(manager, validTypes, layer);
            layer++;
        }
    }

    protected createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const existingLinkGraphics = this.managerGraphicsMap.get(manager.name);
        if (existingLinkGraphics && !existingLinkGraphics.destroyed) {
            this.setManagerGraphics(manager, existingLinkGraphics);
        }
        else {
            const curveLink = this.extendedElement.instances.settings.allowMultipleLinkTypes
                ? new LinkCurveMultiTypesGraphics(manager, types, this.name, this.extendedElement)
                : new LinkCurveSingleTypeGraphics(manager, types, this.name, this.extendedElement);
            this.setManagerGraphics(manager, curveLink);
        }
    }

    protected setManagerGraphics(manager: InteractiveManager, linkGraphics: LinkCurveGraphics): void {
        const existingLinkGraphics = this.managerGraphicsMap.get(manager.name);
        if (existingLinkGraphics && existingLinkGraphics !== linkGraphics) {
            if (existingLinkGraphics.parent) existingLinkGraphics.removeFromParent();
            if (!existingLinkGraphics.destroyed) existingLinkGraphics.destroy({ children: true });
        }
        this.managerGraphicsMap.set(manager.name, linkGraphics);
        this.pixiElement = linkGraphics;
    }

    resetManagerGraphics(manager: InteractiveManager): void { }

    // ============================ CLEAR GRAPHICS =============================

    clearGraphics(): void {
        this.pixiElement.clear();
    }

    destroyGraphics(): void {
        this.pixiElement.destroy({ children: true });
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics(): void {
        this.pixiElement?.updateValues();
    }

    // ========================== CONNECT/DISCONNECT ===========================

    connect(): void {
        const hanger = this.extendedElement.coreElement.renderer.hanger;
        if (!hanger.getChildByName(this.pixiElement.name) && this.extendedElement.coreElement.px) {
            this.pixiElement.extendedLink = this.extendedElement;
            if (this.extendedElement.coreElement.arrow) this.extendedElement.coreElement.arrow.renderable = false;
            const index = getIndexInHanger(this.extendedElement.coreElement.renderer.hanger, this.extendedElement.coreElement.px);
            pixiAddChildAt(hanger, this.pixiElement, index);
            if (this.extendedElement.instances.settings.fadeInElements && !this.pixiElement.hasFaded) {
                fadeIn(this.pixiElement);
            }
        }
    }

    disconnect(): void {
        for (const graphics of this.managerGraphicsMap.values()) {
            graphics.removeFromParent();
        }
    }
}