import { getColor } from './colors';

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

export class TagsManager {
    tags: Map<string, Tag>;
    sVariation: number = 0.2;
    vVariation: number = 0.3;
    _eventTarget: EventTarget;
    
    constructor() {
        this._eventTarget = new EventTarget();
        this.tags = new Map<string, Tag>();
    }

    clear() : void {
        const types = this.getTypes();
        this.tags.clear();
        this._eventTarget.dispatchEvent(new MapRemoveEvent(types));
    }

    disable(type: string) : void {
        let tag = this.tags.get(type);
        if (!tag) return;

        tag.isActive = false;
        this._eventTarget.dispatchEvent(new MapChangeEvent(type, tag.color));
    }

    enable(type: string) : void {
        let tag = this.tags.get(type);
        if (!tag) return;

        tag.isActive = true;
        this._eventTarget.dispatchEvent(new MapChangeEvent(type, tag.color));
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
        this._eventTarget.dispatchEvent(new MapChangeEvent(type, color));
    }

    addType(type: string, x? : number) : void {
        const color = getColor(x);
        this.tags.set(type, new Tag(type, color));
        this._eventTarget.dispatchEvent(new MapAddEvent(type, color));
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

    on(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
        this._eventTarget.addEventListener(type, callback, options);
    }
}

export class MapChangeEvent extends Event {
    tagType: string;
    tagColor: Uint8Array;

    constructor(type: string, color: Uint8Array) {
        super('change');
        this.tagType = type;
        this.tagColor = color;
    }
}

export class MapAddEvent extends Event {
    tagType: string;
    tagColor: Uint8Array;

    constructor(type: string, color: Uint8Array) {
        super('add');
        this.tagType = type;
        this.tagColor = color;
    }
}

export class MapRemoveEvent extends Event {
    tagTypes: string[];

    constructor(types: string[]) {
        super('remove');
        this.tagTypes = types;
    }
}