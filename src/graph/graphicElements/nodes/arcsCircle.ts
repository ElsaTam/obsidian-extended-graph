import { Graphics } from "pixi.js";
import * as Color from '../../../colors/color-bits';
import { ExtendedGraphNode, getFile, getNumberOfFileInteractives, InteractiveManager, ManagerGraphics, NodeShape, pixiAddChild, ShapeEnum } from "../../../internal";

export class Arc {
    type: string;
    index: number;
    graphic: Graphics;
    color: Color.Color;
    startAngle: number;
    endAngle: number;
    size: number;
    weight: number;
}

export class ArcsCircle extends Graphics implements ManagerGraphics {
    // Static values
    static readonly thickness = 0.09;
    static readonly inset = 0.03;
    static readonly gap = 0.2;
    static readonly maxArcSize = Math.PI / 2;

    // Instance interface values
    extendedNode: ExtendedGraphNode;
    manager: InteractiveManager;
    types: Set<string>
    name: string;

    // Instance values
    radius: number;
    thickness: number;
    circleLayer: number;
    graphics = new Map<string, Arc>();
    shape: ShapeEnum;

    /**
     * Creates an instance of ArcsWrapper.
     * @param types - The types of the arcs
     * @param manager - The interactive manager
     * @param circleLayer - The layer of the circle
     */
    constructor(extendedNode: ExtendedGraphNode, types: Set<string>, manager: InteractiveManager, circleLayer: number, shape: ShapeEnum) {
        super();
        this.eventMode = "none";
        this.name = manager.name;
        this.extendedNode = extendedNode;
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

        const arcSize = Math.min(2 * Math.PI / nTags, ArcsCircle.maxArcSize);
        this.radius = (0.5 + (ArcsCircle.thickness + ArcsCircle.inset) * this.circleLayer) * NodeShape.getSizeFactor(this.shape) * NodeShape.RADIUS * 2;
        this.thickness = ArcsCircle.thickness * NodeShape.getSizeFactor(this.shape) * NodeShape.RADIUS * 2;

        for (const type of this.types) {
            const settings = this.manager.instances.settings.interactiveSettings[this.manager.name];
            const isSentinel = type === settings.noneType || (settings.undefinedType && type === settings.undefinedType);
            // Skip sentinel types unless they have a user-defined color
            if (isSentinel && !this.manager.hasSentinelColorSetting(type)) continue;
            const index = allTypes.findIndex(t => t === type);
            let arc = this.graphics.get(type);
            if (!arc) {
                arc = new Arc();
                arc.type = type;
                arc.index = index;
                arc.size = arcSize;
                arc.graphic = new Graphics();
                arc.graphic.eventMode = "none";
                arc.graphic.name = this.getArcName(type);
                arc.color = this.manager.getColor(type);
                arc.weight = 1;
                if (this.manager.instances.settings.spreadArcs
                    && this.manager.instances.settings.weightArcs
                ) {
                    const file = getFile(this.extendedNode.id);
                    if (file) {
                        arc.weight = getNumberOfFileInteractives(this.manager.name, file, type);
                    }
                }
                this.graphics.set(type, arc);
                pixiAddChild(this, arc.graphic);
            }
            else {

            }
        }

        for (const type of this.types) {
            this.redrawType(type);
        }
    }

    private redrawType(type: string, color?: Color.Color) {
        const arc = this.graphics.get(type);
        if (!arc) return;

        if (color) arc.color = color;

        if (this.manager.instances.settings.spreadArcs) {
            const activeTypes = [...this.types].filter(t => this.manager.isActive(t));
            const totalWeight = activeTypes.reduce((acc, type) => acc + (this.graphics.get(type)?.weight || 0), 0);
            const typesBefore = activeTypes.slice(0, activeTypes.indexOf(type));
            arc.size = arc.weight * 2 * Math.PI / totalWeight;
            arc.index = typesBefore.reduce((acc, t) => acc + (this.graphics.get(t)?.weight || 0), 0);
            const addGap = [...this.types].some(t => t !== type && this.manager.isActive(t));
            arc.startAngle = 2 * Math.PI / totalWeight * arc.index;
            arc.endAngle = arc.startAngle + arc.size;
            if (addGap) {
                const length = arc.endAngle - arc.startAngle;
                arc.startAngle += Math.min(length * 0.1, ArcsCircle.gap * 0.5);
                arc.endAngle -= Math.min(length * 0.1, ArcsCircle.gap * 0.5);
            }
        }
        else {
            arc.startAngle = arc.size * arc.index;// + ArcsCircle.gap * 0.5;
            arc.endAngle = arc.size * (arc.index + 1);// - ArcsCircle.gap * 0.5;
            const length = arc.endAngle - arc.startAngle;
            arc.startAngle += Math.min(length * 0.1, ArcsCircle.gap * 0.5);
            arc.endAngle -= Math.min(length * 0.1, ArcsCircle.gap * 0.5);
        }

        arc.graphic.clear();
        arc.graphic
            .lineStyle(this.thickness, arc.color)
            .arc(0, 0, this.radius, arc.startAngle, arc.endAngle)
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
        if (this.manager.instances.settings.spreadArcs) {
            this.updateValues();
        }
        else {
            const arc = this.graphics.get(type);
            if (arc) arc.graphic.alpha = enable ? 1 : 0.1;
        }
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