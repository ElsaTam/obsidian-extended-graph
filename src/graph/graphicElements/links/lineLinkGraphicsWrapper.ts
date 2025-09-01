import { ExtendedGraphLink, fadeIn, getIndexInHanger, GraphicsWrapper, InteractiveManager, LinkLineMultiTypesGraphics, pixiAddChildAt } from "../../../internal";


export class LineLinkGraphicsWrapper implements GraphicsWrapper {
    name: string;
    extendedElement: ExtendedGraphLink;
    managerGraphicsMap: Map<string, LinkLineMultiTypesGraphics>;
    pixiElement: LinkLineMultiTypesGraphics;

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
            const lineLink = new LinkLineMultiTypesGraphics(manager, types, this.name, this.extendedElement);
            this.setManagerGraphics(manager, lineLink);
        }
    }

    protected setManagerGraphics(manager: InteractiveManager, linkGraphics: LinkLineMultiTypesGraphics): void {
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

    // =============================== ANIMATION ===============================

    animate(): void {

    }
}