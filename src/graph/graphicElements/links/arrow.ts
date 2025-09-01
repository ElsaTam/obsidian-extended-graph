import { ColorSource, Graphics } from "pixi.js";
import { ExtendedGraphLink } from "../../../internal";

export class LinkArrow extends Graphics {
    extendedLink: ExtendedGraphLink;

    constructor(extendedLink: ExtendedGraphLink) {
        super();

        this.eventMode = "none";
        this.extendedLink = extendedLink;
        this.init();
    }

    init() {
        if (this.destroyed) return;

        this.beginFill("white");
        this.moveTo(0, 0);
        this.lineTo(-4, -2);
        if (!this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows'] || !this.extendedLink.instances.settings.flatArrows) {
            this.lineTo(-3, 0);
        }
        this.lineTo(-4, 2);
        this.lineTo(0, 0);
        this.endFill();
        this.name = "arrow";
        this.zIndex = 1;
        this.pivot.set(0, 0);
        this.alpha = this.extendedLink.coreElement.renderer.colors.arrow.a;
        if (this.extendedLink.coreElement.arrow) this.extendedLink.coreElement.arrow.renderable = false;
    }

    update(color: ColorSource, position: { x: number, y: number }, rotation: number) {
        let alpha: number = this.extendedLink.coreElement.arrow?.alpha ?? 1;
        if (this.extendedLink.instances.settings.enableFeatures[this.extendedLink.instances.type]['arrows']
            && this.extendedLink.instances.settings.alwaysOpaqueArrows) {
            if (this.extendedLink.isHighlighted()
                || !this.extendedLink.coreElement.renderer.getHighlightNode()) {
                alpha = 1;
            }
        }

        const link = this.extendedLink.coreElement;
        this.tint = color;
        this.alpha = alpha;
        this.position.set(position.x, position.y);
        this.rotation = rotation;
        this.scale.set((this.extendedLink.instances.settings.arrowFixedSize
            ? 2 * Math.sqrt(link.renderer.fLineSizeMult) * link.renderer.nodeScale
            : 2 * Math.sqrt(link.renderer.fLineSizeMult) / link.renderer.scale)
            * this.extendedLink.instances.settings.arrowScale
        );
    }
}