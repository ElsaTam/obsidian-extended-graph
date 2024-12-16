import { Container }  from 'pixi.js';
import { Node } from './node';
import { Link } from './link';

export interface Renderer {
    colors: {
        fillTag: {
            rgb: number;
        }
    }
    px: {
        stage: Container;
    };
    links: Link[];
    nodes: Node[];
    nodeScale: number;
    fNodeSizeMult: number;
    panX: number;
    panY: number;
    scale: number;
    worker: Worker,
    interactiveEl: HTMLCanvasElement,
    changed(): void;
}