import { GraphColorAttributes, } from "obsidian-typings";
import { ExtendedGraphNode, NodeShape, SettingQuery, TAG_KEY, TagNodeGraphicsWrapper } from "../../internal";

export class ExtendedGraphTagNode extends ExtendedGraphNode {
    graphicsWrapper: TagNodeGraphicsWrapper;


    // =============================== GRAPHICS ================================

    protected createGraphicsWrapper(): void {
        if (!this.graphicsWrapper) {
            this.graphicsWrapper = new TagNodeGraphicsWrapper(this);
        }
        this.graphicsWrapper.createGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }

    // ============================== NODE COLOR ===============================

    protected override needToChangeColor() {
        return super.needToChangeColor()
            || (this.instances.settings.enableFeatures[this.instances.type]["tags"]
                && !SettingQuery.excludeType(this.instances.settings, TAG_KEY, this.id.replace('#', '')));
    }

    protected override getFillColor(): GraphColorAttributes | undefined {
        if (this.instances.settings.enableFeatures[this.instances.type]["tags"]
            && !SettingQuery.excludeType(this.instances.settings, TAG_KEY, this.id.replace('#', ''))) {
            const color = this.managers.get(TAG_KEY)?.getColor(this.id.replace('#', ''));
            if (color) return { rgb: color, a: 1 }
        }
        return super.getFillColor();
    }
}