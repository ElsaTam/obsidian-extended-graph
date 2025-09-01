
import { Component } from "obsidian";
import { evaluateCMap, GraphInstances, GraphStateDataQuery, hex2int, LINK_KEY, NONE_COLOR, SettingQuery } from "../internal";
import * as Color from '../colors/color-bits';

class Interactive {
    type: string;
    color: Color.Color;
    isActive: boolean;

    constructor(type: string, color: Color.Color) {
        this.type = type;
        this.color = color;
        this.isActive = true;
    }

    setColor(color: Color.Color) {
        this.color = color;
    }
}

export class InteractiveManager extends Component {
    interactives: Map<string, Interactive>;
    name: string;
    instances: GraphInstances;

    constructor(instances: GraphInstances, name: string) {
        super();
        this.interactives = new Map<string, Interactive>();
        this.instances = instances;
        this.name = name;
    }

    disable(types: string[]): void {
        const disabledTypes: string[] = [];
        types.forEach(type => {
            const interactive = this.interactives.get(type);
            if (interactive) {
                interactive.isActive = false;
                disabledTypes.push(type);
            }
        });
        if (disabledTypes.length > 0) this.instances.interactiveEventsDispatcher.onInteractivesDisabled(this.name, disabledTypes);
    }

    enable(types: string[]): void {
        const enabledTypes: string[] = [];
        types.forEach(type => {
            const interactive = this.interactives.get(type);
            if (interactive) {
                interactive.isActive = true;
                enabledTypes.push(type);
            }
        });
        if (enabledTypes.length > 0) this.instances.interactiveEventsDispatcher.onInteractivesEnabled(this.name, enabledTypes);
    }

    isActive(type: string): boolean {
        const interactive = this.interactives.get(type);
        if (!interactive) return false;

        return interactive.isActive;
    }

    isActiveBasedOnTypes(nodeTypes: string[]): boolean {
        // Add the types if they don't exist
        this.addTypes(nodeTypes.filter(type => !this.interactives.has(type)));

        const activeTypes = this.getTypes().filter(type => this.isActive(type));
        switch (GraphStateDataQuery.getLogicType(this.instances, this.name)) {
            case "AND":
                return activeTypes.every(activeType => nodeTypes.includes(activeType));
            case "OR":
                return activeTypes.some(activeType => nodeTypes.includes(activeType));
        }
    }

    setColor(type: string, color: Color.Color): void {
        const interactive = this.interactives.get(type);
        if (!interactive) return;

        interactive.setColor(color);
        this.instances.interactiveEventsDispatcher.onInteractiveColorChanged(this.name, type, color);
    }

    removeTypes(types: Set<string> | string[]) {
        types.forEach(type => {
            this.interactives.delete(type);
        });
        this.recomputeColors();
        this.instances.interactiveEventsDispatcher.onInteractivesRemoved(this.name, types);
    }

    addTypes(types: Set<string> | string[]): void {
        if ([...types].length === 0) return;

        const colorsMaps = new Map<string, Color.Color>();
        const allTypes = new Set<string>([...this.interactives.keys(), ...types].sort());
        const allTypesWithoutNone = new Set<string>(allTypes);
        allTypesWithoutNone.delete(this.instances.settings.interactiveSettings[this.name].noneType);
        types.forEach(type => {
            if (SettingQuery.excludeType(this.instances.settings, this.name, type)) {
                return;
            }
            if (this.interactives.has(type)) return;

            let color = this.tryComputeColorFromType(type);
            if (!color) {
                const nColors = allTypesWithoutNone.size;
                const i = [...allTypesWithoutNone].indexOf(type);
                color = this.computeColorFromIndex(i, nColors);
            }

            colorsMaps.set(type, color);
            this.interactives.set(type, new Interactive(type, color));
        });
        this.interactives = new Map([...this.interactives.entries()].sort());
        this.recomputeColors();
        if (colorsMaps.size > 0) {
            this.instances.interactiveEventsDispatcher.onInteractivesAdded(this.name, colorsMaps);
        }
    }

    getColor(type: string): Color.Color {
        const interactive = this.interactives.get(type);
        return interactive ? interactive.color : 0;
    }

    getTypes(): string[] {
        return Array.from(this.interactives.keys());
    }

    getTypesWithoutNone(): string[] {
        const types = this.getTypes();
        types.remove(this.instances.settings.interactiveSettings[this.name].noneType);
        return types;
    }

    update(types: Set<string>): void {
        this.interactives.clear();
        //types.add(this.instances.settings.interactiveSettings[this.name].noneType);
        this.addTypes(types);
    }

    recomputeColors(): void {
        this.interactives.forEach((interactive, type) => {
            const color = this.tryComputeColorFromType(type);
            if (color) this.setColor(type, color);
        });
    }

    recomputeColor(type: string): void {
        if (!this.interactives.has(type)) return;

        const color = this.tryComputeColorFromType(type);
        if (color) this.setColor(type, color);
    }

    private tryComputeColorFromType(type: string): Color.Color | null {
        let color: Color.Color;
        // Check if the type has a specific color set from the user
        const colorSettings = this.instances.settings.interactiveSettings[this.name].colors.find(
            p => p.type === type || (p.recursive && type.startsWith(p.type.endsWith("/") ? p.type : (p.type + "/")))
        )?.color;
        if (colorSettings) {
            color = hex2int(colorSettings);
        }
        // Else, check if it's the "none" type
        else if (type === this.instances.settings.interactiveSettings[this.name].noneType) {
            if (this.name === LINK_KEY) {
                color = this.instances.renderer.colors.line.rgb;
            }
            else {
                color = NONE_COLOR;
            }
        }
        // Else, apply the palette
        else {
            const allTypesWithoutNone = [...this.interactives.keys()];
            allTypesWithoutNone.remove(this.instances.settings.interactiveSettings[this.name].noneType);
            const nColors = allTypesWithoutNone.length;
            const i = allTypesWithoutNone.indexOf(type);
            if (i < 0) {
                return null;
            }
            color = this.computeColorFromIndex(i, nColors);
        }

        return color;
    }

    private computeColorFromIndex(index: number, nColors: number): Color.Color {
        const x = nColors === 1 ? 0.5 : index / (nColors - 1);
        return evaluateCMap(x, this.instances.settings.interactiveSettings[this.name].colormap, this.instances.settings);
    }
}