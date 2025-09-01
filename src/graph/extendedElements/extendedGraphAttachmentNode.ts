import { AttachmentNodeGraphicsWrapper, ExtendedGraphNode, NodeShape } from "../../internal";

export class ExtendedGraphAttachmentNode extends ExtendedGraphNode {
    graphicsWrapper: AttachmentNodeGraphicsWrapper;

    // =============================== GRAPHICS ================================

    protected override needGraphicsWrapper(): boolean {
        return super.needGraphicsWrapper()
            || this.needImage();
    }

    public needImage(): boolean {
        return this.instances.settings.enableFeatures[this.instances.type]['imagesForAttachments'];
    }

    protected createGraphicsWrapper(): void {
        if (!this.graphicsWrapper) {
            this.graphicsWrapper = new AttachmentNodeGraphicsWrapper(this);
        }
        this.graphicsWrapper.createGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }
}