import { Graphics, Sprite, Texture } from "pixi.js";
import { NodeShape, pixiAddChild, ShapeEnum } from "../../../internal";

export class NodeImage extends Sprite {
    opacityLayer: Graphics;
    textureSize: number;
    hasFaded: boolean = false;

    constructor(texture: Texture = Texture.EMPTY, borderFactor: number, shape: ShapeEnum) {
        super(texture);
        this.textureSize = Math.min(texture.width, texture.height);

        this.name = "image";
        this.anchor.set(0.5);

        // Mask
        const mask = new NodeShape(shape).drawMask();
        this.mask = mask;
        pixiAddChild(this, mask);

        // Size
        const scaleNoBorder = 2 * 100 * NodeShape.getSizeFactor(shape) / this.textureSize;
        const scaleBorder = scaleNoBorder * (1 - borderFactor);

        this.scale.set(scaleBorder);
        mask.scale.set(mask.getDrawingResolution() / scaleNoBorder);
    }

    changeImage(texture: Texture) {
        this.texture = texture;
    }
}