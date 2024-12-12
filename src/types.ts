import { Container }  from 'pixi.js';

export interface Renderer {
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
    links: any[];
    changed(): void;
}
