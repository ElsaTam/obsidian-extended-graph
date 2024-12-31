import { Graphics } from "pixi.js";
import { InteractiveManager } from "../interactiveManager";
import { ElementWrapper } from "./element";
import { NodeWrapper } from "./node";

export class ArcsWrapper extends ElementWrapper {
    // Static values
    static readonly nodeSize   = 200;
    static readonly thickness  = 0.09;
    static readonly inset      = 0.03;
    static readonly gap        = 0.2;
    static readonly maxArcSize = Math.PI / 2;

    // Instance values
    arcSize: number;
    circleLayer: number;
    graphics = new Map<string, {index: number, graphic: Graphics}>();

    /**
     * Creates an instance of ArcsWrapper.
     * @param nodeWrapper The associate node wrapper
     * @param types The types of the arcs
     * @param manager The interactive manager
     * @param circleLayer The layer of the circle
     */
    constructor(nodeWrapper: NodeWrapper, types: Set<string>, manager: InteractiveManager, circleLayer: number) {
        super(nodeWrapper.node.id, types, manager);
        this.circleLayer = circleLayer;
        this.initGraphics();
        this.updateGraphics();
    }

    clearGraphics(): void {
        for (const arc of this.graphics.values()) {
            arc.graphic.destroy();
        }
        this.removeChildren();
        this.graphics.clear();
    }

    /**
     * Initializes the graphics of the arcs.
     */
    initGraphics(): void {
        const allTypes = this.manager.getTypesWithoutNone();
        const nTags    = allTypes.length;
        this.arcSize   = Math.min(2 * Math.PI / nTags, ArcsWrapper.maxArcSize);

        for (const type of this.types) {
            const index = allTypes.findIndex(t => t === type);
            let arc = new Graphics();
            arc.name = this.getArcName(type);
            this.graphics.set(type, {index: index, graphic: arc});
            this.addChild(arc);
        }
    }

    /**
     * Updates the graphics of the arcs.
     */
    updateGraphics(): void {
        for (const type of this.types) {
            this.redrawArc(type);
        }
    }

    /**
     * Redraws the arc of a given type.
     * @param type The type of the arc
     * @param color The color of the arc
     */
    redrawArc(type: string, color?: Uint8Array) {
        let arc = this.graphics.get(type);
        if (!arc) return;

        if (!color) color = this.manager.getColor(type);
        
        const alpha      = arc.graphic.alpha;
        const radius     = (0.5 + (ArcsWrapper.thickness + ArcsWrapper.inset) * this.circleLayer) * ArcsWrapper.nodeSize;
        const startAngle = this.arcSize * arc.index + ArcsWrapper.gap * 0.5;
        const endAngle   = this.arcSize * (arc.index + 1) - ArcsWrapper.gap * 0.5;

        arc.graphic.clear();
        arc.graphic
            .lineStyle(ArcsWrapper.thickness * ArcsWrapper.nodeSize, color)
            .arc(0, 0, radius, startAngle, endAngle)
            .endFill();
        arc.graphic.alpha = alpha;
    }

    /**
     * Enables the arc of a given type.
     * @param type The type of the arc
     */
    enableType(type: string): void {
        let arc = this.graphics.get(type);
        (arc) && (arc.graphic.alpha = 1);
    }

    /**
     * Disables the arc of a given type.
     * @param type The type of the arc
     */
    disableType(type: string): void {
        let arc = this.graphics.get(type);
        (arc) && (arc.graphic.alpha = 0.1);
    }

    /**
     * Sets the types of the arcs.
     * @param types The types of the arcs
     */
    setTypes(types: Set<string>) {
        this.types = types;
    }

    isFullyDisabled(): boolean {
        for (const type of this.types) {
            if (this.manager.isActive(type)) return false;
        }
        return true;
    }

    getArcName(type: string) {
        return "arc-" + type;
    }
}