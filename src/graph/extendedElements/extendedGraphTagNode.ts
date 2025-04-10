import { GraphColorAttributes, GraphNode } from "obsidian-typings";
import { ExtendedGraphNode, GraphInstances, InteractiveManager, NodeShape, PluginInstances, ProxysManager, rgb2int, TAG_KEY, TagNodeGraphicsWrapper } from "src/internal";

export class ExtendedGraphTagNode extends ExtendedGraphNode {
    graphicsWrapper: TagNodeGraphicsWrapper;

    constructor(instances: GraphInstances, node: GraphNode, types: Map<string, Set<string>>, managers: InteractiveManager[]) {
        super(instances, node, types, managers);
        this.changeGetFillColor();
    }

    protected initGraphicsWrapper(): void {
        super.initGraphicsWrapper();
        this.changeGetFillColor();
    }

    // ================================ UNLOAD =================================

    override unload(): void {
        this.restoreGetFillColor();
        super.unload();
    }

    // =============================== GRAPHICS ================================

    protected createGraphicsWrapper(): void {
        this.graphicsWrapper = new TagNodeGraphicsWrapper(this);
        this.graphicsWrapper.initGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }

    // ============================== NODE COLOR ===============================

    override changeGetFillColor() {
        if (!this.instances.settings.enableFeatures[this.instances.type]["tags"]
            || this.instances.settings.interactiveSettings[TAG_KEY].unselected.contains(this.id.replace('#', ''))) {
            this.restoreGetFillColor();
            return;
        }
        const getFillColor = this.getFillColor.bind(this);
        const proxy = PluginInstances.proxysManager.registerProxy<typeof this.coreElement.getFillColor>(
            this.coreElement,
            "getFillColor",
            {
                apply(target, thisArg, args) {
                    return getFillColor.call(this, ...args) ?? target.call(thisArg, ...args);
                }
            }
        );
        this.coreElement.circle?.addListener('destroyed', () => PluginInstances.proxysManager.unregisterProxy(proxy));
    }

    override restoreGetFillColor() {
        PluginInstances.proxysManager.unregisterProxy(this.coreElement.getFillColor);
    }

    protected override getFillColor(): GraphColorAttributes | undefined {
        const rgb = this.managers.get(TAG_KEY)?.getColor(this.id.replace('#', ''));
        if (!rgb) return undefined;
        return { rgb: rgb2int(rgb), a: 1 }
    }

    // ============================== CORE ELEMENT =============================

    override setCoreElement(coreElement: GraphNode | undefined): void {
        super.setCoreElement(coreElement);
        if (coreElement) {
            this.changeGetFillColor();
        }
    }
}