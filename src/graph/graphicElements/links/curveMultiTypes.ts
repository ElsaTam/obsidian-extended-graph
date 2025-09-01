import { IDestroyOptions } from "pixi.js";
import * as Color from '../../../colors/color-bits';
import { hex2int, smoothColorChange, lengthSegment, LINK_KEY, LinkCurveGraphics, ManagerGraphics, pixiColor2int, quadratic, tangentQuadratic } from "../../../internal";


export class LinkCurveMultiTypesGraphics extends LinkCurveGraphics implements ManagerGraphics {
    typesPositions: Record<string, { position: { x: number, y: number }, length: number }>;

    protected additionalConstruct() {
        this.typesPositions = {};
    }

    updateFrame(): boolean {
        this.typesPositions = {};
        if (!super.updateFrame()) return false;

        const renderer = this.extendedLink.coreElement.renderer;

        let arrowColor: Color.Color | undefined;
        const thickness = this.extendedLink.getThicknessScale() * renderer.fLineSizeMult / renderer.scale;

        let P0_ = { x: this.bezier.P0.x, y: this.bezier.P0.y };
        let P1 = { x: this.bezier.P1.x, y: this.bezier.P1.y };
        const activeTypes = [...this.types].filter(type => this.manager.isActive(type));

        if (this.extendedLink.isHighlighted()) {
            this.lineStyle({ width: thickness, color: "white" });
            this.moveTo(this.bezier.P0.x, this.bezier.P0.y).quadraticCurveTo(this.bezier.P1.x, this.bezier.P1.y, this.bezier.P2.x, this.bezier.P2.y);
            this.tint = (
                this.extendedLink.coreElement.line?.worldVisible
                    ? this.extendedLink.coreElement.line.tint
                    : this.extendedLink.siblingLink?.coreElement.line?.tint
            ) ?? smoothColorChange(this.tint as Color.Color, this.extendedLink.coreElement.renderer.colors.lineHighlight.rgb);
            if (this.extendedLink.instances.settings.displayLinkTypeLabel) {
                if (activeTypes.length === 1) {
                    this.setTypePosition(activeTypes[0], this.bezier.P0, this.bezier.P1, this.bezier.P2);
                }
                else if (activeTypes.length > 0) {
                    let i = 0;
                    for (const type of activeTypes) {
                        const [bezierA, bezierB] = this.deCasteljau([P0_, P1, this.bezier.P2], 1 / (activeTypes.length - i));
                        P0_ = bezierB[0];
                        P1 = bezierB[1];
                        this.setTypePosition(type, bezierA[0], bezierA[1], bezierA[2]);
                        ++i;
                    }
                }
            }
        }
        else {
            arrowColor = this.color;
            // Compute one bezier curve for each type
            // with the De Casteljau algorithm, considering the full
            // curbe with control points P0_, P1, P2_.
            if (activeTypes.length === 1) {
                this.lineStyle({ width: thickness, color: "white" });
                this.moveTo(this.bezier.P0.x, this.bezier.P0.y).quadraticCurveTo(this.bezier.P1.x, this.bezier.P1.y, this.bezier.P2.x, this.bezier.P2.y);
                this.setTypePosition(activeTypes[0], this.bezier.P0, this.bezier.P1, this.bezier.P2);
                this.tint = this.color;
            }
            else if (activeTypes.length > 0) {
                this.tint = "white";
                let i = 0;
                this.moveTo(this.bezier.P0.x, this.bezier.P0.y);
                for (const type of activeTypes) {
                    const [bezierA, bezierB] = this.deCasteljau([P0_, P1, this.bezier.P2], 1 / (activeTypes.length - i));
                    P0_ = bezierB[0];
                    P1 = bezierB[1];

                    // Draw bezierA
                    const color = this.extendedLink.instances.settings.interactiveSettings[LINK_KEY].showOnGraph ? this.manager.getColor(type) : this.color;
                    this.lineStyle({ width: thickness, color: color });
                    this.quadraticCurveTo(bezierA[1].x, bezierA[1].y, bezierA[2].x, bezierA[2].y);
                    this.setTypePosition(type, bezierA[0], bezierA[1], bezierA[2]);
                    ++i;
                }
                if (this.extendedLink.instances.settings.interactiveSettings[LINK_KEY].showOnGraph) {
                    arrowColor = this.manager.getColor(activeTypes[activeTypes.length - 1]);
                }
            }
            if (this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows']
                && this.extendedLink.instances.settings.arrowColorBool
                && this.extendedLink.instances.settings.arrowColor !== "") {
                arrowColor = hex2int(this.extendedLink.instances.settings.arrowColor);
            }
        }


        // Arrow
        this.updateArrow(
            arrowColor ?? pixiColor2int(this.tint),
            -Math.atan(-tangentQuadratic(1, P0_, P1, this.bezier.P2).m)
        );

        return true;
    }

    private setTypePosition(type: string, P0: { x: number, y: number }, P1: { x: number, y: number }, P2: { x: number, y: number }): void {
        this.typesPositions[type] = {
            position: quadratic(0.5, P0, P1, P2),
            length: lengthSegment(1, P0, P2)
        };
    }

    private deCasteljau(points: { x: number, y: number }[], t: number): { x: number, y: number }[][] {
        if (t === 0 || t === 1) {
            return [points, points];
        }

        let bezierA: { x: number, y: number }[] = [];
        let bezierB: { x: number, y: number }[] = [];
        bezierA.push(points[0]);
        bezierB.push(points[points.length - 1]);
        while (points.length > 1) {
            let midpoints: { x: number, y: number }[] = [];
            for (let i = 0; i + 1 < points.length; ++i) {
                let ax = points[i].x;
                let ay = points[i].y;
                let bx = points[i + 1].x;
                let by = points[i + 1].y;
                // a * (1-t) + b * t = a + (b - a) * t
                midpoints.push({
                    x: ax + (bx - ax) * t,
                    y: ay + (by - ay) * t,
                });
            }
            bezierA.push(midpoints[0]);
            bezierB.push(midpoints[midpoints.length - 1]);
            points = midpoints;
        }
        return [bezierA, bezierB.reverse()];
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