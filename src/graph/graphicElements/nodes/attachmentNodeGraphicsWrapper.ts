import { Texture } from "pixi.js";
import { ExtendedGraphAttachmentNode, fadeIn, NodeGraphicsWrapper, NodeImage, pixiAddChild, pixiAddChildAt } from "../../../internal";

export class AttachmentNodeGraphicsWrapper extends NodeGraphicsWrapper {
    // Interface instance values
    extendedElement: ExtendedGraphAttachmentNode;

    // Additional graphics elements
    nodeImage?: NodeImage;
    texture?: Texture;

    // ============================= INITALIZATION =============================

    override createGraphics(): void {
        super.createGraphics();
        if (this.texture) this.initNodeImage(this.texture);
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
            const opacityLayer = this.pixiElement.getChildByName("opacity-layer");
            if (opacityLayer) {
                const opacityLayerIndex = this.pixiElement.getChildIndex(opacityLayer);
                pixiAddChildAt(this.pixiElement, this.nodeImage, opacityLayerIndex);
            }
            else {
                pixiAddChild(this.pixiElement, this.nodeImage);
            }
            if (this.extendedElement.instances.settings.fadeInElements && !this.nodeImage.hasFaded) {
                fadeIn(this.nodeImage);
            }
        }
    }

    // ============================ CLEAR GRAPHICS =============================

    override clearGraphics(): void {
        this.nodeImage?.destroy({ children: true });
        super.clearGraphics();
    }
}