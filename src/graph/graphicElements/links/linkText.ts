import { DropShadowFilter } from "@pixi/filter-drop-shadow";
import {
    CSSBridge,
    CSSLinkLabelStyle,
    ExtendedGraphLink,
    fadeIn,
    LINK_KEY,
    LinkCurveGraphics,
    LinkCurveMultiTypesGraphics,
    LinkLineMultiTypesGraphics,
    pixiAddChild,
    pixiAddChildAt,
    textStyleFill2int
} from "../../../internal";
import * as Color from "../../../colors/color-bits";
import { BitmapFont, BitmapText, ColorSource, Container, Graphics, IBitmapTextStyle, Sprite, Text, TextMetrics, TextStyle, TextStyleFill, Texture } from "pixi.js";

export abstract class LinkText extends Container {
    extendedLink: ExtendedGraphLink;
    background?: Graphics | Sprite;
    type: string;
    text: Text | BitmapText;
    textColor?: TextStyleFill | null;
    isRendered: boolean;
    style: CSSLinkLabelStyle;
    hasFaded: boolean;

    constructor(text: string, extendedLink: ExtendedGraphLink) {
        super();
        this.type = text;
        this.extendedLink = extendedLink;
        this.hasFaded = !this.extendedLink.instances.settings.fadeInElements;
        this.zIndex = 2;

        this.computeCSSStyle();

        if (this.extendedLink.instances.settings.useBitmapsForLinkLabels) {
            this.text = new BitmapText(this.type, this.getBitmapTextStyle());
            this.setTextAnchor();
        }
        else {
            this.text = new Text(text, this.getTextStyle());
            this.setTextAnchor();
        }
        this.updateTextColor();
        this.text.eventMode = "none";
        this.text.resolution = 2;

        if (this.needsGraphicsBackground()) {
            this.background = new Graphics();
            this.background.eventMode = "none";
            pixiAddChild(this, this.background, this.text);
        }
        else if (this.needsSpriteBackground()) {
            this.background = new Sprite(Texture.WHITE);
            this.background.eventMode = "none";
            pixiAddChild(this, this.background, this.text);
        }
        else {
            pixiAddChild(this, this.text);
        }

        this.applyCSSChanges();
    }

    // ============================== BACKGROUND ===============================

    updateTextBackgroundColor(backgroundColor: ColorSource): void {
        if (this.destroyed) return;
        if (this.background instanceof Sprite) {
            this.background.tint = backgroundColor;
        }
        else {
            this.drawGraphics(backgroundColor);
        }
        this.updateTextColor();
    }

    private needsGraphicsBackground(): boolean {
        return this.style.borderWidth > 0 || this.style.radius > 0;
    }

    private needsSpriteBackground(): boolean {
        return !this.needsGraphicsBackground() && this.style.backgroundColor.a > 0;
    }

    private getWidth(): number {
        const additionalWidth = this.style.padding.left + this.style.padding.right;
        if (this.text instanceof BitmapText) {
            return this.text.textWidth + additionalWidth;
        }

        return TextMetrics.measureText(this.text.text, this.text.style).width + additionalWidth;
    }

    private getHeight(): number {
        const additionalHeight = this.style.padding.top + this.style.padding.bottom - (this.style.textStyle.stroke?.width ?? 0);
        if (this.text instanceof BitmapText) {
            return this.text.height + additionalHeight;
        }

        return TextMetrics.measureText(this.text.text, this.text.style).height + additionalHeight;
    }

