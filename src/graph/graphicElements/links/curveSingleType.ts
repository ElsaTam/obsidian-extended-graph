import { IDestroyOptions } from "pixi.js";
import * as Color from '../../../colors/color-bits';
import { hex2int, LinkCurveGraphics, ManagerGraphics, pixiColor2int, smoothColorChange, tangentQuadratic } from "../../../internal";


export class LinkCurveSingleTypeGraphics extends LinkCurveGraphics implements ManagerGraphics {
    arrowColor?: Color.Color;

    override updateValues(): void {
        this.arrowColor = this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows']
            && this.extendedLink.instances.settings.arrowColorBool
            && this.extendedLink.instances.settings.arrowColor !== ""
            ? hex2int(this.extendedLink.instances.settings.arrowColor) : undefined
        super.updateValues();
    }
    updateFrame(): boolean {
        if (!super.updateFrame()) return false;

        const renderer = this.extendedLink.coreElement.renderer;

        this.lineStyle({ width: this.extendedLink.getThicknessScale() * renderer.fLineSizeMult / renderer.scale, color: "white" });
        this.moveTo(this.bezier.P0.x, this.bezier.P0.y).quadraticCurveTo(this.bezier.P1.x, this.bezier.P1.y, this.bezier.P2.x, this.bezier.P2.y);
        if (this.extendedLink.isHighlighted()) {
            this.tint = (
                this.extendedLink.coreElement.line?.worldVisible
                    ? this.extendedLink.coreElement.line.tint
                    : this.extendedLink.siblingLink?.coreElement.line?.tint
            ) ?? smoothColorChange(this.tint as Color.Color, this.extendedLink.coreElement.renderer.colors.lineHighlight.rgb);
        }
        else {
            this.tint = this.color;
        }

        // Arrow
        this.updateArrow(
            this.arrowColor ?? pixiColor2int(this.tint),
            -Math.atan(-tangentQuadratic(1, this.bezier.P0, this.bezier.P1, this.bezier.P2).m)
        )

        return true;
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