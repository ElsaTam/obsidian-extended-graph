import { Texture } from "pixi.js";
import { ArcsCircle, ExtendedGraphFileNode, getFile, InteractiveManager, NodeGraphicsWrapper, NodeImage, NodeShape, PluginInstances } from "src/internal";

export class FileNodeGraphicsWrapper extends NodeGraphicsWrapper {
    // Interface instance values
    extendedElement: ExtendedGraphFileNode;
    managerGraphicsMap?: Map<string, ArcsCircle>;

    // Additional graphics elements
    nodeImage?: NodeImage;
    texture?: Texture;
    background?: NodeShape;

    // ============================= INITALIZATION =============================

    override initGraphics(): void {
        super.initGraphics();
        if (this.extendedElement.needBackground()) this.initBackground();
        if (this.extendedElement.needArcs()) this.initArcsWrapper();
        if (this.texture) this.initNodeImage(this.texture);
    }

    private initArcsWrapper() {
        if (this.managerGraphicsMap && this.managerGraphicsMap.size > 0) {
            for (const arcWrapper of this.managerGraphicsMap.values() || []) {
                if (arcWrapper.parent) arcWrapper.removeFromParent();
                if (!arcWrapper.destroyed) arcWrapper.destroy({ children: true });
            }
            this.managerGraphicsMap.clear()
        }
        else {
            this.managerGraphicsMap = new Map<string, ArcsCircle>();
        }
        let layer = 1;
        for (const [key, manager] of this.extendedElement.managers) {
            if (!this.extendedElement.instances.settings.interactiveSettings[key].showOnGraph) continue;
            const validTypes = this.extendedElement.getTypes(key);
            this.createManagerGraphics(manager, validTypes, layer);
            layer++;
        }
    }

    private initBackground() {
        if (this.background) {
            if (this.background.parent) this.background.removeFromParent();
            if (!this.background.destroyed) this.background.destroy({ children: true });
        }
        this.background = new NodeShape(this.shape);
        if (this.extendedElement.instances.settings.enableFeatures[this.extendedElement.instances.type]['shapes']) {
            this.background.drawFill(this.getFillColor().rgb);
        }
        this.background.scale.set(this.background.getDrawingResolution());
        this.pixiElement.addChildAt(this.background, 0);
    }

    initNodeImage(texture: Texture | undefined) {
        if (!this.extendedElement.needImage()) return;
        if (this.nodeImage && (this.nodeImage.destroyed || !this.nodeImage.parent)) {
            if (this.nodeImage.parent) this.nodeImage.removeFromParent();
            if (!this.nodeImage.destroyed) this.nodeImage.destroy({ children: true });
        }
        if (texture) {
            this.texture = texture;
            this.nodeImage = new NodeImage(texture, this.extendedElement.instances.settings.borderFactor, this.shape);
            this.pixiElement.addChildAt(this.nodeImage, this.pixiElement.children.length > 0 ? Math.max(1, this.pixiElement.children.length - 2) : 0);
        }
    }

    protected createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const arcsCircle = new ArcsCircle(types, manager, layer, this.shape);
        this.managerGraphicsMap?.set(manager.name, arcsCircle);
        this.pixiElement.addChild(arcsCircle);
    }

    resetManagerGraphics(manager: InteractiveManager) {
        const file = getFile(this.extendedElement.id);
        if (!file) return;
        const arcCicle = this.managerGraphicsMap?.get(manager.name);
        const types = this.extendedElement.getTypes(manager.name);

        if (!arcCicle) {
            this.createManagerGraphics(manager, types, this.managerGraphicsMap?.size ?? 0);
        }
        else {
            arcCicle.clearGraphics();
            arcCicle.setTypes(types);
            arcCicle.initGraphics();
            arcCicle.updateGraphics();
        }
    }

    // ============================ UPDATE GRAPHICS ============================

    override updateFillColor() {
        super.updateFillColor();
        this.background?.drawFill(this.getFillColor().rgb);
    }

    // ============================ CLEAR GRAPHICS =============================

    override clearGraphics(): void {
        this.background?.destroy();
        this.nodeImage?.destroy({ children: true });
        if (this.managerGraphicsMap) {
            for (const arcWrapper of this.managerGraphicsMap.values()) {
                arcWrapper.clearGraphics();
            }
        }
        super.clearGraphics();
    }

    // =============================== EMPHASIZE ===============================

    emphasize(bigger: boolean) {
        if (!this.background) return;

        this.scaleFactor = bigger ? PluginInstances.settings.focusScaleFactor : 1;
        if (bigger || this.extendedElement.instances.settings.enableFeatures[this.extendedElement.instances.type]['shapes']) {
            const color = bigger ? this.extendedElement.instances.renderer.colors.fillFocused.rgb : this.getFillColor().rgb;
            this.background.clear();
            this.background.drawFill(color);
        }
        else {
            this.background.clear();
        }
        this.pixiElement.scale.set(this.scaleFactor);
    }
}