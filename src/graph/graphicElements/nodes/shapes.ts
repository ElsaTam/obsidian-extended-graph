import { ColorSource, Graphics } from "pixi.js";
import { getSVGNode } from "src/internal";

export enum ShapeEnum {
    CIRCLE = "circle",
    SQUARE = "square",
    POLY_3 = "triangle",
    POLY_4 = "diamond",
    POLY_5 = "pentagon",
    POLY_6 = "hexagon",
    POLY_8 = "octagon",
    POLY_10 = "decagon",
    STARBURST_4 = "star4",
    STARBURST_5 = "star5",
    STARBURST_6 = "star6",
    STARBURST_8 = "star8",
    STARBURST_10 = "star10"
}

enum ShapeType {
    CIRCLE = "circle",
    SQUARE = "square",
    POLYGON = "polygon",
    STARBURST = "starburst",
    UNKNOWN = "unknown"
}

export class NodeShape extends Graphics {
    static readonly RADIUS = 100;
    static readonly RESOLUTION_RADIUS = 10;

    readonly shape: ShapeEnum;
    readonly n: number;
    readonly type: ShapeType;

    constructor(shape: ShapeEnum) {
        super();
        this.shape = shape;
        this.n = NodeShape.getN(shape);
        this.type = NodeShape.getType(shape);
    }

    drawMask(): NodeShape {
        return this.drawFill(0xFFFFFF);
    }

    drawFill(color: ColorSource): NodeShape {
        this.clear();
        return this.beginFill(color)
                   .drawUniqueShape()
                   .endFill();
    }

    getDrawingResolution(): number {
        switch (this.type) {
            case ShapeType.CIRCLE:
            case ShapeType.UNKNOWN:
                return NodeShape.RESOLUTION_RADIUS;
            default:
                return 1;
        }
    }

    // https://bennettfeely.com/clippy/
    // starburst: https://css-generators.com/starburst-shape/
    // polygon: https://css-generators.com/polygon-shape/
    private drawUniqueShape(): NodeShape {
        switch (this.type) {
            case ShapeType.POLYGON:
            case ShapeType.STARBURST:
                return this.drawPolygon(NodeShape.getVertices(this.shape));
            case ShapeType.SQUARE:
                return this.drawRect(-NodeShape.RADIUS, -NodeShape.RADIUS, 2 * NodeShape.RADIUS, 2 * NodeShape.RADIUS);
            case ShapeType.CIRCLE:
            case ShapeType.UNKNOWN:
                return this.drawCircle(0, 0, NodeShape.RESOLUTION_RADIUS);
        }
    }

    // ============================ STATIC METHODS =============================

    static randomShape(): ShapeEnum {
        const values = Object.keys(ShapeEnum).filter(v => typeof v === 'string');
        const enumKey = values[Math.floor(Math.random() * values.length)];
        return ShapeEnum[enumKey as keyof typeof ShapeEnum];
    }

    static nodeScaleFactor(shape: ShapeEnum): number {
        const type = NodeShape.getType(shape);
        if (type === ShapeType.POLYGON) {
            const outerR = NodeShape.getPolygonRadius(NodeShape.getN(shape), NodeShape.RADIUS);
            const innerR = NodeShape.RADIUS;
            const middleR = (outerR + innerR) / 2;
            return middleR / outerR;
        }
        if (type === ShapeType.STARBURST) {
            const outerR = NodeShape.getStarburstRadius(NodeShape.getN(shape), NodeShape.RADIUS);
            const innerR = NodeShape.RADIUS;
            const middleR = (outerR + innerR) / 2;
            return middleR / outerR;
        }
        return 1;
    }

    static getSizeFactor(shape: ShapeEnum): number {
        const type = NodeShape.getType(shape);
        if (type === ShapeType.POLYGON) {
            return this.getPolygonRadius(NodeShape.getN(shape), NodeShape.RADIUS) / NodeShape.RADIUS;
        }
        if (type === ShapeType.STARBURST) {
            return this.getStarburstRadius(NodeShape.getN(shape), NodeShape.RADIUS) / NodeShape.RADIUS;
        }
        return 1;
    }

    private static getN(shape: ShapeEnum): number {
        switch (shape) {
            case ShapeEnum.POLY_3:
                return 3;
            case ShapeEnum.POLY_4:
            case ShapeEnum.STARBURST_4:
                return 4;
            case ShapeEnum.POLY_5:
            case ShapeEnum.STARBURST_5:
                return 5;
            case ShapeEnum.POLY_6:
            case ShapeEnum.STARBURST_6:
                return 6;
            case ShapeEnum.POLY_8:
            case ShapeEnum.STARBURST_8:
                return 8;
            case ShapeEnum.POLY_10:
            case ShapeEnum.STARBURST_10:
                return 10;
            case ShapeEnum.CIRCLE:
                return 10;
            default:
                return 0;
        }
    }

