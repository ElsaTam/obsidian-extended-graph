import { Graphics, Container } from "pixi.js";
import { Node } from './node';


export interface Link {
    arrow: Graphics;
    line: Graphics;
    px: Container;
    source: Node;
    target: Node;
}