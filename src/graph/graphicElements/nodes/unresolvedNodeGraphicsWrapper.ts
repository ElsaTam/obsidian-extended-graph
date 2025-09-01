import { ColorSource } from "pixi.js";
import { ExtendedGraphUnresolvedNode, NodeGraphicsWrapper, NodeShape, pixiAddChildAt } from "../../../internal";

export class UnresolvedNodeGraphicsWrapper extends NodeGraphicsWrapper {
    // Interface instance values
    extendedElement: ExtendedGraphUnresolvedNode;

    // Additional graphics elements
    innerCircle?: NodeShape;

    // ============================= INITALIZATION =============================

    override createGraphics(): void {
        super.createGraphics();
        if (this.extendedElement.needInnerCircle()) this.initInnerCircle();
    }

    private initInnerCircle() {
        if (typeof this.extendedElement.instances.settings.borderUnresolved !== 'number') return;
        if (this.innerCircle) {
            if (this.innerCircle.parent) this.innerCircle.removeFromParent();
            if (!this.innerCircle.destroyed) this.innerCircle.destroy({ children: true });
        }

        this.innerCircle = new NodeShape(this.shape);
        this.innerCircle.alpha = 5;
        this.innerCircle.scale.set(this.innerCircle.getDrawingResolution() * (1 - this.extendedElement.instances.settings.borderUnresolved));
        pixiAddChildAt(this.pixiElement, this.innerCircle, 0);
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