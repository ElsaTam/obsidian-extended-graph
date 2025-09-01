import { Assets, ColorSource, Container, Sprite, Text, Texture } from 'pixi.js';
import { GraphColorAttributes } from 'obsidian-typings';
import {
    ExtendedGraphNode,
    fadeIn,
    getFile,
    GraphicsWrapper,
    NodeShape,
    pixiAddChild,
    pixiAddChildAt,
    ExtendedGraphInstances,
    QueryData,
    QueryMatcher,
    ShapeEnum,
    CSSBridge,
    rgb2hex
} from '../../../internal';

const NODE_CIRCLE_X: number = 100;
const NODE_CIRCLE_Y: number = 100;

class FadableContainer extends Container {
    hasFaded: boolean;
}

export abstract class NodeGraphicsWrapper implements GraphicsWrapper {
    // Interface instance values
    name: string;
    extendedElement: ExtendedGraphNode;
    pixiElement: FadableContainer;

    opacityLayer?: NodeShape;
    iconBackgroundLayer?: NodeShape;
    iconSprite?: Sprite;
    emojiText?: Text;

    lastColor?: ColorSource;

    // Shape specific
    shape: ShapeEnum = ShapeEnum.CIRCLE;

    constructor(extendedElement: ExtendedGraphNode) {
        this.extendedElement = extendedElement;
        this.name = extendedElement.id;

        this.initShape();
    }

    private initShape() {
        if (this.extendedElement.isCurrentNode && this.extendedElement.instances.settings.currentNode.shape !== ShapeEnum.CIRCLE) {
            this.shape = this.extendedElement.instances.settings.currentNode.shape;
            return;
        }

        if (this.extendedElement.instances.settings.enableFeatures[this.extendedElement.instances.type]['shapes']) {
            const shapeQueries: { [k: string]: QueryData } = Object.fromEntries(Object.entries(this.extendedElement.instances.settings.shapeQueries).sort((a: [string, QueryData], b: [string, QueryData]) => {
                return (a[1].index ?? 0) - (b[1].index ?? 0);
            }));
            for (const shape of Object.keys(shapeQueries)) {
                const queriesMatcher = new QueryMatcher(shapeQueries[shape]);
                const file = getFile(this.extendedElement.id);
                if (!file) return;
                if (queriesMatcher.doesMatch(file, this.extendedElement.instances.settings)) {
                    this.shape = shape as ShapeEnum;
                    return;
                }
            }
        }
    }

    // ============================= INITALIZATION =============================

    createGraphics(): void {
        if (this.pixiElement && !this.pixiElement.destroyed) return;
        if (this.pixiElement && this.pixiElement.parent) this.pixiElement.removeFromParent();

        this.pixiElement = new FadableContainer();
        this.pixiElement.hasFaded = !this.extendedElement.instances.settings.fadeInElements;
        this.pixiElement.name = this.name;

        this.placeNode();
        //if (this.extendedElement.icon?.svg || this.extendedElement.icon?.emoji) this.initIcon();
        if (this.extendedElement.needOpacityLayer()) this.initOpacityLayer();
    }

    private placeNode() {
        this.pixiElement.x = NODE_CIRCLE_X;
        this.pixiElement.y = NODE_CIRCLE_Y;
    }

    private initOpacityLayer() {
        this.opacityLayer = new NodeShape(this.shape);
        this.opacityLayer.drawFill(0xFF0000);
        this.opacityLayer.scale.set(this.opacityLayer.getDrawingResolution());
        this.opacityLayer.alpha = 0;
        this.opacityLayer.name = "opacity-layer";
        pixiAddChild(this.pixiElement, this.opacityLayer);
    }

