import { Graphics, Container } from "pixi.js";
import { Node } from './node';
import { InteractiveManager } from "./interactiveManager";
import { FUNC_NAMES } from "src/globalVariables";


export interface Link {
    arrow: Graphics;
    line: Graphics;
    px: Container;
    source: Node;
    target: Node;
}

export class LinkWrapper extends Graphics {
    link: Link;
    sourceID: string;
    targetID: string;
    id: string;
    types = new Set<string>();
    isActive: boolean = true;
    name: string;

    constructor(link: Link, source: string, target: string) {
        FUNC_NAMES && console.log("[LinkWrapper] new");
        super();
        this.link = link;
        this.sourceID = source;
        this.targetID = target;
        this.id = getLinkID(this.link);
        this.name = this.id;
    }

    init() : void {
        FUNC_NAMES && console.log("[LinkWrapper] init");
    }

    waitReady(): Promise<void> {
        FUNC_NAMES && console.log("[LinkWrapper] waitReady");
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
        FUNC_NAMES && console.log("[LinkWrapper] setTypes");
        this.types = types;
    }

    setColor(color: Uint8Array) : void {
        FUNC_NAMES && console.log("[LinkWrapper] setColor");
        this.clear();
        (this.link.px.children[0] as Graphics).addChild(this);
        this.lineStyle({width: 50, color: color})
            .moveTo(0, 8)
            .lineTo(16, 8);
        this.alpha = 0.3;
    }

    setRenderable(r: boolean) : void {
        FUNC_NAMES && console.log("[LinkWrapper] setRenderable");
        this.isActive = r;
        (this.link.px) && (this.link.px.renderable = r);
    }
}

export function getLinkID(link: any) {
    return link.source.id + "--to--" + link.target.id;
}