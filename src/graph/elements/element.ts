import { Graphics } from "pixi.js";
import { InteractiveManager } from "../interactiveManager";

export abstract class ElementWrapper extends Graphics {
    id: string;
    types: Set<string>;
    manager: InteractiveManager;

    constructor(id: string, types: Set<string>, manager: InteractiveManager) {
        super();
        this.id = id;
        this.name = id;
        this.types = types;
        this.manager = manager;
    }

    getActiveType(): string | null {
        for (const type of this.types) {
            if (this.manager.isActive(type)) return type;
        }
        return null;
    }

    matchesTypes(types: string[]): boolean {
        return types.sort().join(',') === [...this.types].join(',');
    }

    hasType(type: string): boolean {
        return this.types ? this.types.has(type): false;
    }

    abstract enableType(type: string): void
    abstract disableType(type: string): void
    abstract initGraphics(): void;
    abstract clearGraphics(): void;
    abstract updateGraphics(): void;
}