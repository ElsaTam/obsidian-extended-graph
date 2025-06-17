import { Assets, ColorSource, Container, Sprite, Text, Texture } from 'pixi.js';
import { GraphColorAttributes } from 'obsidian-typings';
import {
    ExtendedGraphNode,
    getBackgroundColor,
    getFile,
    GraphicsWrapper,
    NodeShape,
    PluginInstances,
    QueryData,
    QueryMatcher,
    ShapeEnum
} from 'src/internal';

const NODE_CIRCLE_X: number = 100;
const NODE_CIRCLE_Y: number = 100;


export abstract class NodeGraphicsWrapper implements GraphicsWrapper {
    // Interface instance values
    name: string;
    extendedElement: ExtendedGraphNode;
    pixiElement: Container;

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
        if (!this.extendedElement.instances.settings.enableFeatures[this.extendedElement.instances.type]['shapes']) return;
        const shapeQueries: { [k: string]: QueryData } = Object.fromEntries(Object.entries(this.extendedElement.instances.settings.shapeQueries).sort((a: [string, QueryData], b: [string, QueryData]) => {
            return (a[1].index ?? 0) - (b[1].index ?? 0);
        }));
        for (const shape of Object.keys(shapeQueries)) {
            const queriesMatcher = new QueryMatcher(shapeQueries[shape]);
            if (queriesMatcher.doesMatch(this.extendedElement.id)) {
                this.shape = shape as ShapeEnum;
                return;
            }
        }
    }

    // ============================= INITALIZATION =============================

    createGraphics(): void {
        if (this.pixiElement && !this.pixiElement.destroyed) return;
        if (this.pixiElement && this.pixiElement.parent) this.pixiElement.removeFromParent();

        this.pixiElement = new Container();
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
        this.pixiElement.addChild(this.opacityLayer);
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
                this.iconSprite.name = "icon";
                this.iconSprite.anchor.set(0.5, 0.5);
                this.iconSprite.height = 200;
                this.iconSprite.width = 200;
                this.iconSprite.tint = color;
                this.pixiElement.addChild(this.iconSprite);
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
                fontSize: 150,
                align: "center",
            });
            this.emojiText.name = "icon";
            this.emojiText.anchor.set(0.5, 0.5);
            this.pixiElement.addChild(this.emojiText);
        }

        // Hide circle
        this.iconBackgroundLayer = new NodeShape(this.shape);
        this.iconBackgroundLayer.name = "icon-background";
        this.iconBackgroundLayer.drawFill('white');
        this.iconBackgroundLayer.scale.set(this.iconBackgroundLayer.getDrawingResolution() + 0.5);
        this.iconBackgroundLayer.alpha = 10;
        this.iconBackgroundLayer.zIndex = -1;
        this.updateIconBackgroundLayerColor(getBackgroundColor(this.extendedElement.instances.renderer));
        this.pixiElement.addChildAt(this.iconBackgroundLayer, 0);
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
            this.extendedElement.coreElement.circle.addChild(this.pixiElement);
        }
    }

    disconnect(): void {
        this.pixiElement.removeFromParent();
    }

    // ============================== FADE IN/OUT ==============================

    fadeIn() {
        if (this.opacityLayer) this.opacityLayer.alpha = 0;
    }

    fadeOut() {
        if (this.opacityLayer) this.opacityLayer.alpha = 0.8;
    }

    // ================================== PIN ==================================

    pin(): void {
        const icon = this.pixiElement.getChildByName("pin");
        if (icon) return;

        Assets.load(PluginInstances.pinSVGDataUrl).then(texture => {
            const icon = new Sprite(texture);
            icon.name = "pin";
            icon.anchor.set(1, 0);
            icon.height = 80;
            icon.width = 80;
            icon.position.set(100, -100);

            this.pixiElement.addChild(icon);
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

