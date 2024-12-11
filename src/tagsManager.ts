import { getColor } from './colors';

export class Tag {
    type: string;
    color: Uint8Array;

    constructor(type: string, color: Uint8Array) {
        this.type = type;
        this.color = color;
    }

    setColor(color: Uint8Array) {
        this.color = color;
    }
}

export class TagsManager {
    tags: Tag[];
    sVariation: number = 0.2;
    vVariation: number = 0.3;
    _eventTarget: EventTarget;
    
    constructor() {
        this._eventTarget = new EventTarget();
        this.tags = [];
    }

    clear() : void {
        const types = this.getTagTypes();
        this.tags = [];
        this._eventTarget.dispatchEvent(new MapRemoveEvent(types));
    }

    setColor(type: string, color: Uint8Array) : void {
        this.getTagByType(type)?.setColor(color);
        this._eventTarget.dispatchEvent(new MapChangeEvent(type, color));
    }

    addTagType(type: string, x? : number) : void {
        const color = getColor(x);
        this.tags.push(new Tag(type, color));
        this._eventTarget.dispatchEvent(new MapAddEvent(type, color));
    }

    getTagByType(type: string) : Tag | null {
        const tag = this.tags.find(tag => tag.type == type);
        return tag ? tag : null;
    }

    getColorByType(type: string) : Uint8Array | null {
        const tag = this.getTagByType(type);
        return tag? tag.color : null;
    }

    getNumberOfTags() : number {
        return this.tags.length;
    }

    getTagIndex(type: string) : number {
        return this.tags.findIndex(tag => tag.type == type);
    }

    getTagTypes() : string[] {
        return this.tags.map(tag => tag.type);
    }

    containsTypes(types: string[]) : boolean {
        for (const type of types) {
            if (!this.getTagByType(type)) return false;
        }
        return true;
    }

    matchesTypes(types: string[]) : boolean {
        return types.sort().join(',') === this.getTagTypes().join(',');
    }
    
    update(types: Set<string>) : void {
        this.clear();
        let i = 0;
        types.forEach(type => {
            this.addTagType(type, i / types.size);
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