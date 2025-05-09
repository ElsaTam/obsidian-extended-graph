import { Graphics } from "pixi.js";
import { InteractiveManager, ManagerGraphics, NodeShape, ShapeEnum } from "src/internal";

export class ArcsCircle extends Graphics implements ManagerGraphics {
    // Static values
    static readonly thickness = 0.09;
    static readonly inset = 0.03;
    static readonly gap = 0.2;
    static readonly maxArcSize = Math.PI / 2;

    // Instance interface values
    manager: InteractiveManager;
    types: Set<string>
    name: string;

    // Instance values
    arcSize: number;
    circleLayer: number;
    graphics = new Map<string, { index: number, graphic: Graphics }>();
    shape: ShapeEnum;

    /**
     * Creates an instance of ArcsWrapper.
     * @param types - The types of the arcs
     * @param manager - The interactive manager
     * @param circleLayer - The layer of the circle
     */
    constructor(types: Set<string>, manager: InteractiveManager, circleLayer: number, shape: ShapeEnum) {
        super();
        this.name = manager.name;
        this.types = types;
        this.manager = manager;
        this.circleLayer = circleLayer;
        this.shape = shape;
        this.updateValues();
    }

    clearGraphics(): void {
        for (const arc of this.graphics.values()) {
            arc.graphic.destroy();
        }
        this.removeChildren();
        this.graphics.clear();
    }

    /**
     * Updates the graphics of the arcs.
     */
    updateValues(): void {
        const allTypes = this.manager.getTypesWithoutNone();
        const nTags = allTypes.length;
        this.arcSize = Math.min(2 * Math.PI / nTags, ArcsCircle.maxArcSize);

        for (const type of this.types) {
            if (type === this.manager.instances.settings.interactiveSettings[this.manager.name].noneType) continue;
            const index = allTypes.findIndex(t => t === type);
            let arc = this.graphics.get(type);
            if (!arc) {
                arc = {
                    index: index,
                    graphic: new Graphics()
                }
                arc.graphic.name = this.getArcName(type);
                this.graphics.set(type, arc);
                this.addChild(arc.graphic);
            }
            else {

            }

            this.redrawType(type);
        }
    }

    private redrawType(type: string, color?: Uint8Array) {
        const arc = this.graphics.get(type);
        if (!arc) return;

        if (!color) color = this.manager.getColor(type);

        const radius = (0.5 + (ArcsCircle.thickness + ArcsCircle.inset) * this.circleLayer) * NodeShape.getSizeFactor(this.shape) * NodeShape.RADIUS * 2;
        const startAngle = this.arcSize * arc.index + ArcsCircle.gap * 0.5;
        const endAngle = this.arcSize * (arc.index + 1) - ArcsCircle.gap * 0.5;

        arc.graphic.clear();
        arc.graphic
            .lineStyle(ArcsCircle.thickness * NodeShape.getSizeFactor(this.shape) * NodeShape.RADIUS * 2, color)
            .arc(0, 0, radius, startAngle, endAngle)
            .endFill();
        arc.graphic.alpha = this.manager.isActive(type) ? 1 : 0.1;
    }

    updateFrame(): void { }

    /**
     * Toggles the arc of a given type.
     * @param type The type of the arc
     * @param enable Whether to enable the arc
     */
    toggleType(type: string, enable: boolean): void {
        const arc = this.graphics.get(type);
        if (arc) arc.graphic.alpha = enable ? 1 : 0.1;
    }

    /**
     * Sets the types of the arcs.
     * @param types The types of the arcs
     */
    setTypes(types: Set<string>) {
        this.types = types;
    }

    getArcName(type: string) {
        return "arc-" + type;
    }
}