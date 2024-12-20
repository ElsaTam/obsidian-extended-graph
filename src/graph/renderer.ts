import { Container }  from 'pixi.js';
import { Node } from './node';
import { Link } from './link';

export interface Renderer {
    colors: {
        fill: {
            a: number;
            rgb: number;
        },
        fillHighlight: {
            a: number;
            rgb: number;
        },
        fillFocused: {
            a: number;
            rgb: number;
        },
        fillTag: {
            a: number;
            rgb: number;
        },
        fillUnresolved: {
            a: number;
            rgb: number;
        },
        fillAttachment: {
            a: number;
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