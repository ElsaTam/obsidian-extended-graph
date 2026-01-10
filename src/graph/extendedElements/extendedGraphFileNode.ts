import { GraphColorAttributes } from "obsidian-typings";
import { blendMultiple } from "../../colors/color-bits";
import { evaluateCMap, ExtendedGraphNode, FileNodeGraphicsWrapper, NodeShape, ExtendedGraphInstances, ShapeEnum, TAG_KEY, LINK_KEY, FOLDER_KEY } from "../../internal";

export class ExtendedGraphFileNode extends ExtendedGraphNode {
    graphicsWrapper: FileNodeGraphicsWrapper;

    // =============================== GRAPHICS ================================

    protected override needGraphicsWrapper(): boolean {
        return super.needGraphicsWrapper()
            || this.needBackground()
            || this.needImage()
            || this.needArcs();
    }

    public needImage(): boolean {
        return this.instances.settings.enableFeatures[this.instances.type]['imagesFromProperty']
            || this.instances.settings.enableFeatures[this.instances.type]['imagesFromEmbeds'];
    }

    public needBackground(): boolean {
        if (this.icon && this.instances.settings.backgroundOpacityWithIcon > 0 && this.graphicsWrapper?.shape !== ShapeEnum.CIRCLE)
            return true;
        if (this.icon && this.instances.settings.borderWidthWithIcon > 0)
            return true;
        if (this.graphicsWrapper?.shape !== ShapeEnum.CIRCLE)
            return true;
        return false;
    }

    public needArcs(): boolean {
        if ((this.coreElement.type !== "" && !(this.instances.type === "localgraph" && this.coreElement.type === "focused")) || this.managers.size === 0)
            return false;

        for (const [key, manager] of this.managers) {
            if (this.instances.settings.interactiveSettings[key].showOnGraph) {
                return true;
            }
        }

        return false;
    }

    protected createGraphicsWrapper(): void {
        if (!this.graphicsWrapper) {
            this.graphicsWrapper = new FileNodeGraphicsWrapper(this);
        }
        this.graphicsWrapper.createGraphics();
        this.graphicsWrapperScale = NodeShape.nodeScaleFactor(this.graphicsWrapper.shape);
    }

    // ============================== NODE COLOR ===============================

    protected override needToChangeColor() {
        return super.needToChangeColor() ||
            (this.instances.settings.enableFeatures[this.instances.type]["elements-stats"]
                && ExtendedGraphInstances.settings.nodesColorFunction !== "default")
            || this.needPropertyBasedColoring();
    }

    private needPropertyBasedColoring(): boolean {
        if (!this.instances.settings.enableFeatures[this.instances.type]['properties']) return false;
        for (const key of this.managers.keys()) {
            if (key === TAG_KEY || key === LINK_KEY || key === FOLDER_KEY) continue;
            if (this.instances.settings.interactiveSettings[key]?.useForNodeColor) return true;
        }
        return false;
    }

    protected override needToUpdateGraphicsColor(): boolean {
        return super.needToUpdateGraphicsColor()
            || !!this.graphicsWrapper.background
            || !!this.graphicsWrapper?.iconSprite;
    }

    protected override getFillColor(): GraphColorAttributes | undefined {
        const baseColor = super.getFillColor();

        if (baseColor) return baseColor;

        if ((this.instances.settings.enableFeatures[this.instances.type]["elements-stats"]
            && ExtendedGraphInstances.settings.nodesColorFunction !== "default")) {
            const rgb = (this.instances.nodesColorCalculator ?? ExtendedGraphInstances.graphsManager.vaultStatsManager.nodesColorCalculator)?.filesStats.get(this.id);
            if (rgb) return { rgb: rgb.value, a: 1 }
        }

        if (this.instances.type === "localgraph" && this.instances.settings.colorBasedOnDepth && this.instances.graphologyGraph?.graphology) {
            const maxDepth = 5;
            const depth = this.instances.graphologyGraph.graphology.getNodeAttribute(this.id, 'depth');
            if (depth && depth > 0) {
                const x = (depth - 1) / (maxDepth - 1);
                return { rgb: evaluateCMap(x, this.instances.settings.depthColormap, this.instances.settings), a: 1 };
            }
        }

        // Property-based coloring (priority 5)
        if (this.instances.settings.enableFeatures[this.instances.type]['properties']) {
            const propertyColors: number[] = [];
            for (const [key, manager] of this.managers) {
                if (key === TAG_KEY || key === LINK_KEY || key === FOLDER_KEY) continue;
                if (!this.instances.settings.interactiveSettings[key]?.useForNodeColor) continue;

                const types = this.types.get(key);
                if (types && types.size > 0) {
                    for (const type of types) {
                        const color = manager.getColor(type);
                        if (color) propertyColors.push(color);
                    }
                }
            }

            if (propertyColors.length > 0) {
                const blendedColor = blendMultiple(propertyColors);
                return { rgb: blendedColor, a: 1 };
            }
        }
    }
}
