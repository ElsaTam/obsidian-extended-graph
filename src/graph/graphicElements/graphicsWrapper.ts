import { Container, Graphics } from "pixi.js";
import { ExtendedGraphLink, ExtendedGraphNode, ExtendedGraphText, ManagerGraphics } from "../../internal";

export interface GraphicsWrapper {
    name: string;
    extendedElement: ExtendedGraphNode | ExtendedGraphLink | ExtendedGraphText;
    managerGraphicsMap?: Map<string, ManagerGraphics>;
    pixiElement: Graphics | Container;

    createGraphics(): void;
    clearGraphics(): void;
    destroyGraphics(): void;
    updateGraphics(): void;

    connect(): void;
    disconnect(): void;
}