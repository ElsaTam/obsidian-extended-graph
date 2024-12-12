import { Component, WorkspaceLeaf } from 'obsidian';
import { getColor } from './colors';
import { ExtendedGraphSettings } from './settings';

export class Tag {
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

export class TagsManager extends Component {
    tags: Map<string, Tag>;
    leaf: WorkspaceLeaf;
    settings: ExtendedGraphSettings;
    
    constructor(leaf: WorkspaceLeaf, settings: ExtendedGraphSettings) {
        super();
        this.tags = new Map<string, Tag>();
        this.leaf = leaf;
        this.settings = settings;
    }

    onload(): void {
        console.log("Loading Tags Manager");
    }

    onunload(): void {
        console.log("Unload Tags Manager");
    }

    clear() : void {
        const types = this.getTypes();
        this.tags.clear();
        this.leaf.trigger('extended-graph:clear-tag-types', types);
    }

    disable(type: string) : void {
        let tag = this.tags.get(type);
        if (!tag) return;

        tag.isActive = false;
        this.leaf.trigger('extended-graph:disable-tag', type);
    }

    enable(type: string) : void {
        let tag = this.tags.get(type);
        if (!tag) return;

        tag.isActive = true;
        this.leaf.trigger('extended-graph:enable-tag', type);
    }

    isActive(type: string) : boolean {
        let tag = this.tags.get(type);
        if (!tag) return false;

        return tag.isActive;
    }

    setColor(type: string, color: Uint8Array) : void {
        let tag = this.tags.get(type);
        if (!tag) return;

        tag.setColor(color);
        this.leaf.trigger('extended-graph:change-tag-color', type, color);
    }

    addType(type: string, x: number) : void {
        const color = getColor(this.settings.colormap, x);
        this.tags.set(type, new Tag(type, color));
        this.leaf.trigger('extended-graph:add-tag-type', type, color);
    }

    getTag(type: string) : Tag | null {
        const tag = this.tags.get(type);
        return tag ? tag : null;
    }

    getColor(type: string) : Uint8Array | null {
        const tag = this.tags.get(type);
        return tag ? tag.color : null;
    }

    getNumberOfTags() : number {
        return this.tags.size;
    }

    getTagIndex(type: string) : number {
        return Array.from(this.tags.keys()).findIndex(currentType => currentType == type);
    }

    getTypes() : string[] {
        return Array.from(this.tags.keys());
    }

    containsTypes(types: string[]) : boolean {
        for (const type of types) {
            if (!this.getTag(type)) return false;
        }
        return true;
    }

    matchesTypes(types: string[]) : boolean {
        return types.sort().join(',') === this.getTypes().join(',');
    }
    
    update(types: Set<string>) : void {
        this.clear();
        let i = 0;
        types.forEach(type => {
            this.addType(type, i / types.size);
            ++i;
        });
    }

    recomputeColors() : void {
        let i = 0;
        this.tags.forEach((tag, type) => {
            const color = getColor(this.settings.colormap, i / this.tags.size);
            this.setColor(type, color);
            ++i;
        });
    }
}