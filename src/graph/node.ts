import { App, getAllTags, TFile } from 'obsidian';
import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { InteractiveManager } from './interactiveManager';
import { ARC_INSET, ARC_THICKNESS, FUNC_NAMES, NODE_CIRCLE_RADIUS, NODE_CIRCLE_X, NODE_CIRCLE_Y, NONE_TYPE } from 'src/globalVariables';
import { Renderer } from './renderer';
import { ExtendedGraphSettings } from 'src/settings/settings';

export interface Node {
    circle: Graphics,
    color: {
        a: number;
        rgb: number;
    }
    text: {
        alpha: number;
        _text: string;
    }
    id: string;
    weight: number;
    x: number;
    y: number;
    rendered: boolean;
    type: string;
    forward: {[id: string] : Node};
    reverse: {[id: string] : Node};
    renderer: Renderer;
    getFillColor: () => {rgb: number, a: number};
    getSize: () => number;
}

class Arc extends Graphics {
    thickness: number = ARC_THICKNESS;
    inset: number = ARC_INSET;
    gap: number = 0.2;
    isActive: boolean = true;
    name: string;
}

export interface NodeGraphics {
    sprite: Sprite | null;
    borderFactor: number | null;
    tagArcs: Map<string, Arc> | null;
    maxArcSize: number | null;
    opacityLayer: Graphics | null;
    background: Graphics;
    size: number;
    circleRadius: number; // increase the resolution of the circle
}

export class NodeWrapper extends Container {
    node: Node;
    nodeGraphics: NodeGraphics;
    name: string;
    file: TFile;
    imageUri: string | null;
    tagTypes: string[] | null;
    isActive: boolean = true;
    scaleFactor: number = 1;

    constructor(node: Node, app: App, settings: ExtendedGraphSettings) {
        super();
        this.node = node;
        this.name = node.id;

        // Set values
        this.nodeGraphics = {
            sprite: settings.enableImages ? new Sprite()                : null,
            borderFactor: settings.enableImages ? 0.06                  : null,
            tagArcs: settings.enableTags ? new Map<string, Arc>()       : null,
            maxArcSize: settings.enableTags ? Math.PI / 2               : null,
            opacityLayer: settings.fadeOnDisable ? new Graphics()       : null,
            background: new Graphics(),
            size: 1,
            circleRadius: 10,
        };
        this.tagTypes = settings.enableTags ? [] : null;

        // Get TFile
        const file = app.vault.getFileByPath(node.id);
        if (!file) throw new Error(`Could not find TFile for node ${node.id}.`)
        this.file = file;

        // Get Tags
        (settings.enableTags) && this.updateTags(app, settings);
    }

    // =========================== INITIALIZATION =========================== //

    async init(app: App, keyProperty: string, renderer: Renderer) : Promise<void> {
        const ready: boolean = await this.waitReady(renderer);
        if (!ready) {
            return Promise.reject<void>();
        }

        if (this.nodeGraphics.sprite) {
            
            // Get image URI
            const metadata = app.metadataCache.getFileCache(this.file);
            const frontmatter = metadata?.frontmatter;
            const imageLink = frontmatter ? frontmatter[keyProperty]?.replace("[[", "").replace("]]", "") : null;
            const imageFile = imageLink ? app.metadataCache.getFirstLinkpathDest(imageLink, ".") : null;
            this.imageUri = imageFile ? app.vault.getResourcePath(imageFile) : null;

            // Load texture
            if (this.imageUri) {
                await Assets.load(this.imageUri).then((texture: Texture) => {
                    this.nodeGraphics.size = Math.min(texture.width, texture.height);

                    // Sprite
                    this.nodeGraphics.sprite = Sprite.from(texture);
                    this.nodeGraphics.sprite.width = this.nodeGraphics.size;
                    this.nodeGraphics.sprite.height = this.nodeGraphics.size;
                    this.nodeGraphics.sprite.name = "image";
                    this.nodeGraphics.sprite.anchor.set(0.5);
                    this.addChild(this.nodeGraphics.sprite);
                    this.nodeGraphics.sprite.scale.set((1 - (this.nodeGraphics.borderFactor ? this.nodeGraphics.borderFactor : 0)));
            
                    // Mask
                    let mask = new Graphics()
                        .beginFill(0xFFFFFF)
                        .drawCircle(0, 0, this.nodeGraphics.circleRadius)
                        .endFill();
                    mask.width = this.nodeGraphics.size;
                    mask.height = this.nodeGraphics.size;
                    this.nodeGraphics.sprite.mask = mask;
                    this.nodeGraphics.sprite.addChild(mask);
                });
            }
            else {
                this.nodeGraphics.size = 1;
            }
        }

        // Background
        this.updateBackgroundColor();
        this.addChildAt(this.nodeGraphics.background, 0);

        // Opacity layer
        if (this.nodeGraphics.opacityLayer) {
            this.updateOpacityLayerColor(0xFFFFFF);
            this.nodeGraphics.opacityLayer.alpha = 0;
            this.nodeGraphics.opacityLayer.scale.set(1.1);
            this.addChildAt(this.nodeGraphics.opacityLayer, 1);
        }
        
        // Scale
        this.setScale();

        // Because of async, make sure the container is not already added
        if (this.node.circle?.getChildByName(this.name)) {
            return Promise.reject<void>();
        }

        this.x = NODE_CIRCLE_X;
        this.y = NODE_CIRCLE_Y;

        this.initListener();
    }

