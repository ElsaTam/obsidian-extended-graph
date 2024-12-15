
import { Component, WorkspaceLeaf } from "obsidian";
import { ExtendedGraphSettings } from "../settings";
import { getColor } from "../colors/colors";
import { NONE_TYPE } from "src/globalVariables";

export class Interactive {
    type: string;
    color: Uint8Array;
    isActive: boolean;

    constructor(type: string, color: Uint8Array) {
        this.type = type;
        this.color = color;
        this.isActive = true;
    }

    setColor(color: Uint8Array) {
        this.color = color;
    }
}

export class InteractiveManager extends Component {
    interactives: Map<string, Interactive>;
    leaf: WorkspaceLeaf;
    settings: ExtendedGraphSettings;
    name: string;
    
    constructor(leaf: WorkspaceLeaf, settings: ExtendedGraphSettings, name: string) {
        super();
        this.interactives = new Map<string, Interactive>();
        this.leaf = leaf;
        this.settings = settings;
        this.name = name;
    }

    onload(): void {
        
    }

    onunload(): void {
        
    }

    clear() : void {
        const types = this.getTypes();
        this.interactives.clear();
        this.leaf.trigger(`extended-graph:clear-${this.name}-types`, types);
    }

    disable(types: string[]) : void {
        let disabledTypes: string[] = [];
        types.forEach(type => {
            let interactive = this.interactives.get(type);
            (interactive) && (interactive.isActive = false, disabledTypes.push(type));
        });
        (disabledTypes.length > 0) && (this.leaf.trigger(`extended-graph:disable-${this.name}s`, disabledTypes));
    }

    enable(types: string[]) : void {
        let enabledTypes: string[] = [];
        types.forEach(type => {
            let interactive = this.interactives.get(type);
            (interactive) && (interactive.isActive = true, enabledTypes.push(type));
        });
        (enabledTypes.length > 0) && (this.leaf.trigger(`extended-graph:enable-${this.name}s`, enabledTypes));
    }

    isActive(type: string) : boolean {
        let interactive = this.interactives.get(type);
        if (!interactive) return false;

        return interactive.isActive;
    }

    setColor(type: string, color: Uint8Array) : void {
        let interactive = this.interactives.get(type);
        if (!interactive) return;

        interactive.setColor(color);
        this.leaf.trigger(`extended-graph:change-${this.name}-color`, type, color);
    }

    addType(type: string, x: number) : void {
        const color = (type === NONE_TYPE) ? new Uint8Array([125, 125, 125]) : getColor(this.settings.colormaps[this.name], x);
        this.interactives.set(type, new Interactive(type, color));
        this.leaf.trigger(`extended-graph:add-${this.name}-type`, type, color);
    }

    getInteractive(type: string) : Interactive | null {
        const interactive = this.interactives.get(type);
        return interactive ? interactive : null;
    }

    getColor(type: string) : Uint8Array | null {
        const interactive = this.interactives.get(type);
        return interactive ? interactive.color : null;
    }

    getNumberOfInteractives() : number {
        return this.interactives.size - 1; // don't count NONE_TYPE
    }

    getInteractiveIndex(type: string) : number {
        return Array.from(this.interactives.keys()).findIndex(currentType => currentType == type);
    }

    getTypes() : string[] {
        let types = Array.from(this.interactives.keys());
        return types;
    }

    containsTypes(types: string[]) : boolean {
        for (const type of types) {
            if (!this.getInteractive(type)) return false;
        }
        return true;
    }
    
    update(types: Set<string>) : void {
        this.clear();
        let i = 0;
        types.add(NONE_TYPE);
        types.forEach(type => {
            this.addType(type, i / types.size);
            ++i;
        });
    }

    recomputeColors() : void {
        let i = 0;
        this.interactives.forEach((interactive, type) => {
            const color = (type === NONE_TYPE) ? new Uint8Array([125, 125, 125]) : getColor(this.settings.colormaps[this.name], i / this.getNumberOfInteractives());
            this.setColor(type, color);
            ++i;
        });
    }
}