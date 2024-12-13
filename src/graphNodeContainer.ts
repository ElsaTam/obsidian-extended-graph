import { Container, Sprite, Texture, Graphics }  from 'pixi.js';
import { NodeWrapper, Node }  from './node';
import { InteractiveManager } from './interactiveManager';

class Arc extends Graphics {
    thickness: number = 0.09;
    inset: number = 0.03;
    gap: number = 0.2;
}

export class GraphNodeContainer extends Container {
    _nodeWrapper: NodeWrapper;
    _sprite: Sprite | null;
    _size: number;
    _tagArcs: Map<string, Arc>;
    _background: Graphics;
    borderFactor: number = 0.06;
    maxArcSize: number = Math.PI / 2;
    name: string;

    constructor(nodeWrapper: NodeWrapper, texture: Texture, radius: number) {
        super();
        this._size = Math.min(texture.width, texture.height);
        this._nodeWrapper = nodeWrapper;
        this._tagArcs = new Map<string, Arc>();
        this.name = nodeWrapper.getID();

        // Background
        this._background = new Graphics()
            .beginFill(0xFFFFFF)
            .drawCircle(0, 0, 0.5 * this._size)
            .endFill();
        this._background.alpha = 0;
        this._background.scale.set(1.01);
        this.addChild(this._background);

        // Sprite
        this._sprite = Sprite.from(texture);
        // @ts-ignore
        this._sprite.name = "image";
        this._sprite.anchor.set(0.5);
        this.addChild(this._sprite);
        this._sprite.scale.set((1 - this.borderFactor));

        // Mask
        let mask = new Graphics()
            .beginFill(0xFFFFFF)
            .drawCircle(0, 0, 0.5 * this._size)
            .endFill();
        this._sprite.mask = mask;
        this._sprite.addChild(mask);

        // Scale
        this.scale.set(radius * 2 / this._size);
    }

    removeArcs() {
        this._tagArcs.forEach((arc: Graphics, type: string) => {
            this.removeChild(arc);
        });
        this._tagArcs.clear;
    }

    addArcs(tagsManager: InteractiveManager) {
        const nTags = tagsManager.getNumberOfInteractives();
        const arcSize = Math.min(2 * Math.PI / nTags, this.maxArcSize);
    
        this._nodeWrapper.getTags()?.forEach(type => {
            const color = tagsManager.getColor(type);
            if (!color) return;
        
            const tagIndex = tagsManager.getInteractiveIndex(type);
            const arc = this.createArc(type, color, arcSize, tagIndex);
            this.addChild(arc);
            this._tagArcs.set(type, arc);
        });
    }

    createArc(type: string, color: Uint8Array, arcSize: number, index: number) : Arc {
        const arc = new Arc();

        arc.lineStyle(arc.thickness * this._size, color)
            .arc(
                0, 0,
                (0.5 + arc.thickness + arc.inset) * this._size,
                arcSize * index + arc.gap * 0.5,
                arcSize * (index + 1) - arc.gap * 0.5
            )
            .endFill();
        
        // @ts-ignore
        arc.name = "arc-" + type;
        return arc;
    }

    updateArc(type: string, color: Uint8Array, tagsManager: InteractiveManager) : void {
        let arc = this._tagArcs.get(type);
        if (!arc) return;

        this.removeChild(arc);
        this._tagArcs.delete(type);

        const tagIndex = tagsManager.getInteractiveIndex(type);
        const nTags = tagsManager.getNumberOfInteractives();
        const arcSize = Math.min(2 * Math.PI / nTags, this.maxArcSize);
        arc = this.createArc(type, color, arcSize, tagIndex);
        this.addChild(arc);
        this._tagArcs.set(type, arc);
    }

    updateBackgroundColor(backgroundColor: Uint8Array) : void {
        this._background.clear();
        this._background.beginFill(backgroundColor)
            .drawCircle(0, 0, 0.5 * this._size)
            .endFill();
    }

    updateAlpha(type: string, isEnable: boolean, tagsManager: InteractiveManager) : void {
        const arc = this._tagArcs.get(type);
        if (!arc) return;

        arc.alpha = isEnable ? 1 : 0.1;

        let isFaded = !Array.from(this._tagArcs.keys()).some((type: string) => tagsManager.isActive(type));

        if (isFaded) {
            this.children.forEach((child: Graphics) => {
                child.alpha = 0.1;
            })
            this._background.alpha = 1;
        }
        else {
            this.children.forEach((child: Graphics) => {
                if (!child.name?.startsWith("arc-")) child.alpha = 1;
            })
            this._background.alpha = 0;
        }
    }

    getSize() : number {
        return this._size;
    }

    getObsidianNode() : Node {
        return this._nodeWrapper.node;
    }

    getGraphNode() : NodeWrapper {
        return this._nodeWrapper;
    }

    containsTypes(types: string[]) : boolean {
        types.forEach(type => {
            if (!this._tagArcs.get(type)) return false;
        });
        return true;
    }

    matchesTypes(types: string[]) : boolean {
        return types.sort().join(',') === Array.from(this._tagArcs.keys()).join(',');
    }
}