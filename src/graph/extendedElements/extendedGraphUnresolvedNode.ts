import { GraphNode } from "obsidian-typings";
import { ExtendedGraphNode, UnresolvedNodeGraphicsWrapper, NodeShape, GraphInstances } from "../../internal";

export class ExtendedGraphUnresolvedNode extends ExtendedGraphNode {
    graphicsWrapper: UnresolvedNodeGraphicsWrapper;

    constructor(instances: GraphInstances, node: GraphNode) {
        super(instances, node, new Map(), []);
    }

    // =============================== GRAPHICS ================================

    protected override needGraphicsWrapper(): boolean {
        return super.needGraphicsWrapper()
            || this.needInnerCircle();
    }

    public needInnerCircle(): boolean {
        return typeof this.instances.settings.borderUnresolved === 'number'
            && this.instances.settings.borderUnresolved > 0
            && this.instances.settings.borderUnresolved < 1;
    }

    protected createGraphicsWrapper(): void {
        if (!this.graphicsWrapper) {
            this.graphicsWrapper = new UnresolvedNodeGraphicsWrapper(this);
        }
        this.graphicsWrapper.createGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }
}