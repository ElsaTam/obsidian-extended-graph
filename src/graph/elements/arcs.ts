import { Graphics } from "pixi.js";
import { InteractiveManager } from "../interactiveManager";
import { ElementWrapper } from "./element";
import { NodeWrapper } from "./node";

export class ArcsWrapper extends ElementWrapper {
    nodeSize: number = 200;
    thickness: number = 0.09;
    inset: number = 0.03;
    gap: number = 0.2;
    maxArcSize: number = Math.PI / 2;
    arcSize: number;
    circleLayer: number;
    graphics = new Map<string, {index: number, graphic: Graphics}>();

    constructor(nodeWrapper: NodeWrapper, types: Set<string>, manager: InteractiveManager, circleLayer: number) {
        super(nodeWrapper.node.id, types, manager);
        this.circleLayer = circleLayer;
        this.initGraphics();
        this.updateGraphics();
    }

    clearGraphics() : void {
        for (const [type, arc] of this.graphics) {
            arc.graphic.destroy();
        }
        this.removeChildren();
        this.graphics.clear();
    }

    initGraphics() : void {
        const allTypes = this.manager.getTypesWithoutNone();
        const nTags = allTypes.length;
        this.arcSize = Math.min(2 * Math.PI / nTags, this.maxArcSize);

        for (const type of this.types) {
            const index = allTypes.findIndex(t => t === type);
            let arc = new Graphics();
            arc.name = this.getArcName(type);
            this.graphics.set(type, {index: index, graphic: arc});
            this.addChild(arc);
        }
    }

    updateGraphics(): void {
        for (const type of this.types) {
            this.redrawArc(type);
        }
    }

    redrawArc(type: string, color?: Uint8Array) {
        let arc = this.graphics.get(type);
        if (!arc) return;

        if (!color) color = this.manager.getColor(type);
        
        const alpha = arc.graphic.alpha;
        arc.graphic.clear();
        arc.graphic.lineStyle(this.thickness * this.nodeSize, color)
            .arc(
                0, 0,
                (0.5 + (this.thickness + this.inset) * this.circleLayer) * this.nodeSize,
                this.arcSize * arc.index + this.gap * 0.5,
                this.arcSize * (arc.index + 1) - this.gap * 0.5
            )
            .endFill();
        arc.graphic.alpha = alpha;
    }

    enableType(type: string) : void {
        let arc = this.graphics.get(type);
        (arc) && (arc.graphic.alpha = 1);
    }

    disableType(type: string) : void {
        let arc = this.graphics.get(type);
        (arc) && (arc.graphic.alpha = 0.1);
    }

    setTypes(types: Set<string>) {
        this.types = types;
    }

    fadeIn() {
        for (const type of this.types) {
            if (this.manager.isActive(type)) {
                this.enableType(type);
            }
            else {
                this.disableType(type);
            }
        }
    }

    fadeOut() {
        for (const [type, arc] of this.graphics) {
            arc.graphic.alpha = 0.1;
        }
    }

    isFullyDisabled() : boolean {
        for (const type of this.types) {
            if (this.manager.isActive(type)) return false;
        }
        return true;
    }

    getArcName(type: string) {
        return "arc-" + type;
    }
}