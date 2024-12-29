import { Graphics, Container } from "pixi.js";
import { ONode } from './node';
import { Renderer } from "../renderer";
import { bezier, lengthQuadratic, quadratic } from "src/helperFunctions";
import { InteractiveManager } from "../interactiveManager";
import { ElementWrapper } from "./element";


export interface Link {
    arrow: Graphics;
    line: Graphics;
    px: Container;
    source: ONode;
    target: ONode;
    renderer: Renderer;
    clearGraphics: () => void;
    initGraphics: () => void;
}

export abstract class LinkWrapper extends ElementWrapper {
    link: Link;
    name: string;

    constructor(link: Link, types: Set<string>, manager: InteractiveManager) {
        super(getLinkID(link), types, manager);

        this.link = link;
        this.types = types;
        this.manager = manager;

        this.initGraphics();
        this.updateGraphics();

        this.connect();
    }

    initGraphics() : void {}

    clearGraphics() : void {
        this.clear();
    }

    enableType(type: string) : void {
        this.updateGraphics();
    }

    disableType(type: string) : void {
        this.updateGraphics();
    }

    updateLink() : void {
        if (!this.link.line) {
            let newLink = this.link.renderer.links.find(l => l.source.id === this.link.source.id && l.target.id === this.link.target.id);
            if (newLink && this.link !== newLink) {
                this.disconnect();
                this.link = newLink;
            }
        }
    }

    abstract connect() : void;
    disconnect() : void {
        this.removeFromParent();
    }
}

export class LineLinkWrapper extends LinkWrapper {
    connect(): void {
        if (this.link.line && !this.link.line.getChildByName(this.name)) {
            this.link.line.addChild(this);
        }
    }
    disconnect() : void {
        this.removeFromParent();
    }

    updateGraphics(): void {
        let type = this.getActiveType();
        if (!type) return;

        this.lineStyle({width: 16, color: this.manager.getColor(type)})
            .moveTo(0, 8)
            .lineTo(16, 8);
        this.alpha = 0.6;
    }
}

export function getLinkID(link: any) {
    return link.source.id + "--to--" + link.target.id;
}