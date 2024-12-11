import { Container, Sprite, Texture, Graphics }  from 'pixi.js';
import { GraphNode }  from 'src/node';
import { ObsidianNode } from 'types';
import { TagsManager } from './tagsManager';

export class GraphNodeContainer extends Container {
    _node: GraphNode;
    _sprite: Sprite | null;
    _size: number;
    _tagArcs: Map<string, Graphics>;
    name: string;

    constructor(node: GraphNode, texture: Texture) {
        super();
        this.width = texture.width;
        this.height = texture.height;
        this._size = Math.min(texture.width, texture.height);
        this._node = node;
        this._tagArcs = new Map<string, Graphics>();
        this.name = node.getID();

        // Sprite
        this._sprite = Sprite.from(texture);
        // @ts-ignore
        this._sprite.name = "image";
        this._sprite.anchor.set(0.5);
        this.addChild(this._sprite);

        // Mask
        let mask = new Graphics()
            .beginFill(0xFFFFFF)
            .drawCircle(0, 0, 0.5 * this._size)
            .endFill();
        this._sprite.mask = mask;
        this._sprite.addChild(mask);

        // Border
        let border = new Graphics()
            .lineStyle(0.05 * this._size, this._node.getColor())
            .drawCircle(0, 0, 0.5 * this._size)
            .endFill();
        border.isMask = false;
        border.isSprite = true;
        border.renderable = true;
        // @ts-ignore
        border.name = "border";
        this.addChild(border);

        // Arc tags
        //this._node.getTags().forEach(tag => {
        //    this.addArc(tag);
        //});
    }

    removeArcs() {
        this._tagArcs.forEach((arc: Graphics, type: string) => {
            this.removeChild(arc);
        });
        this._tagArcs.clear;
    }

    addArcs(tagsManager: TagsManager) {
        const thickness = 0.09;
        const inset = 0.03;
        const gap = 0.2;
        const maxArcSize = Math.PI / 2;
        const nTags = tagsManager.getNumberOfTags();
        const arcSize = Math.min(2 * Math.PI / nTags, maxArcSize);
    
        this._node.getTags()?.forEach(type => {
            const color = tagsManager.getColorByType(type);
            if (!color) return;
        
            const tagIndex = tagsManager.getTagIndex(type);
        
            const arc = new Graphics()
                .lineStyle(thickness * this._size, color)
                .arc(
                    0, 0,
                    (0.5 + thickness + inset) * this._size,
                    arcSize * tagIndex + gap * 0.5,
                    arcSize * (tagIndex + 1) - gap * 0.5
                )
                .endFill();
            // @ts-ignore
            arc.name = "arc-" + type;
            this.addChild(arc);
            this._tagArcs.set(type, arc);
        });
    }

    updateArc(type: string, tagsManager: TagsManager) : void {
        this._tagArcs.forEach((arc: Graphics) => {
            // @ts-ignore
            arc.lineColor = tagsManager.getColorByType(type);
        })
    }

    getSize() : number {
        return this._size;
    }

    getObsidianNode() : ObsidianNode {
        return this._node.obsidianNode;
    }

    getGraphNode() : GraphNode {
        return this._node;
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