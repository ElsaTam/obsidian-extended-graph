import { GraphNode } from "obsidian-typings";
import { ExtendedGraphNode, UnresolvedNodeGraphicsWrapper, GraphInstances, InteractiveManager, NodeShape, PluginInstances } from "src/internal";

export class ExtendedGraphUnresolvedNode extends ExtendedGraphNode {
    graphicsWrapper: UnresolvedNodeGraphicsWrapper;
    
    constructor(instances: GraphInstances, node: GraphNode) {
        super(instances, node, new Map(), []);
        this.changeGetFillColor();
    }

    // ================================ UNLOAD =================================

    unload(): void {
        this.restoreGetFillColor();
        super.unload();
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
        this.graphicsWrapper = new UnresolvedNodeGraphicsWrapper(this);
        this.graphicsWrapper.initGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }
}