    async waitReady(renderer: Renderer) : Promise<boolean> {
        let i = 0;
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                let node = renderer.nodes.find(node => node === this.node);
                if (node && node.circle) {
                    clearInterval(intervalId);
                    resolve(true);
                }
                if (i > 10 || !renderer.nodes.includes(this.node)) {
                    clearInterval(intervalId);
                    resolve(false);
                }
                i += 1;
            }, 100);
        });
    }

    setScale(factor?: number) {
        if (factor) {
            this.scaleFactor = factor;
        }
        this.scale.set(this.scaleFactor * NODE_CIRCLE_RADIUS * 2 / this.nodeGraphics.size);
    }

    // ============================= TAG TYPES ============================== //

    /**
     * Update tags list from the cache
     * @param app 
     */
    updateTags(app: App, settings: ExtendedGraphSettings) : string[] {
        if (!this.tagTypes) {
            throw new Error("[Extended graph] tagTypes is null")
        }
        const metadata = app.metadataCache.getFileCache(this.file);
        let tags = metadata ? getAllTags(metadata)?.map(t => t.replace('#', '')) : [];
        tags = tags?.filter(t => settings.selectedInteractives["tag"].includes(t));
        if (tags?.length == 0) {
            tags.push(NONE_TYPE);
        }
        this.tagTypes = tags ? tags : [];
        return this.tagTypes;
    }

    /**
     * Check if the list of tag types is exactly the same than the types of the
     * node (without regard to order)
     * @param types list of tag types
     * @returns true if it matches
     */
    matchesTagsTypes(types: string[]) : boolean {
        if (!this.tagTypes) {
            throw new Error("[Extended graph] tagTypes is null")
        }
        return types.sort().join(',') === this.tagTypes.join(',');
    }

    hasTagType(type: string) : boolean {
        return this.tagTypes ? this.tagTypes.includes(type) : false;
    }

    // ============================== TAG ARCS ============================== //

    /**
     * Get the arc associated with the type
     * @param type tag type
     * @returns the associated arc
     */
    getArc(type: string) : Arc {
        if (!this.nodeGraphics.tagArcs) {
            throw new Error("[Extended graph] nodeGraphics.tagArcs is null")
        }
        let arc = this.nodeGraphics.tagArcs.get(type);
        if (!arc) {
            throw new Error(`No arc of type ${type} for node ${this.name}.`);
        }
        return arc;
    }
    
    /**
     * Add all arcs to the container
     * @param manager tatgs manager
     */
    addArcs(manager: InteractiveManager) {
        if (!(this.tagTypes && this.nodeGraphics.tagArcs && this.nodeGraphics.maxArcSize)) {
            return;
        }
        const allTypes = manager.getTypes();
        allTypes.remove(NONE_TYPE);
        const nTags = allTypes.length;
        const arcSize = Math.min(2 * Math.PI / nTags, this.nodeGraphics.maxArcSize);
    
        for (const type of this.tagTypes) {
            if (type === NONE_TYPE) continue;
            const oldArc = this.getChildByName(this.getArcName(type));
            if (oldArc) continue;

            try {
                const color = manager.getColor(type);
                const tagIndex = allTypes.findIndex(t => t === type);
                const arc = this.createArc(type, color, arcSize, tagIndex);
                this.addChild(arc);
                this.nodeGraphics.tagArcs.set(type, arc);
            }
            catch (error) { }
        }
    }

    /**
     * Update one arc
     * @param type type of the arc (tag)
     * @param color color of the arc
     * @param tagsManager tags manager
     */
    updateArc(type: string, color: Uint8Array, manager: InteractiveManager) : void {
        if (!this.nodeGraphics.tagArcs) {
            throw new Error("[Extended graph] nodeGraphics.tagArcs is null")
        }
        if (!this.nodeGraphics.maxArcSize) {
            throw new Error("[Extended graph] nodeGraphics.maxArcSize is null")
        }
        this.removeArc(type);
        const allTypes = manager.getTypes();
        allTypes.remove(NONE_TYPE);
        const nTags = allTypes.length;
        const arcSize = Math.min(2 * Math.PI / nTags, this.nodeGraphics.maxArcSize);
        const tagIndex = allTypes.findIndex(t => t === type);
        const arc = this.createArc(type, color, arcSize, tagIndex);
        this.addChild(arc);
        this.nodeGraphics.tagArcs.set(type, arc);
    }

    /**
     * Update the state of the arc (opaque is active, transparent if inactive)
     * @param type tag type
     * @param manager tags manager
     */
    updateArcState(type: string, manager: InteractiveManager) : void {
        if (!this.nodeGraphics.tagArcs) {
            throw new Error("[Extended graph] nodeGraphics.tagArcs is null")
        }
        if (type !== NONE_TYPE) {
            // Update the transparency of the arc
            this.getArc(type).alpha = manager.isActive(type) ? 1 : 0.1;
        }

        // Check if all arcs are disabled
        let isNodeActive = false;
        if (this.nodeGraphics.tagArcs.size > 0) {
            isNodeActive = Array.from(this.nodeGraphics.tagArcs.keys()).some((type: string) => manager.isActive(type));
        }
        else {
            isNodeActive = manager.isActive(NONE_TYPE);
        }
        this.isActive = isNodeActive;

        if (this.nodeGraphics.opacityLayer) {
            // If the node still has active tags
            if (isNodeActive) {
                this.children.forEach((child: Graphics) => {
                    if (child.name && !child.name.startsWith("arc-")) {
                        child.alpha = 1;
                    }
                })
                this.nodeGraphics.opacityLayer.alpha = 0;
            }
            // Else, if the node doesn't have any active tag
            else {
                for (let child of this.children) {
                    if (child.name && !child.name.startsWith("arc-")) {
                        child.alpha = this.nodeGraphics.tagArcs.get(child.name)?.isActive ? 1 : 0.1;
                    }
                    else {
                        child.alpha = 0.1;
                    }
                }
                this.nodeGraphics.opacityLayer.alpha = this.nodeGraphics.sprite ? 1 : 0.8;
            }
        }
    }

    /**
     * Remove one arc
     * @param type tag type
     */
    removeArc(type: string) {
        if (!this.nodeGraphics.tagArcs) {
            throw new Error("[Extended graph] nodeGraphics.tagArcs is null")
        }
        this.removeChild(this.getArc(type));
        this.nodeGraphics.tagArcs.delete(type);
    }
    
    /**
     * Remove all arcs
     */
    removeArcs(types?: string[]) {
        if (!this.nodeGraphics.tagArcs) {
            throw new Error("[Extended graph] nodeGraphics.tagArcs is null")
        }
        this.nodeGraphics.tagArcs.forEach((arc, type) => (!types || types.includes(type)) && this.removeChild(arc));
        this.nodeGraphics.tagArcs.clear();
    }
    
    /**
     * Create an arc. Does not add it to the scene or to the maps.
     * @param type type of the arc (tag)
     * @param color color of the arc
     * @param arcSize size of the arc
     * @param index index of the arc
     * @returns a disconnected Arc object
     */
    private createArc(type: string, color: Uint8Array, arcSize: number, index: number) : Arc {
        const arc = new Arc();

        arc.lineStyle(arc.thickness * this.nodeGraphics.size, color)
            .arc(
                0, 0,
                (0.5 + arc.thickness + arc.inset) * this.nodeGraphics.size,
                arcSize * index + arc.gap * 0.5,
                arcSize * (index + 1) - arc.gap * 0.5
            )
            .endFill();
        
        arc.name = this.getArcName(type);
        return arc;
    }

    private getArcName(type: string) {
        return "arc-" + type;
    }

    // ========================= ALPHA / BACKGROUND ========================= //
    
    updateOpacityLayerColor(backgroundColor: any) : void {
        if (!this.nodeGraphics.opacityLayer) return;
        this.nodeGraphics.opacityLayer.clear();
        this.nodeGraphics.opacityLayer.beginFill(backgroundColor)
            .drawCircle(0, 0, this.nodeGraphics.circleRadius)
            .endFill();
        this.nodeGraphics.opacityLayer.width = this.nodeGraphics.size;
        this.nodeGraphics.opacityLayer.height = this.nodeGraphics.size;
    }

    updateBackgroundColor(color?: number) : void {
        this.nodeGraphics.background.clear();
        this.nodeGraphics.background.beginFill(color ? color : this.node.getFillColor().rgb)
            .drawCircle(0, 0, this.nodeGraphics.circleRadius)
            .endFill();
        this.nodeGraphics.background.width = this.nodeGraphics.size;
        this.nodeGraphics.background.height = this.nodeGraphics.size;
    }

    // =============================== EVENTS ================================ //

    initListener() {
        this.eventMode = 'static';

        // Update background color on hover
        this.on('mouseenter', e => {
            this.updateBackgroundColor();
        });
        this.on('mouseleave', e => {
            this.updateBackgroundColor();
        });
    }
}