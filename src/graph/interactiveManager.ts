
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

        const viewTypesToDisable: string[] = this.name === "tag" ? viewData.disabledTags : viewData.disabledLinks;
        // Enable/Disable tags
        let toDisable: string[] = [];
        let toEnable: string[] = [];
        this.getTypes().forEach(type => {
            let interactive = this.interactives.get(type);
            if (!interactive) return;
            if (interactive.isActive && viewTypesToDisable.includes(type)) {
                interactive.isActive = false;
                toDisable.push(type);
            }
            else if (!interactive.isActive && !viewTypesToDisable.includes(type)) {
                interactive.isActive = true;
                toEnable.push(type);
            }
        });

        (toDisable.length > 0) && (this.leaf.trigger(`extended-graph:disable-${this.name}s`, toDisable));
        (toEnable.length > 0) && (this.leaf.trigger(`extended-graph:enable-${this.name}s`, toEnable));
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

    removeTypes(types: Set<string>) {
        types.forEach(type => {
            this.interactives.delete(type);
        });
        this.leaf.trigger(`extended-graph:remove-${this.name}-types`, types);
    }

    addTypes(types: Set<string>) : void {
        FUNC_NAMES && console.log("[InteractiveManager] addTypes");
        let colorsMaps = new Map<string, Uint8Array>();
        let allTypes = new Set<string>([...this.interactives.keys(), ...types]);
        let allTypesWithoutNone = new Set<string>(allTypes);
        allTypesWithoutNone.delete(NONE_TYPE);
        types.forEach(type => {
            if (this.interactives.get(type)) return;
            let color: Uint8Array;
            if (type === NONE_TYPE) {
                color = NONE_COLOR;
            }
            else {
                const nColors = allTypesWithoutNone.size;
                const i = [...allTypesWithoutNone.values()].indexOf(type);
                const x = i / nColors;
                color = getColor(this.settings.colormaps[this.name], x);
            }
            colorsMaps.set(type, color);
            this.interactives.set(type, new Interactive(type, color));
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
            let nColors = this.interactives.size;
            if (this.interactives.has(NONE_TYPE)) nColors -= 1;
            const color = (type === NONE_TYPE) ? NONE_COLOR : getColor(this.settings.colormaps[this.name], i / nColors);
            this.setColor(type, color);
            ++i;
        });
    }
}