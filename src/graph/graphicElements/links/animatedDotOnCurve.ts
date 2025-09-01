import { Graphics } from "pixi.js";
import { ExtendedGraphLink, ExtendedGraphInstances, quadratic } from "../../../internal";

export class AnimatedDotOnCurve extends Graphics {
    extendedLink: ExtendedGraphLink;
    t: number = 0;

    constructor(extendedLink: ExtendedGraphLink) {
        super();

        this.eventMode = "none";
        this.extendedLink = extendedLink;
        this.init();
    }

    private init(): void {
        this.alpha = 0;
        this.beginFill(this.extendedLink.getStrokeColor(true) || this.extendedLink.coreElement.renderer.colors.lineHighlight.rgb);
        this.drawCircle(0, 0, 3);
        this.endFill();
    }

    updateFrame(bezier: { P0: { x: number, y: number }, P1: { x: number, y: number }, P2: { x: number, y: number } }): void {
        this.alpha = 1;

        const P = quadratic(this.t, bezier.P0, bezier.P1, bezier.P2);
        this.position.set(P.x, P.y);
        this.scale.set(this.extendedLink.coreElement.renderer.fLineSizeMult / Math.sqrt(this.extendedLink.coreElement.renderer.scale));

        this.t += 0.01 * ExtendedGraphInstances.settings.animationSpeedForDots;
        if (this.t > 1) {
            this.t = 0;
        }
    }
}