import { Graphics, Container } from "pixi.js";
import { Node } from './node';
import { Renderer } from "../renderer";
import { bezier, lengthQuadratic, quadratic } from "src/helperFunctions";
import { InteractiveManager } from "../interactiveManager";
import { ElementWrapper } from "./element";


export interface Link {
    arrow: Graphics;
    line: Graphics;
    px: Container;
    source: Node;
    target: Node;
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

export class CurveLinkWrapper extends LinkWrapper {
    connect(): void {
        this.updateGraphics();
        if (this.parent != this.link.px) {
            this.removeFromParent();
        }
        if (!this.link.px?.getChildByName(this.name)) {
            this.link.px.addChild(this);
        }
    }

    updateGraphics(): void {
        if(!this.link.px) return;

        let type = this.getActiveType();
        if (!type) return;

        const renderer = this.link.source.renderer as Renderer;
        
        const f = renderer.nodeScale;
        const w = this.link.px.width;
        const h = this.link.px.height * renderer.scale;
        const sr = this.link.source.getSize() * f;
        const tr = this.link.target.getSize() * f;

        const P0 = { x: 0 - sr, y: 0 };
        const P3 = { x: w + tr, y: 0 };
        const W = P3.x - P0.x;
        const P1 = { x: W * 1/2, y: w / 4 };
        //const P2 = { x: W * 2/3, y: P1.y };

        const L = lengthQuadratic(1, P0, P1, P3);
        const P0_ = quadratic(0.8*sr/L, P0, P1, P3);
        const P3_ = quadratic(1-1.2*tr/L, P0, P1, P3);
        const W_ = P3_.x - P0_.x;
        const P1_ = { x: W_ * 1/2, y: W_ / 4 };
        //const P2_ = { x: W_ * 2/3, y: P1_.y };

        // Straight line from center to center
        //this.lineStyle({width: h / 2, color: "green"});
        //this.moveTo(P0.x, P0.y).lineTo(P3.x, P3.y);
        // Bezie curve from center to center
        //this.lineStyle({width: h / 2, color: "red"});
        //this.moveTo(P0.x, P0.y).quadraticCurveTo(P1.x, P1.y, P3.x, P3.y);
        // Expected final Bezier curve
        this.lineStyle({width: h, color: "white"});
        this.moveTo(P0_.x, P0_.y).quadraticCurveTo(P1_.x, P1_.y, P3_.x, P3_.y);
        // Circle at the source
        //this.lineStyle({width: 1, color: "cyan"});
        //this.drawCircle(P0_.x, P0_.y, 5);
        this.alpha = 1;
        if (this.link.line.tint !== renderer.colors.line.rgb) {
            this.tint = this.link.line.tint;
        }
        else {
            this.tint = this.manager.getColor(type);
        }
        this.alpha = this.link.line.alpha + 0.5;
        this.link.line.alpha = -0.2;
    }
}

export function getLinkID(link: any) {
    return link.source.id + "--to--" + link.target.id;
}