    initIcon() {
        if (!this.extendedElement.icon) return;
        if (!this.extendedElement.icon.svg && !this.extendedElement.icon.emoji) return;
        if (this.iconSprite?.parent || this.emojiText?.parent) return;

        // If an svg was found, create an asset and use it
        if (this.extendedElement.icon.svg) {
            const svg = this.extendedElement.icon.svg;
            const color = this.extendedElement.icon.color || this.getFillColor().rgb;

            const s = new XMLSerializer();
            const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.serializeToString(svg))}`;

            this.pixiElement.sortableChildren = true;
            const createSprite = (texture: Texture) => {
                this.iconSprite = new Sprite(texture);
                this.iconSprite.eventMode = "none";
                this.iconSprite.name = "icon";
                this.iconSprite.anchor.set(0.5, 0.5);
                this.iconSprite.tint = color;
                if (this.extendedElement.instances.settings.backgroundOpacityWithIcon > 0 || this.extendedElement.instances.settings.borderWidthWithIcon > 0) {
                    this.iconSprite.height = 160;
                    this.iconSprite.width = 160;
                }
                else {
                    this.iconSprite.height = 200;
                    this.iconSprite.width = 200;
                }
                pixiAddChild(this.pixiElement, this.iconSprite);
            }

            // Lower resolution, better performance
            /*Assets.load(svgDataUrl).then(texture => {
                createSprite(texture);
            });*/

            // Higher resolution, worse performance
            const texture = Texture.from(svgDataUrl, { resourceOptions: { scale: 40 / svg.width.baseVal.value } });
            createSprite(texture);
        }

        // If an emoji was found, create a text element
        else if (this.extendedElement.icon.emoji) {
            this.emojiText = new Text(this.extendedElement.icon.emoji, {
                fontFamily: "Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji, Android Emoji, EmojiSymbols, Symbola, Twemoji Mozilla, Twemoji Mozilla Color Emoji, Twemoji Mozilla Color Emoji 13.1.0",
                fontSize: this.extendedElement.instances.settings.backgroundOpacityWithIcon > 0 ? 130 : 150,
                align: "center",
            });
            this.emojiText.eventMode = "none";
            this.emojiText.name = "icon";
            this.emojiText.anchor.set(0.5, 0.5);
            pixiAddChild(this.pixiElement, this.emojiText);
        }
    }

    updateIconBackgroundLayerColor(backgroundColor: ColorSource): void {
        if (!this.iconBackgroundLayer) return;
        this.iconBackgroundLayer.tint = backgroundColor;
    }

    // ============================ CLEAR GRAPHICS =============================

    clearGraphics(): void {

    }

    destroyGraphics(): void {
        this.pixiElement.destroy({ children: true });
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics(): void {

    }

    updateOpacityLayerColor(backgroundColor: ColorSource): void {
        if (!this.opacityLayer) return;
        this.opacityLayer.clear();
        this.opacityLayer.drawFill(backgroundColor);
    }

    updateFillColor(color: ColorSource, highlighted: boolean): boolean {
        if (this.lastColor === color) {
            return false;
        }
        else {
            this.lastColor = color;
            if (this.iconSprite) {
                this.iconSprite.tint = (highlighted ? (color ?? this.extendedElement.icon?.color) : (this.extendedElement.icon?.color ?? color)) ?? this.getFillColor().rgb;
            }
            return true;
        }
    }

    // ========================== CONNECT/DISCONNECT ===========================

    connect(): void {
        if (this.extendedElement.coreElement.circle && !this.extendedElement.coreElement.circle.getChildByName(this.name)) {
            pixiAddChild(this.extendedElement.coreElement.circle, this.pixiElement);
            if (this.extendedElement.instances.settings.fadeInElements && !this.pixiElement.hasFaded) {
                fadeIn(this.pixiElement);
            }
        }
    }

    disconnect(): void {
        this.pixiElement.removeFromParent();
    }

    // ============================== FADE IN/OUT ==============================

    makeOpaque() {
        if (this.opacityLayer) this.opacityLayer.alpha = 0;
    }

    makeFaded() {
        if (this.opacityLayer) this.opacityLayer.alpha = 0.8;
    }

    // ================================== PIN ==================================

    pin(): void {
        if (!this.extendedElement.instances.settings.showPinIcon) return;

        const icon = this.pixiElement.getChildByName("pin");
        if (icon) return;

        Assets.load(ExtendedGraphInstances.pinSVGDataUrl).then(texture => {
            const icon = new Sprite(texture);
            icon.eventMode = "none";
            icon.name = "pin";
            icon.anchor.set(1, 0);
            icon.height = 80;
            icon.width = 80;
            icon.position.set(100, -100);

            pixiAddChild(this.pixiElement, icon);
            if (!this.pixiElement.parent) {
                this.connect();
            }
        });
    }

    unpin(): void {
        const icon = this.pixiElement.getChildByName("pin");
        if (icon) {
            icon.destroy();
            this.pixiElement.removeChild(icon);
        }
    }

    // ================================= COLOR =================================

    getFillColor(): GraphColorAttributes {
        return this.extendedElement.coreElement.getFillColor();
    }

}

