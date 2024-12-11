import { Container }  from 'pixi.js';
import { GraphNode } from './node';
import { GraphNodeContainer } from './container';

export interface ObsidianRenderer {
    colors: {
        fillTag: {
            rgb: number;
        }
    }
    px: {
        stage: Container;
    };
    nodes: any[];
    nodeScale: number;
    fNodeSizeMult: number;
    panX: number;
    panY: number;
    scale: number;
}

export interface kn {
    alpha: number;
    children: any[];
    _text: string;
}
