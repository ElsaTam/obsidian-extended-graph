import { GraphLink, GraphNode } from "obsidian-typings";
import { Container } from "pixi.js";
import { GraphicsWrapper, GraphInstances, InteractiveManager } from "../../internal";

export abstract class ExtendedGraphElement<T extends GraphNode | GraphLink> {
    instances: GraphInstances;
    types: Map<string, Set<string>>;
    managers: Map<string, InteractiveManager>;
    coreElement: T;
    graphicsWrapper?: GraphicsWrapper;
    id: string;
    isEnabled: boolean = true;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, coreElement: T, types: Map<string, Set<string>>, managers: InteractiveManager[]) {
        this.instances = instances;
        this.coreElement = coreElement;
        this.id = this.getID();
        this.managers = new Map<string, InteractiveManager>();
        this.types = types;

        for (const manager of managers) {
            const key = manager.name;
            this.managers.set(key, manager);
        }

        this.additionalConstruct();

        if (this.needGraphicsWrapper()) {
            this.createGraphicsWrapper();
        }
    }

    protected additionalConstruct(): void { }

    init() {
        if (this.graphicsWrapper?.pixiElement.destroyed) {
            this.graphicsWrapper.createGraphics();
        }
        this.graphicsWrapper?.connect();
        this.modifyCoreElement();
    }

    protected abstract needGraphicsWrapper(): boolean;
    protected abstract createGraphicsWrapper(): void;

    // ================================= UNLOAD ================================

    unload() {
        this.restoreCoreElement();
        this.graphicsWrapper?.disconnect();
        this.graphicsWrapper?.clearGraphics();
        this.graphicsWrapper?.destroyGraphics();
    }

    // ============================== CORE ELEMENT =============================

    setCoreElement(coreElement: T | undefined): void {
        if (!coreElement) return;
        if (coreElement === this.coreElement) return;

        this.graphicsWrapper?.disconnect();
        this.coreElement = coreElement;
        this.init();
    }

    protected findCoreElement(): T | undefined {
        if (!this.isCoreElementUptodate()) {
            const newElement = this.getCoreCollection().find(n => this.isSameCoreElement(n));
            return newElement;
        }
        return this.coreElement;
    }

    abstract modifyCoreElement(): void;
    abstract restoreCoreElement(): void;

    protected abstract isCoreElementUptodate(): boolean;
    abstract isSameCoreElement(coreElement: T): boolean;
    protected abstract isSameCoreGraphics(coreElement: T): boolean;
    abstract getCoreCollection(): T[];
    abstract canBeAddedWithEngineOptions(): boolean;
    protected abstract getCoreParentGraphics(coreElement: T): Container | null;


    // ================================ GETTERS ================================

    isAnyManagerDisabled(): boolean {
        for (const [key, manager] of this.managers) {
            const types = this.getTypes(key);
            if (types.size === 0) continue;

            if (!manager.isActiveBasedOnTypes([...types])) return true;
        }
        return false;
    }

    getActiveType(key: string): string | undefined {
        const manager = this.managers.get(key);
        if (!manager) return;
        const types = this.getTypes(key);
        for (const type of types) {
            if (manager.isActive(type)) return type;
        }
        return;
    }

    matchesTypes(key: string, newTypes: string[]): { typesToRemove: string[], typesToAdd: string[] } {
        const currentTypes = this.getTypes(key);
        const typesToRemove = structuredClone(currentTypes);
        const typesToAdd = structuredClone(newTypes);
        for (const type of newTypes) {
            if (currentTypes.has(type)) {
                typesToRemove.delete(type);
                typesToAdd.remove(type);
            }
        }
        return { typesToRemove: [...typesToRemove], typesToAdd: typesToAdd };
    }

    hasType(key: string, type: string): boolean {
        return !!this.types.get(key)?.has(type);
    }

    getTypes(key: string): Set<string> {
        const types = this.types.get(key);
        return types ? types : new Set<string>();
    }

    abstract getID(): string;


    // ================================ SETTERS ================================

    setTypes(key: string, types: Set<string>) {
        this.types.set(key, types);
        const managerGraphics = this.graphicsWrapper?.managerGraphicsMap?.get(key);
        if (managerGraphics) managerGraphics.types = types;
    }

    // ================================ TOGGLE =================================

    disableType(key: string, type: string) {
        this.graphicsWrapper?.managerGraphicsMap?.get(key)?.toggleType(type, false);
    }

    enableType(key: string, type: string) {
        this.graphicsWrapper?.managerGraphicsMap?.get(key)?.toggleType(type, true);
    }

    disable() {
        this.isEnabled = false;
    }

    enable() {
        this.isEnabled = true;
        this.init();
    }
}