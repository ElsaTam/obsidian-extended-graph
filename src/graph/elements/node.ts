import { App, getAllTags, TFile } from 'obsidian';
import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { InteractiveManager } from '../interactiveManager';
import { INVALID_KEYS } from 'src/globalVariables';
import { Renderer } from '../renderer';
import { ExtendedGraphSettings } from 'src/settings/settings';
import { getFile, getImageUri, getTags } from 'src/helperFunctions';
import { ElementWrapper } from './element';
import { ArcsWrapper } from './arcs';
import { NodeImage } from './image';

export interface Node {
    circle: Graphics,
    color: {
        a: number;
        rgb: number;
    }
    text: {
        alpha: number;
        _text: string;
    }
    id: string;
    weight: number;
    x: number;
    y: number;
    rendered: boolean;
    type: string;
    forward: {[id: string] : Node};
    reverse: {[id: string] : Node};
    renderer: Renderer;
    getFillColor: () => {rgb: number, a: number};
    getSize: () => number;
    clearGraphics: () => void;
    initGraphics: () => void;
}

const NODE_CIRCLE_RADIUS: number = 100;
const NODE_CIRCLE_X: number = 100;
const NODE_CIRCLE_Y: number = 100;

export class NodeWrapper extends Container {
    node: Node;
    name: string;
    
    app: App;
    settings: ExtendedGraphSettings;
    
    isActive: boolean = true;
    nodeImage: NodeImage | null = null;
    arcsWrapper: ArcsWrapper | null = null;
    background: Graphics;
    scaleFactor: number = 1;

    constructor(node: Node, app: App, settings: ExtendedGraphSettings, manager: InteractiveManager | null) {
        super();
        this.node = node;
        this.name = node.id;
        this.settings = settings;
        this.app = app;

        if (node.type === "" && manager) {
            const file = getFile(app, node.id);
            if (file) {
                let types = getTags(app, file);
                let validTypes = new Set<string>();
                for (const type of types) {
                    if (manager.interactives.has(type)) {
                        validTypes.add(type);
                    }
                }
                if (validTypes.size > 0 && !validTypes.has(settings.noneType["tag"])) {
                    this.arcsWrapper = new ArcsWrapper(this, validTypes, manager);
                    this.addChild(this.arcsWrapper);
                }
            }
        }

        // Update background color on hover
        //this.eventMode = 'static';
        //this.on('mouseenter', e => this.addBackground());
        //this.on('mouseleave', e => this.addBackground());
    }

    updateNode() : void {
        if (!this.node.circle) {
            let newNode = this.node.renderer.nodes.find(n => n.id === this.node.id);
            if (newNode && this.node !== newNode) {
                this.disconnect();
                this.node = newNode;
            }
        }
    }

    connect() : void {
        if (this.node.circle && !this.node.circle.getChildByName(this.name)) {
            this.node.circle.addChild(this);
        }
    }

    disconnect() {
        this.removeFromParent();
    }

    initGraphics(): void {
        // Init NodeImage
        let imageUri = getImageUri(this.app, this.settings.imageProperty, this.node.id);
        if (imageUri) {
            Assets.load(imageUri).then((texture: Texture) => {
                this.nodeImage = new NodeImage(texture);
                this.addChild(this.nodeImage);
            }).catch(e => {
                console.error(e);
            });
        }

        // Init ArcsWrapper
        if (this.arcsWrapper) {
            this.addChild(this.arcsWrapper);
        }

        // Place this
        this.x = NODE_CIRCLE_X;
        this.y = NODE_CIRCLE_Y;

        // Init background
        this.background = new Graphics();
        this.background.scale.set(NODE_CIRCLE_RADIUS / 10);
        this.addChild(this.background);
    }

    clearGraphics(): void {
        this.background.destroy();
        this.nodeImage?.destroy({children: true});
        this.arcsWrapper?.clearGraphics();
    }

    updateGraphics(): void {
        //this.addBackground();
    }

    highlight(scale: number, color?: number) {
        this.scaleFactor = scale;
        if (this.scaleFactor > 1) {
            this.background.clear();
            this.background
                .beginFill(color ? color : this.node.getFillColor().rgb)
                .drawCircle(0, 0, 10)
                .endFill();
        }
        else {
            this.background.clear();
        }
        this.scale.set(this.scaleFactor);
    }

    updateState() : void {
        const isFullyDisabled = !!this.arcsWrapper?.isFullyDisabled();
        if (this.isActive && isFullyDisabled) {
            this.fadeOut();
        }
        else if (!this.isActive && !isFullyDisabled) {
            this.fadeIn();
        }
    }

    fadeIn() {
        this.isActive = true;
        if (this.settings.fadeOnDisable) {
            this.nodeImage?.fadeIn();
            this.arcsWrapper?.fadeIn();
        }
    }

    fadeOut() {
        this.isActive = false;
        if (this.settings.fadeOnDisable) {
            this.nodeImage?.fadeOut();
            this.arcsWrapper?.fadeOut();
        }
    }
}