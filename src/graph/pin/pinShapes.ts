import { ExtendedGraphNode, GraphInstances, Pinner, t } from "../../internal";

export type PinShapeType = 'grid' | 'circle';

export const PinShapeLabels: Record<PinShapeType, string> = {
    'circle': t("features.shapesNames.circle"),
    'grid': t("features.shapesNames.grid"),
}

export type PinShapeData = {
    type: PinShapeType,
    center: { x: number, y: number },
    step: number,
    columns?: number | string,
};

export abstract class PinShape {
    type: PinShapeType;
    data: PinShapeData;
    pinner: Pinner;

    constructor(instances: GraphInstances, type: PinShapeType, data: PinShapeData) {
        this.type = type;
        this.data = data;
        this.pinner = new Pinner(instances);
    }

    pinNodes(nodes: ExtendedGraphNode[]): void {
        this.pinShape(nodes);
        this.pinner.instances.renderer.changed();
    }

    protected abstract pinShape(nodes: ExtendedGraphNode[]): void;
}

export class PinShapeCircle extends PinShape {
    constructor(instances: GraphInstances, data: PinShapeData) {
        super(instances, 'circle', data);
    }

    protected override pinShape(nodes: ExtendedGraphNode[]): void {
        const N = nodes.length;
        const r = Math.max(200, N * this.data.step / (2 * Math.PI));

        for (let i = 0; i < N; ++i) {
            const theta = i * Math.PI * 2 / N;
            const x = r * Math.cos(theta) + this.data.center.x;
            const y = r * Math.sin(theta) + this.data.center.y;
            this.pinner.pinNode(nodes[i].id, x, y);
        }
    }
}

export class PinShapeGrid extends PinShape {
    constructor(instances: GraphInstances, data: PinShapeData) {
        super(instances, 'grid', data);
    }

    protected override pinShape(nodes: ExtendedGraphNode[]): void {
        const N = nodes.length;
        const auto = Math.ceil(Math.sqrt(N));

        const nCols = typeof this.data.columns === 'string' ?
            (this.data.columns === 'N' ? N : auto) :
            (this.data.columns ?? auto);
        const nRows = N / nCols;

        for (let i = 0; i < N; ++i) {
            const row = Math.floor(i / nCols) - nRows / 2;
            const col = (i % nCols) - nCols / 2;
            const x = this.data.step * col + this.data.center.x;
            const y = this.data.step * row + this.data.center.y;
            this.pinner.pinNode(nodes[i].id, x, y);
        }
    }
}