import { ColorSource, Graphics, Sprite, Texture } from "pixi.js";

export class NodeImage extends Sprite {
    borderFactor: number = 0.06;
    circleRadius: number = 10;
    opacityLayer: Graphics;
    textureSize: number;

    constructor(texture: Texture = Texture.EMPTY) {
        super(texture);
        this.textureSize = Math.min(texture.width, texture.height);

        this.width = 10;
        this.height = 10;
        this.name = "image";
        this.anchor.set(0.5);
        
        // Mask
        const mask = new Graphics()
            .beginFill(0xFFFFFF)
            .drawCircle(0, 0, this.circleRadius)
            .endFill();
        mask.width = this.textureSize;
        mask.height = this.textureSize;
        this.mask = mask;
        this.addChild(mask);

        // Opacity Layer
        this.opacityLayer = new Graphics();
        this.opacityLayer.width = this.textureSize;
        this.opacityLayer.height = this.textureSize;
        this.updateOpacityLayerColor(0xFF0000);
        this.opacityLayer.alpha = 0;
        this.addChild(this.opacityLayer);

        // Size
        this.scale.set(200 * (1 - this.borderFactor) / this.textureSize);
    }

    changeImage(texture: Texture) {
        this.texture = texture;
    }

    updateOpacityLayerColor(backgroundColor: ColorSource): void {
        this.opacityLayer.clear();
        this.opacityLayer
            .beginFill(backgroundColor)
            .drawRect(-0.5 * this.textureSize, -0.5 * this.textureSize, this.textureSize, this.textureSize)
            .endFill();
    }

    fadeIn() {
        this.opacityLayer.alpha = 0;
    }

    fadeOut() {
        this.opacityLayer.alpha = 0.8;
    }
}