    private drawGraphics(backgroundColor: ColorSource): void {
        if (this.background instanceof Sprite) {
            this.background.removeFromParent();
            this.background.destroy();
            this.background = new Graphics();
            this.background.eventMode = "none";
            pixiAddChildAt(this, this.background, 0);
        }
        if (!this.background) {
            this.background = new Graphics();
            this.background.eventMode = "none";
            pixiAddChildAt(this, this.background, 0);
        }
        this.background.clear();
        const lineColor = this.style.borderColor.a > 0 ? this.style.borderColor.rgb : this.extendedLink.managers.get(LINK_KEY)?.getColor(this.text.text) ?? this.extendedLink.coreElement.renderer.colors.line.rgb;
        if (this.style.backgroundColor.a > 0) {
            backgroundColor = CSSBridge.colorAttributes2hex(this.style.backgroundColor);
        }
        this.background.lineStyle(this.style.borderWidth, lineColor, 1, 1)
            .beginFill(backgroundColor)
            .drawRoundedRect(0, 0, this.getWidth(), this.getHeight(), this.style.radius);
    }

    private drawSprite(): void {
        if (this.background instanceof Graphics) {
            this.background.removeFromParent();
            this.background.destroy();
            this.background = new Sprite(Texture.WHITE);
            this.background.eventMode = "none";
            pixiAddChildAt(this, this.background, 0);
        }
        if (!this.background) {
            this.background = new Sprite(Texture.WHITE);
            this.background.eventMode = "none";
            pixiAddChildAt(this, this.background, 0);
        }
        this.background.tint = this.style.backgroundColor.rgb;
        this.background.alpha = this.style.backgroundColor.a;
        this.background.width = this.getWidth();
        this.background.height = this.getHeight();
    }

    // ======================== BIND TO THE GRAPH VIEW =========================

    connect() {
        if (this.destroyed) return;
        pixiAddChild(this.extendedLink.coreElement.renderer.hanger, this);
        if (this.extendedLink.instances.settings.fadeInElements && !this.hasFaded) {
            fadeIn(this);
        }
    }

    updateFrame(): boolean {
        if (this.destroyed) return false;

        if (!this.isRendered || !this.extendedLink.managers.get(LINK_KEY)?.isActive(this.text.text) || !this.parent || this.extendedLink.coreElement.renderer.textAlpha <= 0.001) {
            this.visible = false;
            return false;
        }

        this.alpha = this.extendedLink.coreElement.renderer.textAlpha;

        this.visible = true;

        if (this.extendedLink.coreElement.source.circle) {
            this.scale.x = this.scale.y = this.extendedLink.coreElement.renderer.nodeScale;
            this.pivot.set(
                0.5 * this.width / this.scale.x,
                0.5 * this.height / this.scale.y
            );
        }

        return true;
    }

    private setTextAnchor() {
        if (this.style.textStyle.stroke) {
            const height = this.text instanceof BitmapText ? this.text.height : TextMetrics.measureText(this.text.text, this.text.style).height;
            const width = this.text instanceof BitmapText ? this.text.width : TextMetrics.measureText(this.text.text, this.text.style).width;
            this.text.anchor.set(this.style.textStyle.stroke.width / width, this.style.textStyle.stroke.width / height);
        }
        else {
            this.text.anchor.set(0, 0);
        }
    }

    private setTextPosition() {
        this.text.position.set(
            this.style.padding.left + (this.style.textStyle.stroke?.width ?? 0),
            this.style.padding.top + (this.style.textStyle.stroke?.width ?? 0) * ((this.text instanceof BitmapText) ? 0.25 : 1)
        );
    }

    protected updateContainerPosition(pos: { x: number, y: number }) {
        if (this.style.textStyle.dropShadow && this.text instanceof Text) {
            pos.x += this.style.textStyle.dropShadow.blur * this.scale.x;
            pos.y += this.style.textStyle.dropShadow.blur * this.scale.y;
        }
        if (this.style.textStyle.stroke) {
            //position.x += this.style.textStyle.stroke.width * this.scale.x;
            pos.y += this.style.textStyle.stroke.width * this.scale.y * 0.5;
        }
    }

    // ================================ STYLING ================================

    computeCSSStyle() {
        this.style = this.extendedLink.instances.cssBridge.getLinkLabelStyle(
            {
                source: this.extendedLink.coreElement.source.id,
                target: this.extendedLink.coreElement.target.id
            });
    }

