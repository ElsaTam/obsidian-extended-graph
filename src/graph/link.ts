import { Graphics, Container, ObservablePoint, Point } from "pixi.js";
import { Node } from './node';
import { ARC_INSET, ARC_THICKNESS, FUNC_NAMES } from "src/globalVariables";
import { Renderer } from "./renderer";
import { ExtendedGraphSettings } from "src/settings/settings";
import { bezier, lengthQuadratic, quadratic } from "src/helperFunctions";


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
    color = new Uint8Array([255, 255, 255]);

    // @ts-ignore
    connect(): void;
    // @ts-ignore
    disconnect(): void;
    // @ts-ignore
    updateGraphics(): void;

    constructor(link: Link, source: string, target: string, settings: ExtendedGraphSettings) {
        super();
        this.link = link;
        this.sourceID = source;
        this.targetID = target;
        this.id = getLinkID(this.link);
        this.name = this.id;
        if (settings.linkCurves) {
            this.updateGraphics = this.setCurve.bind(this);
            this.connect = this.connectCurve.bind(this);
            this.disconnect = this.disconnectCurve.bind(this);
        }
        else {
            this.updateGraphics = this.setLine.bind(this);
            this.connect = this.connectLine.bind(this);
            this.disconnect = this.disconnectLine.bind(this);
        }
    }

    async init(renderer: Renderer) : Promise<void> {
        const ready: boolean = await this.waitReady(renderer);
        if (!ready) {
            return Promise.reject<void>();
        }

        this.link.line.removeChildren();
    }

    async waitReady(renderer: Renderer): Promise<boolean> {
        let i = 0;
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (this.link.line) {
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

    connectLine() {
        this.updateGraphics();
        if (this.parent != this.link.px) {
            this.removeFromParent();
        }
        if (!this.link.line.getChildByName(this.name)) {
            this.link.line.addChild(this);
        }
    }

    connectCurve() {
        this.updateGraphics();
        if (this.parent != this.link.px) {
            this.removeFromParent();
        }
        if (!this.link.px?.getChildByName(this.name)) {
            this.link.px.addChild(this);
        }
    }

    disconnectLine() {
        if (this.link.line)
            this.link.line.removeChild(this);
    }

    disconnectCurve() {
        if (this.link.px)
            this.link.px.removeChild(this);
    }

    setTypes(types: Set<string>) {
        this.types = types;
    }

    setColor(color: Uint8Array) : void {
        this.color = color;
        this.updateGraphics();
    }

    setLine() : void {
        this.clear();
        this.lineStyle({width: 16, color: this.color})
            .moveTo(0, 8)
            .lineTo(16, 8);
        this.alpha = 0.6;
    }

    setCurve() : void {
        if(!this.link.px) return;
        this.clear();
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
            this.tint = this.color;
        }
        this.alpha = this.link.line.alpha + 0.5;
        this.link.line.alpha = -0.2;
    }

    setRenderable(r: boolean) : void {
        this.isActive = r;
        (this.link.px) && (this.link.px.renderable = r);
    }
}

export function getLinkID(link: any) {
    return link.source.id + "--to--" + link.target.id;
}