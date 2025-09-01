import { InteractiveManager } from "../../internal";


export interface ManagerGraphics {
    manager: InteractiveManager;
    types: Set<string>;
    name: string;

    clearGraphics(): void;
    updateValues(): void;
    updateFrame(): void;
    toggleType(type: string, enable: boolean): void;
}