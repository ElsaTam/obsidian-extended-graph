import { Container }  from 'pixi.js';
import { ONode } from '../graph/elements/node';
import { Link } from '../graph/elements/link';

export interface Renderer {
    colors: {
        circle: {
            a: number;
            rgb: number;
        },
        arrow: {
            a: number;
            rgb: number;
        },
        line: {
            a: number;
            rgb: number;
        },
        lineHighlight: {
            a: number;
            rgb: number;
        },
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
    nodes: ONode[];
    nodeScale: number;
    fNodeSizeMult: number;
    panX: number;
    panY: number;
    scale: number;
    targetScale: number;
    worker: Worker,
    interactiveEl: HTMLCanvasElement,
    idleFrames: number,
    changed(): void;
}