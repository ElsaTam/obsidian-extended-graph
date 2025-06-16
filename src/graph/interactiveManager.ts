
import { Component } from "obsidian";
import { evaluateCMap, GraphInstances, GraphStateDataQuery, hex2rgb, int2rgb, LINK_KEY, NONE_COLOR, SettingQuery } from "src/internal";

class Interactive {
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
        if (disabledTypes.length > 0) this.instances.dispatcher.onInteractivesDisabled(this.name, disabledTypes);
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
        if (enabledTypes.length > 0) this.instances.dispatcher.onInteractivesEnabled(this.name, enabledTypes);
    }

    isActive(type: string): boolean {
        const interactive = this.interactives.get(type);
        if (!interactive) return false;

        return interactive.isActive;
    }

    isActiveBasedOnTypes(nodeTypes: string[]): boolean {
        const activeTypes = this.getTypes().filter(type => this.isActive(type));
        switch (GraphStateDataQuery.getLogicType(this.instances, this.name)) {
            case "AND":
                return activeTypes.every(activeType => nodeTypes.includes(activeType));
            case "OR":
                return activeTypes.some(activeType => nodeTypes.includes(activeType));
        }
    }

    setColor(type: string, color: Uint8Array): void {
        const interactive = this.interactives.get(type);
        if (!interactive) return;

        interactive.setColor(color);
        this.instances.dispatcher.onInteractiveColorChanged(this.name, type, color);
    }

    removeTypes(types: Set<string> | string[]) {
        types.forEach(type => {
            this.interactives.delete(type);
        });
        this.recomputeColors();
        this.instances.dispatcher.onInteractivesRemoved(this.name, types);
    }

    addTypes(types: Set<string> | string[]): void {
        const colorsMaps = new Map<string, Uint8Array>();
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
            this.instances.dispatcher.onInteractivesAdded(this.name, colorsMaps);
        }
    }

    getColor(type: string): Uint8Array {
        const interactive = this.interactives.get(type);
        return interactive ? interactive.color : new Uint8Array([0, 0, 0]);
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

    private tryComputeColorFromType(type: string): Uint8Array | null {
        let color: Uint8Array;
        const colorSettings = this.instances.settings.interactiveSettings[this.name].colors.find(p => p.type === type)?.color;
        if (colorSettings) {
            color = hex2rgb(colorSettings);
        }
        else if (type === this.instances.settings.interactiveSettings[this.name].noneType) {
            if (this.name === LINK_KEY) {
                color = int2rgb(this.instances.renderer.colors.line.rgb);
            }
            else {
                color = NONE_COLOR;
            }
        }
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

    private computeColorFromIndex(index: number, nColors: number) {
        const x = nColors === 1 ? 0.5 : index / (nColors - 1);
        return evaluateCMap(x, this.instances.settings.interactiveSettings[this.name].colormap, this.instances.settings)
    }
}