    applyCSSChanges(): void {
        if (this.text instanceof BitmapText) {
            this.updateBitmapTextStyle();
        }
        else {
            this.text.style = this.getTextStyle();
        }
        this.setTextAnchor();
        this.setTextPosition();

        if (this.needsGraphicsBackground()) {
            this.drawGraphics(CSSBridge.backgroundColor);
        }
        else if (this.needsSpriteBackground()) {
            this.drawSprite();
        }
        else if (this.background) {
            this.background.removeFromParent();
            this.background.destroy();
            this.background = undefined;
        }
    }

    updateTextColor() {
        if (this.text instanceof BitmapText) {
            //this.text.tint = this.getTextColor();
        }
        else {
            if (!this.text.style) return;
            this.text.style.fill = this.getTextFill();
        }
    }

    private getTextFill(): TextStyleFill {
        if (this.extendedLink.instances.settings.colorLinkTypeLabel) {
            const color = this.extendedLink.managers.get(LINK_KEY)?.getColor(this.type);
            if (color) return color;
        }

        if (this.textColor === undefined) { // Undefined means not yet computed
            if (this.style.textStyle.fill) return this.style.textStyle.fill;
        }
        else if (this.textColor !== null) { // Nulls means computed but no value
            return this.textColor;
        }

        return this.extendedLink.coreElement.renderer.colors.text.rgb;
    }

    private getTextColor(): number {
        return textStyleFill2int(this.getTextFill()) ?? this.extendedLink.coreElement.renderer.colors.text.rgb;
    }

    private getFontSize(): number {
        return this.style.textStyle.fontSize + this.extendedLink.coreElement.source.getSize() / 4;
    }

    private getTextStyle(): TextStyle {
        const style = new TextStyle({
            fontFamily: this.style.textStyle.fontFamily,
            fontStyle: this.style.textStyle.fontStyle,
            fontVariant: this.style.textStyle.fontVariant,
            fontWeight: this.style.textStyle.fontWeight,
            letterSpacing: this.style.textStyle.letterSpacing,
            fontSize: this.getFontSize(),
            fill: this.getTextFill(),
            lineHeight: this.extendedLink.instances.settings.useBitmapsForLinkLabels ? undefined : 1,
        });

        if (this.style.textStyle.stroke) {
            CSSBridge.applyTextStroke(style, this.style.textStyle.stroke);
        }

        if (this.style.textStyle.dropShadow && !this.extendedLink.instances.settings.useBitmapsForLinkLabels) {
            CSSBridge.applyTextShadow(
                style,
                this.style.textStyle.dropShadow,
                this.getTextColor()
            );
        }

        return style;
    }

    private fontNameHash(style: TextStyle) {
        const str = [
            style.fontFamily,
            style.fontStyle,
            style.fontVariant,
            style.fontWeight,
            // letterSpacing is set on the BitmapText itself
            style.fontSize,
            textStyleFill2int(style.fill),
            // lineHeight is always 1 for BitmapText
            style.stroke,
            style.strokeThickness,
            // shadow is set with a DropShadowFilter for BitmapText
        ].join('|');

        let hash = 0, i, chr;
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return `font_${Math.abs(hash)}`;
    }

    private loadBitmapTextStyle(): string {
        const style = this.getTextStyle();
        const fontName = this.fontNameHash(style);
        if (!BitmapFont.available[fontName]) {
            BitmapFont.from(fontName, style);
        }
        return fontName;
    }

    private getBitmapTextStyle(): Pick<IBitmapTextStyle, "fontSize" | "letterSpacing" | "fontName"> {
        return {
            fontName: this.loadBitmapTextStyle(),
            fontSize: this.getFontSize(),
            letterSpacing: this.style.textStyle.letterSpacing + (this.style.textStyle.stroke ? this.style.textStyle.stroke.width * 0.5 : 0)
        };
    }

