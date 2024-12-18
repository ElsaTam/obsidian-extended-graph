import { App, TFile } from 'obsidian';
import { Assets, Circle, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { InteractiveManager } from './interactiveManager';
import { FUNC_NAMES, NODE_CIRCLE_RADIUS, NODE_CIRCLE_X, NODE_CIRCLE_Y, NONE_TYPE, REMOVE_INACTIVE_NODES } from 'src/globalVariables';
import { Renderer } from './renderer';

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
    forward: {[id: string] : Node};
    reverse: {[id: string] : Node};
}

class Arc extends Graphics {
    thickness: number = 0.09;
    inset: number = 0.03;
    gap: number = 0.2;
    isActive: boolean = true;
    name: string;
}

export interface NodeGraphics {
    sprite: Sprite;
    tagArcs: Map<string, Arc>;
    background: Graphics;
    size: number;
    borderFactor: number;
    maxArcSize: number;
}

export class NodeWrapper extends Container {
    node: Node;
    nodeGraphics: NodeGraphics;
    name: string;
    file: TFile;
    imageUri: string | null;
    tagTypes: string[];
    isActive: boolean = true;

    constructor(node: Node, app: App) {
        FUNC_NAMES && console.log("[NodeWrapper] new");
        super();
        this.node = node;
        this.name = node.id;

        // Set values
        this.nodeGraphics = {
            sprite: new Sprite(),
            tagArcs: new Map<string, Arc>(),
            background: new Graphics(),
            size: 1,
            borderFactor: 0.06,
            maxArcSize: Math.PI / 2
        };

        // Get TFile
        const file = app.vault.getFileByPath(node.id);
        if (!file) throw new Error(`Could not find TFile for node ${node.id}.`)
        this.file = file;

        // Get Tags
        this.updateTags(app);
    }

    // =========================== INITIALIZATION =========================== //

