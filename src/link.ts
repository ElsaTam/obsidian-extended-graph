import { Graphics, LineStyle, Container, GraphicsGeometry, ColorSource } from "pixi.js";
import { Node } from './node';
import { rgb2int } from "./colors";


export interface Link {
    arrow: Graphics;
    line: Graphics;
    px: Container;
    source: Node;
    target: Node;
}

export class LinkWrapper {
    _link: Link;
    id: string;

    constructor(link: Link) {
        this._link = link;
    }

    init() : void {
        this._link.px.scale.set(1, 5); // increase thickness (y)
        this.id = this._link.source.id + "--to--" + this._link.target.id;
    }

    waitReady(): Promise<void> {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (this._link.px && this._link.px.scale !== null) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 500);
        });
    }

    setTint(color: Uint8Array) : void {
        const quad: Graphics = this._link.px.children[0] as Graphics;
        quad.tint = rgb2int(color);
        return;
    }

    setRenderable(r: boolean) : void {
        this._link.px.renderable = r;
    }
}