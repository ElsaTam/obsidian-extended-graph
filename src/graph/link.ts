import { Graphics, Container } from "pixi.js";
import { Node } from './node';
import { InteractiveManager } from "./interactiveManager";


export interface Link {
    arrow: Graphics;
    line: Graphics;
    px: Container;
    source: Node;
    target: Node;
}

export class LinkWrapper {
    link: Link;
    sourceID: string;
    targetID: string;
    id: string;
    types = new Set<string>();

    _graphics: Graphics;

    constructor(link: Link, source: string, target: string) {
        this.link = link;
        this.sourceID = source;
        this.targetID = target;
    }

    init() : void {
        this.id = getLinkID(this.link);
    }

    waitReady(): Promise<void> {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (this.link.px && this.link.px.scale !== null) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 500);
        });
    }

    setTypes(types: Set<string>) {
        this.types = types;
    }

    setColor(color: Uint8Array) : void {
        if (this._graphics) {
            this._graphics.clear();
        }
        else {
            this._graphics = new Graphics();
            (this.link.px.children[0] as Graphics).addChild(this._graphics);
        }
        this._graphics
            .lineStyle({width: 50, color: color})
            .moveTo(0, 8)
            .lineTo(16, 8);
        this._graphics.alpha = 0.3;
    }

    setRenderable(r: boolean) : void {
        this.link.px.renderable = r;
    }
}

export function getLinkID(link: any) {
    return link.source.id + "--to--" + link.target.id;
}