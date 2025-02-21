import { ColorSource } from "node_modules/@pixi/color/lib/Color";
import { ExtendedGraphUnresolvedNode, NodeGraphicsWrapper, NodeShape } from "src/internal";

export class UnresolvedNodeGraphicsWrapper extends NodeGraphicsWrapper {
    // Interface instance values
    extendedElement: ExtendedGraphUnresolvedNode;

    // Additional graphics elements
    innerCircle?: NodeShape;

    // ============================= INITALIZATION =============================

    override initGraphics(): void {
        super.initGraphics();
        if (this.extendedElement.needInnerCircle()) this.initInnerCircle();
    }

    private initInnerCircle() {
        if (typeof this.extendedElement.instances.settings.borderUnresolved !== 'number') return;
        this.innerCircle = new NodeShape(this.shape);
        this.innerCircle.alpha = 5;
        this.innerCircle.scale.set(this.innerCircle.getDrawingResolution() * (1 - this.extendedElement.instances.settings.borderUnresolved));
        this.pixiElement.addChildAt(this.innerCircle, 0);
    }

    // ============================ UPDATE GRAPHICS ============================

    override updateOpacityLayerColor(backgroundColor: ColorSource): void {
        super.updateOpacityLayerColor(backgroundColor);

        if (!this.innerCircle) return;
        this.innerCircle.clear();
        this.innerCircle.drawFill(backgroundColor);
    }

    // ============================ CLEAR GRAPHICS =============================

    override clearGraphics(): void {
        this.innerCircle?.destroy();
        super.clearGraphics();
    }
}