import { Sprite, Texture, Text, ColorSource } from "pixi.js";
import { ExtendedGraphText, getBackgroundColor, GraphicsWrapper, ManagerGraphics } from "src/internal";

export class TextGraphicsWrapper implements GraphicsWrapper {
    extendedElement: ExtendedGraphText;
    pixiElement: Sprite;
    textClone: Text;
    name: string;
    managerGraphicsMap?: Map<string, ManagerGraphics> | undefined;

    constructor(extendedElement: ExtendedGraphText) {
        this.extendedElement = extendedElement;
        this.name = `text:${extendedElement.coreElement.id}`;
    }

    destroyGraphics() {
        if (this.pixiElement) {
            this.pixiElement.removeFromParent();
            if (!this.pixiElement.destroyed) this.pixiElement.destroy(true);
        }
        if (this.textClone) {
            this.textClone.removeFromParent();
            this.textClone.destroy(true);
            if (!this.textClone.destroyed) this.textClone.destroy(true);
        }
    }

    createGraphics(): void {
        this.addBackgroundToText();
    }

    clearGraphics(): void { }

    updateGraphics(): void { }

    connect(): void {
        const coreElement = this.extendedElement.coreElement;
        if (coreElement.text) {
            coreElement.text.addChild(this.pixiElement);
            coreElement.text.addChild(this.textClone);
        }
    }

    disconnect(): void {
        this.pixiElement.removeFromParent();
        this.textClone.removeFromParent();
    }

    private addBackgroundToText(): void {
        const coreElement = this.extendedElement.coreElement;
        if (!coreElement.text) return;

        if (!this.pixiElement || this.pixiElement.destroyed) this.pixiElement = new Sprite(Texture.WHITE);
        // Clone the text to create a second one
        if (!this.textClone || this.textClone.destroyed) this.textClone = new Text(coreElement.text.text, coreElement.getTextStyle());
        // Compute the size
        this.pixiElement.width = (this.textClone.getBounds().width + this.textClone.width) / 2;
        this.pixiElement.height = (this.textClone.getBounds().height + this.textClone.height) / 2;
        // Set the anchors in the middle, verticaly
        this.pixiElement.anchor.set(0.5, 0);
        this.textClone.anchor.set(0.5, 0);
        // Change the color
        this.pixiElement.tint = getBackgroundColor(coreElement.renderer);
        // Use a higher alpha than 1 in order to have a better opacity (which changes when hovering or zooming in/out)
        this.pixiElement.alpha = 2;

        // We need to create a clone text in order to bind the background to the core text element.
        // When we do that, we don't need to worry about transforms applied to the core text
        // but a parent is always behind its children, therefore the background covers the core text
        // Which is why we need to clone it and add the second text as a child too
    }

    updateBackgroundAfterTextChange() {
        const text = this.extendedElement.coreElement.text;
        if (!text) return;

        this.textClone.text = text.text;
        this.pixiElement.width = (this.textClone.getBounds().width + this.textClone.width) / 2;
        this.pixiElement.height = (this.textClone.getBounds().height + this.textClone.height) / 2;
    }

    updateTextBackgroundColor(backgroundColor: ColorSource): void {
        if (!this.pixiElement) return;
        this.pixiElement.tint = backgroundColor;
        if (this.textClone && this.extendedElement.coreElement.text) {
            this.textClone.style.fill = this.extendedElement.coreElement.getTextStyle().fill;
        }
    }
}