    async init(app: App, keyProperty: string, renderer: Renderer) : Promise<void> {
        FUNC_NAMES && console.log("[NodeWrapper] init");

        const ready: boolean = await this.waitReady(renderer);
        if (!ready) {
            return Promise.reject<void>();
        }

        FUNC_NAMES && console.log("[NodeWrapper] init");
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
                this.nodeGraphics.sprite.name = "image";
                this.nodeGraphics.sprite.anchor.set(0.5);
                this.addChild(this.nodeGraphics.sprite);
                this.nodeGraphics.sprite.scale.set((1 - this.nodeGraphics.borderFactor));
        
                // Mask
                let mask = new Graphics()
                    .beginFill(0xFFFFFF)
                    .drawCircle(0, 0, 0.5 * this.nodeGraphics.size)
                    .endFill();
                this.nodeGraphics.sprite.mask = mask;
                this.nodeGraphics.sprite.addChild(mask);
            });
        }
        else {
            this.nodeGraphics.size = 1;
        }

        // Background
        this.nodeGraphics.background
            .beginFill(0xFFFFFF)
            .drawCircle(0, 0, 0.5 * this.nodeGraphics.size)
            .endFill();
        this.nodeGraphics.background.alpha = 0;
        this.nodeGraphics.background.scale.set(1.01);
        this.addChild(this.nodeGraphics.background);
        
        // Scale
        this.scale.set(NODE_CIRCLE_RADIUS * 2 / this.nodeGraphics.size);

        // Because of async, make sure the container is not already added
        if (this.node.circle?.getChildByName(this.name)) {
            return Promise.reject<void>();
        }

        this.x = NODE_CIRCLE_X;
        this.y = NODE_CIRCLE_Y;
    }

    async waitReady(renderer: Renderer) : Promise<boolean> {
        FUNC_NAMES && console.log("[NodeWrapper] waitReady");
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

    // ============================= TAG TYPES ============================== //

    /**
     * Update tags list from the cache
     * @param app 
     */
    updateTags(app: App) : void {
        FUNC_NAMES && console.log("[NodeWrapper] updateTags");
        const metadata = app.metadataCache.getFileCache(this.file);
        this.tagTypes = [];
        metadata?.tags?.forEach(tagCache => {
            const tag = tagCache.tag.replace('#', '');
            this.tagTypes.push(tag);
        });
        if (this.tagTypes.length == 0) {
            this.tagTypes.push(NONE_TYPE);
        }
    }

    /**
     * Get all tag types for this node.
     * @param app if not null, the app will be used to retrieve the tags from the cache
     * @returns list of tag types
     */
    getTagsTypes(app?: App) : string[] {
        (app) && this.updateTags(app);
        return this.tagTypes;
    }

    /**
     * Check if the list of tag types is exactly the same than the types of the
     * node (without regard to order)
     * @param types list of tag types
     * @returns true if it matches
     */
    matchesTagsTypes(types: string[]) : boolean {
        return types.sort().join(',') === this.tagTypes.join(',');
    }

    hasTagType(type: string) : boolean {
        return this.getTagsTypes().includes(type);
    }

    // ============================== TAG ARCS ============================== //

    /**
     * Get the arc associated with the type
     * @param type tag type
     * @returns the associated arc
     */
    getArc(type: string) : Arc {
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
        FUNC_NAMES && console.log("[NodeWrapper] addArcs");
        const allTypes = manager.getTypes();
        allTypes.remove(NONE_TYPE);
        const nTags = allTypes.length;
        const arcSize = Math.min(2 * Math.PI / nTags, this.nodeGraphics.maxArcSize);
    
        this.getTagsTypes().forEach(type => {
            if (type === NONE_TYPE) return;
            const oldArc = this.getChildByName(this.getArcName(type));
            if (oldArc) return;

            try {
                const color = manager.getColor(type);
                const tagIndex = allTypes.findIndex(t => t === type);
                const arc = this.createArc(type, color, arcSize, tagIndex);
                this.addChild(arc);
                this.nodeGraphics.tagArcs.set(type, arc);
            }
            catch (error) { }
        });
    }

    /**
     * Update one arc
     * @param type type of the arc (tag)
     * @param color color of the arc
     * @param tagsManager tags manager
     */
    updateArc(type: string, color: Uint8Array, manager: InteractiveManager) : void {
        FUNC_NAMES && console.log("[NodeWrapper] updateArc");
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
        FUNC_NAMES && console.log("[NodeWrapper] updateArcState");
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

        if (!REMOVE_INACTIVE_NODES) {
            // If the node still has active tags
            if (isNodeActive) {
                this.children.forEach((child: Graphics) => {
                    if (child.name && !child.name.startsWith("arc-")) {
                        child.alpha = 1;
                    }
                })
                this.nodeGraphics.background.alpha = 0;
            }
            // Else, if the node doesn't have any active tag
            else {
                this.children.forEach((child: Graphics) => {
                    if (child.name && !child.name.startsWith("arc-")) {
                        child.alpha = this.nodeGraphics.tagArcs.get(child.name)?.isActive ? 1 : 0.1;
                    }
                    else {
                        child.alpha = 0.1;
                    }
                })
                this.nodeGraphics.background.alpha = 1;
            }
        }
    }

    /**
     * Remove one arc
     * @param type tag type
     */
    removeArc(type: string) {
        FUNC_NAMES && console.log("[NodeWrapper] removeArc");
        this.removeChild(this.getArc(type));
        this.nodeGraphics.tagArcs.delete(type);
    }
    
    /**
     * Remove all arcs
     */
    removeArcs(types?: string[]) {
        FUNC_NAMES && console.log("[NodeWrapper] removeArcs");
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
        FUNC_NAMES && console.log("[NodeWrapper] createArc");
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
    
    updateBackgroundColor(backgroundColor: Uint8Array) : void {
        FUNC_NAMES && console.log("[NodeWrapper] updateBackgroundColor");
        this.nodeGraphics.background.clear();
        this.nodeGraphics.background.beginFill(backgroundColor)
            .drawCircle(0, 0, 0.5 * this.nodeGraphics.size)
            .endFill();
    }
}