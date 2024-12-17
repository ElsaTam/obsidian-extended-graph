
import { Component, WorkspaceLeaf } from "obsidian";
import { ExtendedGraphSettings } from "../settings";
import { getColor } from "../colors/colors";
import { FUNC_NAMES, NONE_COLOR, NONE_TYPE } from "src/globalVariables";
import { GraphViewData } from "src/views/viewData";

export class Interactive {
    type: string;
    color: Uint8Array;
    isActive: boolean;

    constructor(type: string, color: Uint8Array) {
        FUNC_NAMES && console.log("[Interactive] new");
        this.type = type;
        this.color = color;
        this.isActive = true;
    }

    setColor(color: Uint8Array) {
        FUNC_NAMES && console.log("[Interactive] setColor");
        this.color = color;
    }
}

export class InteractiveManager extends Component {
    interactives: Map<string, Interactive>;
    leaf: WorkspaceLeaf;
    settings: ExtendedGraphSettings;
    name: string;
    
    constructor(leaf: WorkspaceLeaf, settings: ExtendedGraphSettings, name: string) {
        FUNC_NAMES && console.log("[InteractiveManager] new");
        super();
        this.interactives = new Map<string, Interactive>();
        this.leaf = leaf;
        this.settings = settings;
        this.name = name;
    }

    clear() : void {
        FUNC_NAMES && console.log("[InteractiveManager] clear");
        const types = this.getTypes();
        this.interactives.clear();
        this.leaf.trigger(`extended-graph:clear-${this.name}-types`, types);
    }

    disable(types: string[]) : void {
        FUNC_NAMES && console.log("[InteractiveManager] disable");
        let disabledTypes: string[] = [];
        types.forEach(type => {
            let interactive = this.interactives.get(type);
            (interactive) && (interactive.isActive = false, disabledTypes.push(type));
        });
        (disabledTypes.length > 0) && (this.leaf.trigger(`extended-graph:disable-${this.name}s`, disabledTypes));
    }

    enable(types: string[]) : void {
        FUNC_NAMES && console.log("[InteractiveManager] enable");
        let enabledTypes: string[] = [];
        types.forEach(type => {
            let interactive = this.interactives.get(type);
            (interactive) && (interactive.isActive = true, enabledTypes.push(type));
        });
        (enabledTypes.length > 0) && (this.leaf.trigger(`extended-graph:enable-${this.name}s`, enabledTypes));
    }

    loadView(viewData: GraphViewData) : void {
        FUNC_NAMES && console.log("[InteractiveManager] loadView");

        // Enable/Disable tags
        let tagsToDisable: string[] = [];
        let tagsToEnable: string[] = [];
        this.getTypes().forEach(type => {
            let interactive = this.interactives.get(type);
            if (!interactive) return;
            if (interactive.isActive && viewData.disabledTags.includes(type)) {
                interactive.isActive = false;
                tagsToDisable.push(type);
            }
            else if (interactive.isActive && !viewData.disabledTags.includes(type)) {
                interactive.isActive = true;
                tagsToEnable.push(type);
            }
        });

        (tagsToDisable.length > 0) && (this.leaf.trigger(`extended-graph:disable-${this.name}s`, tagsToDisable));
        (tagsToEnable.length > 0) && (this.leaf.trigger(`extended-graph:enable-${this.name}s`, tagsToEnable));
    }

    isActive(type: string) : boolean {
        let interactive = this.interactives.get(type);
        if (!interactive) return false;

        return interactive.isActive;
    }

    setColor(type: string, color: Uint8Array) : void {
        FUNC_NAMES && console.log("[InteractiveManager] setColor");
        let interactive = this.interactives.get(type);
        if (!interactive) return;

        interactive.setColor(color);
        this.leaf.trigger(`extended-graph:change-${this.name}-color`, type, color);
    }

    addType(type: string, x: number) : void {
        FUNC_NAMES && console.log("[InteractiveManager] addType");
        const color = (type === NONE_TYPE) ? NONE_COLOR : getColor(this.settings.colormaps[this.name], x);
        this.interactives.set(type, new Interactive(type, color));
        this.leaf.trigger(`extended-graph:add-${this.name}-type`, type, color);
    }

    addTypes(types: Set<string>) : void {
        FUNC_NAMES && console.log("[InteractiveManager] addTypes");
        let i = 0;
        let colorsMaps = new Map<string, Uint8Array>;
        types.forEach(type => {
            const color = (type === NONE_TYPE) ? NONE_COLOR : getColor(this.settings.colormaps[this.name], i / types.size);
            colorsMaps.set(type, color);
            this.interactives.set(type, new Interactive(type, color));
            ++i;
        });
        this.leaf.trigger(`extended-graph:add-${this.name}-types`, colorsMaps);
    }

    getInteractive(type: string) : Interactive {
        const interactive = this.interactives.get(type);
        if (!interactive) {
            throw new Error(`No interactive (${this.name}) of type ${type}`);
        }
        return interactive;
    }

    getColor(type: string) : Uint8Array {
        return this.getInteractive(type).color;
    }

    getTypes() : string[] {
        return Array.from(this.interactives.keys());
    }

    containsTypes(types: string[]) : boolean {
        for (const type of types) {
            if (!this.getInteractive(type)) return false;
        }
        return true;
    }
    
    update(types: Set<string>) : void {
        FUNC_NAMES && console.log("[InteractiveManager] update");
        types.add(NONE_TYPE);
        this.clear();
        this.addTypes(types);
    }

    recomputeColors() : void {
        FUNC_NAMES && console.log("[InteractiveManager] recomputeColors");
        let i = 0;
        this.interactives.forEach((interactive, type) => {
            const color = (type === NONE_TYPE) ? NONE_COLOR : getColor(this.settings.colormaps[this.name], i / (this.interactives.size - 1));
            this.setColor(type, color);
            ++i;
        });
    }
}