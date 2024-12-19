import { Graphics, Container } from "pixi.js";
import { Node } from './node';
import { FUNC_NAMES } from "src/globalVariables";
import { Renderer } from "./renderer";


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

    async init(renderer: Renderer) : Promise<void> {
        FUNC_NAMES && console.log("[LinkWrapper] init");

        const ready: boolean = await this.waitReady(renderer);
        if (!ready) {
            return Promise.reject<void>();
        }

        (this.link.px.children[0] as Graphics).removeChildren();
    }

    async waitReady(renderer: Renderer): Promise<boolean> {
        FUNC_NAMES && console.log("[LinkWrapper] waitReady");
        let i = 0;
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (this.link.px && this.link.px.scale !== null) {
                    clearInterval(intervalId);
                    resolve(true);
                }
                if (i > 10 || !renderer.links.includes(this.link)) {
                    clearInterval(intervalId);
                    resolve(false);
                }
                i += 1;
            }, 100);
        });
    }

    connect() {
        if (this.parent != this.link.px.children[0]) {
            this.removeFromParent();
        }
        if (!(this.link.px.children[0] as Graphics)?.getChildByName(this.name)) {
            (this.link.px.children[0] as Graphics).addChild(this);
        }
    }

    setTypes(types: Set<string>) {
        FUNC_NAMES && console.log("[LinkWrapper] setTypes");
        this.types = types;
    }

    setColor(color: Uint8Array) : void {
        FUNC_NAMES && console.log("[LinkWrapper] setColor");
        this.clear();
        this.lineStyle({width: 16, color: color})
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