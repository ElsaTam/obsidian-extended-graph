import { Graphics, Container } from "pixi.js";
import { Node, NodeWrapper } from './node';
import { InteractiveManager } from "./interactiveManager";


export interface Link {
    arrow: Graphics;
    line: Graphics;
    px: Container;
    source: Node;
    target: Node;
}

export class LinkWrapper {
    _link: Link;
    _source: NodeWrapper;
    _target: NodeWrapper;
    _graphics: Graphics;
    id: string;

    constructor(link: Link, source: NodeWrapper, target: NodeWrapper) {
        this._link = link;
        this._source = source;
        this._target = target;
    }

    init() : void {
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

    setColor(color: Uint8Array) : void {
        if (this._graphics) {
            this._graphics.clear();
        }
        else {
            this._graphics = new Graphics();
            (this._link.px.children[0] as Graphics).addChild(this._graphics);
        }
        this._graphics
            .lineStyle({width: 50, color: color})
            .moveTo(0, 8)
            .lineTo(16, 8);
        this._graphics.alpha = 0.3;
    }

    setRenderable(r: boolean) : void {
        this._link.px.renderable = r;
    }

    getTypes() : string[] {
        let types = this._source.getLinkTypes(this._target.getID());
        (types.length == 0) && (types = ["none"]);
        return types;
    }

    getType(manager: InteractiveManager) : string {
        let type = this.getTypes().find(type => manager.isActive(type));
        (!type) && (type = "none");
        return type;
    }
}