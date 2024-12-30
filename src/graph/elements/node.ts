import { App } from 'obsidian';
import { Assets, Container, Graphics, Texture } from 'pixi.js';
import { InteractiveManager } from '../interactiveManager';
import { Renderer } from '../renderer';
import { ExtendedGraphSettings } from 'src/settings/settings';
import { getBackgroundColor, getFile, getFileInteractives, getImageUri } from 'src/helperFunctions';
import { ArcsWrapper } from './arcs';
import { NodeImage } from './image';

export interface ONode {
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
    forward: {[id: string] : ONode};
    reverse: {[id: string] : ONode};
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
    node: ONode;
    name: string;
    
    app: App;
    settings: ExtendedGraphSettings;
    
    isActive: boolean = true;
    nodeImage: NodeImage;
    arcsWrappers = new Map<string, ArcsWrapper>();
    background: Graphics;
    scaleFactor: number = 1;

    constructor(node: ONode, app: App, settings: ExtendedGraphSettings, managers: InteractiveManager[]) {
        super();
        this.node = node;
        this.name = node.id;
        this.settings = settings;
        this.app = app;

        if (node.type === "" && managers.length > 0) {
            const file = getFile(app, node.id);
            if (file) {
                let layer = 1;
                for (const manager of managers) {
                    let types = getFileInteractives(manager.name, app, file);
                    let validTypes = new Set<string>();
                    for (const type of types) {
                        if (manager.interactives.has(type)) {
                            validTypes.add(type);
                        }
                    }
                    if (validTypes.size > 0 && !validTypes.has(settings.noneType[manager.name])) {
                        let arcsWrapper = new ArcsWrapper(this, validTypes, manager, layer);
                        this.arcsWrappers.set(manager.name, arcsWrapper);
                        this.addChild(arcsWrapper);
                    }
                    layer++;
                }
            }
        }
    }

    updateNode() : void {
        if (!this.node.circle) {
            let newNode = this.node.renderer.nodes.find(n => n.id === this.node.id);
            if (newNode && this.node !== newNode) {
                this.node.clearGraphics();
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

    initGraphics(texture: Texture | undefined): void {
        // Init NodeImage
        this.nodeImage = new NodeImage(texture);
        this.addChild(this.nodeImage);

        // Init ArcsWrapper
        for (const arcWrapper of this.arcsWrappers.values()) {
            this.addChild(arcWrapper);
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
        for (const arcWrapper of this.arcsWrappers.values()) {
            arcWrapper.clearGraphics();
        }
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

    fadeIn() {
        const isFullyDisabled = [...this.arcsWrappers.values()].every((arcWrapper: ArcsWrapper) => arcWrapper.isFullyDisabled());
        if (isFullyDisabled && this.arcsWrappers.size > 0) return;
        this.isActive = true;
        if (this.settings.fadeOnDisable) {
            this.nodeImage?.fadeIn();
        }
    }

    fadeOut() {
        const isFullyDisabled = [...this.arcsWrappers.values()].every((arcWrapper: ArcsWrapper) => arcWrapper.isFullyDisabled());
        if (!isFullyDisabled && this.arcsWrappers.size > 0) return;
        this.isActive = false;
        if (this.settings.fadeOnDisable) {
            this.nodeImage?.fadeOut();
        }
    }
}