    private static getType(shape: ShapeEnum): ShapeType {
        switch (shape) {
            case ShapeEnum.POLY_3:
            case ShapeEnum.POLY_4:
            case ShapeEnum.POLY_5:
            case ShapeEnum.POLY_6:
            case ShapeEnum.POLY_8:
            case ShapeEnum.POLY_10:
                return ShapeType.POLYGON;
            case ShapeEnum.STARBURST_4:
            case ShapeEnum.STARBURST_5:
            case ShapeEnum.STARBURST_6:
            case ShapeEnum.STARBURST_8:
            case ShapeEnum.STARBURST_10:
                return ShapeType.STARBURST;
            case ShapeEnum.SQUARE:
                return ShapeType.SQUARE;
            case ShapeEnum.CIRCLE:
                return ShapeType.CIRCLE;
            default:
                return ShapeType.UNKNOWN
        }
    }

    private static getVertices(shape: ShapeEnum): number[] {
        const type = NodeShape.getType(shape);
        switch (type) {
            case ShapeType.POLYGON:
                return NodeShape.getPolygonOutside(shape, 0, NodeShape.RADIUS);
            case ShapeType.STARBURST:
                return NodeShape.getStarburst(shape, NodeShape.RADIUS);
        }
        return [];
    }

    private static getPolygonInside(shape: ShapeEnum, shift: number, r: number): number[] {
        const n = NodeShape.getN(shape);
        const P: number[] = [];
        for (let k = 0; k < n; ++k) {
            const theta = 2 * Math.PI * k / n;
            P.push(r *  Math.sin(theta + shift));
            P.push(r * -Math.cos(theta + shift));
        }
        return P;
    }

    private static getPolygonOutside(shape: ShapeEnum, shift: number, r: number): number[] {
        const type = NodeShape.getType(shape);
        const n = NodeShape.getN(shape);
        let newRadius = r;
        if (type === ShapeType.POLYGON) {
            newRadius = NodeShape.getPolygonRadius(n, r);
        }
        if (type === ShapeType.STARBURST) {
            newRadius = NodeShape.getStarburstRadius(n, r);
        }
        return this.getPolygonInside(shape, shift, newRadius);
    }

    private static getStarburst(shape: ShapeEnum, r: number): number[] {
        const n = NodeShape.getN(shape);
        const Pi = NodeShape.getPolygonInside(shape, 2 * Math.PI / (2 * n), r);
        const Po = NodeShape.getPolygonOutside(shape, 0, r);
        const P: number[] = [];
        for (let k = 0; k < n; ++k) {
            P.push(Po[k*2]);
            P.push(Po[k*2+1]);
            P.push(Pi[k*2]);
            P.push(Pi[k*2+1]);
        }
        return P;
    }

    private static getPolygonRadius(n: number, r: number): number {
        const rOutside = r / Math.cos(Math.PI / n);
        return rOutside;
    }
    
    private static getStarburstRadius(n: number, r: number): number {
        return NodeShape.getPolygonRadius(n, r) + 30;
    }

    static getSVG(shape: ShapeEnum): SVGElement {
        const type = NodeShape.getType(shape);
        
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttributeNS(null, 'fill', 'currentColor');
        svg.setAttributeNS(null, 'stroke-width', '0');
        svg.appendChild(NodeShape.getInnerSVG(shape));

        switch (type) {
            case ShapeType.CIRCLE:
            case ShapeType.UNKNOWN:
                svg.setAttributeNS(null, 'viewBox', '0 0 200 200');
                break;
            case ShapeType.SQUARE:
                svg.setAttributeNS(null, 'viewBox', '0 0 200 200');
                break;
            case ShapeType.POLYGON:
            case ShapeType.STARBURST:
                const V = NodeShape.getVertices(shape);
                for (let k = 0; k < V.length; ++k) {
                    V[k] += 100;
                }
                const max = Math.max.apply(null, V);
                const min = Math.min.apply(null, V);
                svg.setAttributeNS(null, 'viewBox', `${min} ${min} ${max-min} ${max-min}`);
            default:
                break;
        }

        return svg;
    }

    static getInnerSVG(shape: ShapeEnum): SVGElement {
        const type = NodeShape.getType(shape);

        switch (type) {
            case ShapeType.SQUARE:
                return getSVGNode('rect', {width: 200, height: 200});
            case ShapeType.POLYGON:
            case ShapeType.STARBURST:
                const V = NodeShape.getVertices(shape);
                for (let k = 0; k < V.length; ++k) {
                    V[k] += 100;
                }
                let pathStr = `M ${V[0]} ${V[1]} `;
                for (let k = 2; k < V.length; k += 2) {
                    pathStr += `L ${V[k]} ${V[k+1]} `
                }
                return getSVGNode('path', {d: pathStr});
            case ShapeType.CIRCLE:
            case ShapeType.UNKNOWN:
            default:
                return getSVGNode('circle', {cx: 100, cy: 100, r: 100});
        }
    }
}