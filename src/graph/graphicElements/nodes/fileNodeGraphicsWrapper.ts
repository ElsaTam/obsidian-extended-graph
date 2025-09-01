import { Texture } from "pixi.js";
import { blend, Color } from "../../../colors/color-bits";
import {
    ArcsCircle,
    CSSBridge,
    ExtendedGraphFileNode,
    fadeIn,
    getFile,
    InteractiveManager,
    NodeGraphicsWrapper,
    NodeImage,
    NodeShape,
    pixiAddChild,
    pixiAddChildAt
} from "../../../internal";

export class FileNodeGraphicsWrapper extends NodeGraphicsWrapper {
    // Interface instance values
    extendedElement: ExtendedGraphFileNode;
    managerGraphicsMap?: Map<string, ArcsCircle>;

    // Additional graphics elements
    nodeImage?: NodeImage;
    texture?: Texture;
    background?: NodeShape;

    // ============================= INITALIZATION =============================

    override createGraphics(): void {
        super.createGraphics();
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
            this.updateBackgroundColor(this.getFillColor().rgb, false);
        }
        this.background.scale.set(this.background.getDrawingResolution());
        pixiAddChildAt(this.pixiElement, this.background, 0);
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
            this.nodeImage.hasFaded = !this.extendedElement.instances.settings.fadeInElements;
            const opacityLayer = this.pixiElement.getChildByName("opacity-layer");
            if (opacityLayer) {
                const opacityLayerIndex = this.pixiElement.getChildIndex(opacityLayer);
                pixiAddChildAt(this.pixiElement, this.nodeImage, opacityLayerIndex);
            }
            else {
                pixiAddChild(this.pixiElement, this.nodeImage);
            }
            if (!this.pixiElement.parent) {
                this.connect();
            }
            if (this.extendedElement.instances.settings.fadeInElements && !this.nodeImage.hasFaded) {
                fadeIn(this.nodeImage);
            }
        }
    }

    protected createManagerGraphics(manager: InteractiveManager, types: Set<string>, layer: number) {
        const arcsCircle = new ArcsCircle(this.extendedElement, types, manager, layer, this.shape);
        this.managerGraphicsMap?.set(manager.name, arcsCircle);
        pixiAddChild(this.pixiElement, arcsCircle);
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
            arcCicle.updateValues();
        }
    }

    // ============================ UPDATE GRAPHICS ============================

    override updateFillColor(color: Color, highlighted: boolean): boolean {
        if (super.updateFillColor(color, highlighted)) {
            this.updateBackgroundColor(color ?? this.getFillColor().rgb, highlighted);
            return true;
        }
        return false;
    }

    private updateBackgroundColor(color: Color, highlighted: boolean) {
        if (!this.background) return;

        this.background.clear();

        if (this.extendedElement.icon) {
            if (this.extendedElement.instances.settings.borderWidthWithIcon > 0) {
                const strokeColor = highlighted ? color : this.extendedElement.icon.color ?? color;
                this.background.lineStyle({ color: strokeColor, width: this.extendedElement.instances.settings.borderWidthWithIcon / this.background.getDrawingResolution() });
            }
            color = blend(CSSBridge.backgroundColor, color, this.extendedElement.instances.settings.backgroundOpacityWithIcon);
        }

        this.background.drawFill(color);
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
}