    private updateBitmapTextStyle(): void {
        if (this.text instanceof BitmapText) {
            const style = this.getBitmapTextStyle();
            this.text.fontName = style.fontName;
            this.text.fontSize = style.fontSize;
            this.text.letterSpacing = style.letterSpacing;

            if (this.style.textStyle.dropShadow && this.style.textStyle.dropShadow.blur > 0) {
                const shadow = this.style.textStyle.dropShadow;
                this.text.filters = [new DropShadowFilter({
                    alpha: shadow.alpha,
                    blur: shadow.blur,
                    color: shadow.color,
                    offset: { x: 0, y: 0 }
                })]
            }
            else {
                this.text.filters = [];
            }
        }
    }

    // ============================= TEXT CONTENT ==============================

    setDisplayedText(text: string): void {
        if (this.destroyed) return;
        this.text.text = text;
    }
}

abstract class CurvedLinkText extends LinkText {

}

export class LinkTextCurveMultiTypes extends CurvedLinkText {
    override updateFrame(): boolean {
        if (!super.updateFrame() || !this.extendedLink.graphicsWrapper) return false;

        const parent = this.extendedLink.graphicsWrapper.pixiElement as LinkCurveMultiTypesGraphics;
        if (this.text.text in parent.typesPositions) {
            const middle = parent.typesPositions[this.text.text].position;
            this.updateContainerPosition(middle);
            this.position.set(middle.x, middle.y);
            return true;
        }
        return false;
    }
}

export class LinkTextCurveSingleType extends CurvedLinkText {
    override updateFrame(): boolean {
        if (!super.updateFrame() || !this.extendedLink.graphicsWrapper) return false;

        const middle = (this.extendedLink.graphicsWrapper.pixiElement as LinkCurveGraphics).getMiddlePoint();
        this.updateContainerPosition(middle);
        this.position.set(middle.x, middle.y);
        return true;
    }
}

abstract class LineLinkText extends LinkText {
    override updateFrame(): boolean {
        if (!super.updateFrame()) return false;

        this.visible = this.extendedLink.coreElement.line?.visible ?? false;
        if (this.visible) {
            const middle = this.getPosition();
            this.updateContainerPosition(middle);
            this.position = middle;
            if (this.hasFaded) this.alpha = this.extendedLink.coreElement.renderer.textAlpha ?? 0;
        }

        return true;
    }

    protected abstract getPosition(): { x: number, y: number };
}

export class LinkTextLineMultiTypes extends LineLinkText {
    protected override getPosition(): { x: number, y: number } {

        if (this.extendedLink.graphicsWrapper && this.text.text in (this.extendedLink.graphicsWrapper.pixiElement as LinkLineMultiTypesGraphics).typesPositions) {
            return (this.extendedLink.graphicsWrapper.pixiElement as LinkLineMultiTypesGraphics).typesPositions[this.text.text].position;
        }

        else if (this.extendedLink.siblingLink?.graphicsWrapper && this.text.text in (this.extendedLink.siblingLink.graphicsWrapper.pixiElement as LinkLineMultiTypesGraphics).typesPositions) {
            return (this.extendedLink.siblingLink.graphicsWrapper.pixiElement as LinkLineMultiTypesGraphics).typesPositions[this.text.text].position;
        }

        else {
            const bounds = this.extendedLink.coreElement.line?.getBounds();
            if (!bounds || !this.parent) return { x: 0, y: 0 };
            return this.parent.toLocal({
                x: (bounds.left + bounds.right) * 0.5,
                y: (bounds.top + bounds.bottom) * 0.5,
            });
        }
    }
}

export class LinkTextLineSingleType extends LineLinkText {
    protected override getPosition(): { x: number, y: number } {
        const bounds = this.extendedLink.coreElement.line?.getBounds();
        if (!bounds || !this.parent) return { x: 0, y: 0 };
        const position = this.parent.toLocal({
            x: (bounds.left + bounds.right) * 0.5,
            y: (bounds.top + bounds.bottom) * 0.5,
        });
        return position;
    }
}