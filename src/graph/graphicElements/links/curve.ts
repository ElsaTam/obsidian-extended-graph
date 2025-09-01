import { IDestroyOptions, Graphics } from "pixi.js";
import * as Color from '../../../colors/color-bits';
import { ExtendedGraphLink, InteractiveManager, lengthQuadratic, LinkArrow, ManagerGraphics, pixiAddChild, pixiColor2int, quadratic } from "../../../internal";


export abstract class LinkCurveGraphics extends Graphics implements ManagerGraphics {
    manager: InteractiveManager;
    types: Set<string>;
    name: string;
    hasFaded: boolean;
    color: Color.Color;
    extendedLink: ExtendedGraphLink;
    arrow: LinkArrow | null;
    activeType: string | undefined;
    bezier: { P0: { x: number, y: number }, P1: { x: number, y: number }, P2: { x: number, y: number } };

    constructor(manager: InteractiveManager, types: Set<string>, name: string, link: ExtendedGraphLink) {
        super();
        this.eventMode = "none";
        this.manager = manager;
        this.types = types;
        this.name = "curve:" + name;
        this.extendedLink = link;
        this.bezier = {
            P0: { x: 0, y: 0 }, // Center of source
            P1: { x: 0, y: 0 }, // Control point, shifted along the normal
            P2: { x: 0, y: 0 } // Center of target
        };
        this.hasFaded = !this.extendedLink.instances.settings.fadeInElements;
        this.additionalConstruct();
        this.updateValues();
    }

    protected additionalConstruct(): void { };

    updateValues(): void {
        this.activeType = this.extendedLink.getActiveType(this.manager.name);
        if (!this.activeType) return;
        const overrideColor = this.extendedLink.getStrokeColor();
        if (overrideColor !== undefined) {
            this.color = overrideColor;
        }
        else if (this.extendedLink.instances.settings.interactiveSettings[this.manager.name].showOnGraph) {
            this.color = this.manager.getColor(this.activeType);
        }
        else if (this.extendedLink.coreElement.line) {
            this.color = pixiColor2int(this.extendedLink.coreElement.line.tint)
        }
        else {
            this.color = this.extendedLink.coreElement.renderer.colors.line.rgb;
        }
        this.redraw();
    }

    protected initArrow() {
        if (this.destroyed) return;
        this.arrow = new LinkArrow(this.extendedLink);
        pixiAddChild(this, this.arrow);
    }

    protected redraw(): void {
        if (!this.activeType && this.arrow) {
            this.arrow.clear();
            this.arrow.destroy();
            this.arrow = null;
        }
        this.updateFrame();
    }

    protected computeMainBezier(): boolean {
        if (this.destroyed) return false;

        this.clear();
        const renderer = this.extendedLink.coreElement.renderer;
        const link = this.extendedLink.coreElement;

        const inverted = this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows'] && this.extendedLink.instances.settings.invertArrows;
        const target = inverted ? link.source : link.target;
        const source = inverted ? link.target : link.source;

        if (!target.circle || !source.circle) {
            this.destroy();
            //this.extendedLink.disable();
            return false;
        }

        const f = renderer.nodeScale;
        const dx = target.x - source.x;
        const dy = target.y - source.y;

        this.bezier.P1 = { // Control point, shifted along the normal
            x: (source.x + target.x) * 0.5 + dy * 0.2 * this.extendedLink.instances.settings.curvedFactor,
            y: (source.y + target.y) * 0.5 - dx * 0.2 * this.extendedLink.instances.settings.curvedFactor
        };

        const L = lengthQuadratic(1, source, this.bezier.P1, target); // length of the arc between centers
        this.bezier.P0 = quadratic(0.9 * source.getSize() * f / L, source, this.bezier.P1, target); // point on the border of the source node, along the arc.
        this.bezier.P2 = quadratic(1 - 0.9 * target.getSize() * f / L, source, this.bezier.P1, target); // point on the border of the target node, along the arc

        return true;
    }

    getMiddlePoint() {
        return quadratic(0.5, this.bezier.P0, this.bezier.P1, this.bezier.P2);
    }

    updateFrame(): boolean {
        if (!this.computeMainBezier()) return false;

        const link = this.extendedLink.coreElement;
        if (link.line && this.hasFaded) {
            this.alpha = link.line.alpha;
        }

        return true;
    }

    protected updateArrow(color: Color.Color, rotation: number) {
        if (this.extendedLink.coreElement.arrow && this.extendedLink.coreElement.arrow.visible) {
            if (!this.arrow) {
                this.initArrow();
            }

            this.arrow?.update(
                color,
                this.bezier.P2,
                rotation + (this.bezier.P1.x > this.bezier.P2.x ? Math.PI : 0)
            )
        }
        else {
            this.arrow?.removeFromParent();
            this.arrow?.clear();
            this.arrow?.destroy();
            this.arrow = null;
        }

    }

    override destroy(options?: IDestroyOptions): void {
        if (this.extendedLink.coreElement.arrow) this.extendedLink.coreElement.arrow.renderable = true;

        if (this.destroyed) return;
        super.destroy(options);
    }

    clearGraphics(): void {
        if (this.destroyed) return;

        this.arrow?.clear();
        this.clear();
        this.destroy({ children: true });
        this.removeFromParent();
    }

    override clear(): this {
        if (this.destroyed) return this;
        return super.clear();
    }

    toggleType(type: string, enable: boolean): void {
        this.updateValues();
    }
}