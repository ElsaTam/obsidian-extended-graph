import { TFolder } from "obsidian";
import { GraphNode } from "obsidian-typings";
import { Container, Graphics, Point, Text, TextStyle } from "pixi.js";
import * as Color from '../../colors/color-bits';
import {
    CSSFolderStyle,
    FOLDER_KEY,
    getFile,
    getFileInteractives,
    GraphInstances,
    InteractiveManager,
    pixiAddChild,
    pixiAddChildAt,
    ExtendedGraphInstances,
    randomColor,
    SettingQuery,
    CSSBridge,
    pathParse,
    hex2int,
    textStyleFill2int
} from "../../internal";

export class FolderBlob {
    readonly path: string;
    folderStyle: CSSFolderStyle;
    textAnchor: Point;
    nodes: GraphNode[] = [];
    area: Graphics;
    text: Text;
    textStyle: TextStyle;
    color: Color.Color;
    BBox: { left: number, right: number, top: number, bottom: number };

    constructor(path: string, folderStyle: CSSFolderStyle, color?: Color.Color) {
        this.path = path;
        this.folderStyle = folderStyle;
        this.color = color ? color : randomColor();
    }

    initGraphics(showFullPath: boolean) {
        this.area = new Graphics();
        this.area.eventMode = 'none';

        this.initTextStyle();
        this.text = new Text(showFullPath ? this.path : pathParse(this.path).basename, this.textStyle);
        this.text.eventMode = "none";
        this.text.resolution = 2;
        pixiAddChild(this.area, this.text);
    }

    initTextStyle() {
        this.textStyle = new TextStyle({
            fontSize: this.folderStyle.textStyle.textStyle.fontSize,
            fill: this.color,
            fontFamily: this.folderStyle.textStyle.textStyle.fontFamily,
            fontStyle: this.folderStyle.textStyle.textStyle.fontStyle,
            fontVariant: this.folderStyle.textStyle.textStyle.fontVariant,
            fontWeight: this.folderStyle.textStyle.textStyle.fontWeight,
            letterSpacing: this.folderStyle.textStyle.textStyle.letterSpacing,
            whiteSpace: 'pre',
            wordWrap: true,
            wordWrapWidth: 300,
            align: this.folderStyle.textStyle.align
        });



        if (this.folderStyle.textStyle.textStyle.dropShadow && this.text) {
            CSSBridge.applyTextShadow(
                this.textStyle,
                this.folderStyle.textStyle.textStyle.dropShadow,
                textStyleFill2int(this.textStyle.fill) ?? this.nodes.first()?.renderer.colors.text.rgb ?? 0
            );
        }

        if (this.folderStyle.textStyle.textStyle.stroke) {
            CSSBridge.applyTextStroke(this.textStyle, this.folderStyle.textStyle.textStyle.stroke);
        }

        if (this.text) this.text.style = this.textStyle;
    }

    clearGraphics() {
        this.area.removeFromParent();
        this.area.destroy();
        this.text?.destroy();
    }

    updateGraphics(rendererScale: number) {
        if (this.nodes.length > 0) {
            this.draw();
            this.placeText(rendererScale);
            this.text.visible = true;
        }
        else {
            this.area.clear();
            this.text.visible = false;
        }
    }

    addNode(node: GraphNode) {
        if (this.nodes.includes(node)) return;
        this.nodes.push(node);
    }

    removeNode(node: GraphNode) {
        this.nodes.remove(node);
    }

    private draw() {
        this.computeBox();
        this.drawBox();
    }

    private drawBox() {
        this.area.clear();

        this.area.lineStyle(
            this.folderStyle.borderWidth,
            this.color,
            this.folderStyle.strokeOpacity,
            1
        ).beginFill(this.color, this.folderStyle.fillOpacity)
            .drawRoundedRect(
                this.BBox.left,
                this.BBox.top,
                (this.BBox.right - this.BBox.left),
                (this.BBox.bottom - this.BBox.top),
                this.folderStyle.radius)
            .endFill();
    }

    private computeBox() {
        let xMin = this.nodes[0].x;
        let xMax = this.nodes[0].x;
        let yMin = this.nodes[0].y;
        let yMax = this.nodes[0].y;

        for (const node of this.nodes) {
            if (node.x < xMin) xMin = node.x;
            else if (node.x > xMax) xMax = node.x;
            if (node.y < yMin) yMin = node.y;
            else if (node.y > yMax) yMax = node.y;
        }

        this.BBox = {
            left: xMin - 50 - this.folderStyle.padding.left,
            right: xMax + 50 + this.folderStyle.padding.right,
            top: yMin - 50 - this.folderStyle.padding.top,
            bottom: yMax + 50 + this.folderStyle.padding.bottom,
        };
    }

    private placeText(scale: number) {
        const t = Math.min(scale, 5);
        this.text.style.fontSize = this.folderStyle.textStyle.textStyle.fontSize * t;
        this.text.style.letterSpacing = this.folderStyle.textStyle.textStyle.letterSpacing * t;
        switch (this.folderStyle.textStyle.align) {
            case 'center':
                this.textAnchor = new Point(0.5, 0);
                this.text.x = this.BBox.left + 0.5 * (this.BBox.right - this.BBox.left);
                break;
            case 'left':
                this.textAnchor = new Point(0, 0);
                this.text.x = this.BBox.left + this.folderStyle.padding.left;
                break;
            case 'right':
                this.textAnchor = new Point(1, 0);
                this.text.x = this.BBox.right - this.folderStyle.padding.right;
                break;
        }
        this.text.anchor.set(this.textAnchor.x, this.textAnchor.y);

        this.text.y = this.BBox.top + this.folderStyle.padding.top;
        this.text.scale.set(1 / t);
    }
}

export class FoldersSet {
    readonly instances: GraphInstances;

    // Interactive manager
    managers: Map<string, InteractiveManager>;

    // Set of blobs
    foldersMap = new Map<string, FolderBlob>();

    // Graphics
    container: Container;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, managers: InteractiveManager[]) {
        this.instances = instances;
        this.initializeManager(managers);
    }

    private initializeManager(managers: InteractiveManager[]) {
        this.managers = new Map<string, InteractiveManager>();
        for (const manager of managers) {
            this.managers.set(manager.name, manager);
        }
    }

    // ================================ LOADING ================================

    load(): void {
        this.initGraphics();
        this.addMissingFolders();
    }

    initGraphics(): void {
        if (this.container && !this.container.destroyed) return;
        this.container = new Container();
        this.container.name = "Blobs";
        pixiAddChildAt(this.instances.renderer.hanger, this.container, 0);

        for (const blob of this.foldersMap.values()) {
            if (blob.area.destroyed) {
                this.loadFolder(FOLDER_KEY, blob.path);
            }
        }
    }

    private addMissingFolders(): void {
        for (const [key, manager] of this.managers) {
            let missingFolders = new Set<string>();

            for (const node of this.instances.renderer.nodes) {
                const file = getFile(node.id);
                if (!file) continue;
                if (this.foldersMap.has(file.path)) continue;

                const interactives = getFileInteractives(FOLDER_KEY, file);
                this.addInteractivesToSet(key, interactives, missingFolders);
            }

            manager.addTypes(missingFolders);
        }
    }

    private addInteractivesToSet(key: string, interactives: Set<string>, missingFolders: Set<string>) {
        const manager = this.managers.get(key);
        if (!manager) return;

        let hasType = false;
        for (const interactive of interactives) {
            if (!manager.interactives.has(interactive)) {
                if (this.isFolderValid(interactive)) {
                    missingFolders.add(interactive);
                    hasType = true;
                }
            }
            else {
                hasType = true;
            }
        }
        if (!hasType && !manager.interactives.has(this.instances.settings.interactiveSettings[FOLDER_KEY].noneType)) {
            missingFolders.add(this.instances.settings.interactiveSettings[FOLDER_KEY].noneType);
        }
    }

    private isFolderValid(type: string): boolean {
        if (SettingQuery.excludeType(this.instances.settings, FOLDER_KEY, type)) return false;
        return true;
    }

    // =============================== UNLOADING ===============================

    unload(): void {
        this.container.destroy({ children: true });
        this.container.removeFromParent();
        this.foldersMap.clear();
    }

    // ========================= ADD AND REMOVE FOLDER =========================

    loadFolder(key: string, path: string): void {
        const manager = this.managers.get(key);
        const folder = ExtendedGraphInstances.app.vault.getFolderByPath(path);
        if (folder && manager) {
            let blob = this.foldersMap.get(path);
            let blobExists = true;
            if (!blob) {
                blobExists = false;
                blob = new FolderBlob(path, this.instances.stylesData?.folder ?? CSSBridge.DEFAULT_FOLDER_STYLE, manager ? manager.getColor(path) : undefined);
                blob.initGraphics(this.instances.settings.folderShowFullPath);
            }
            else if (blob.area.destroyed || !blob.area.parent) {
                blobExists = false;
                blob.initGraphics(this.instances.settings.folderShowFullPath);
            }
            const nodes = this.getNodesInFolder(folder);
            for (const node of nodes) {
                blob.addNode(node);
            }
            if (blob.nodes.length > 0) {
                this.foldersMap.set(path, blob);
                blob.updateGraphics(this.instances.renderer.scale);
                if (!blobExists) {
                    pixiAddChild(this.container, blob.area);
                }
            }
        }
    }

    private getNodesInFolder(folder: TFolder): GraphNode[] {
        const nodes: GraphNode[] = [];
        for (const file of folder.children) {
            if (file instanceof TFolder) {
                nodes.push(...this.getNodesInFolder(file));
            }
            else {
                const node = this.instances.renderer.nodes.find(n => n.id === file.path);
                if (node) nodes.push(node);
            }
        }
        return nodes;
    }

    removeFolder(path: string): void {
        this.foldersMap.get(path)?.clearGraphics();
        this.foldersMap.delete(path);
    }

    // ============================ UPDATE GRAPHICS ============================

    updateGraphics() {
        for (const [path, blob] of this.foldersMap) {
            blob.updateGraphics(this.instances.renderer.scale);
        }
    }

    updateColor(key: string, path: string) {
        const manager = this.managers.get(key);
        const folderBlob = this.foldersMap.get(path);
        if (!folderBlob || !manager) return;
        folderBlob.color = manager.getColor(path);
        folderBlob.updateGraphics(this.instances.renderer.scale);
    }

    onCSSChange() {
        for (const blob of this.foldersMap.values()) {
            blob.folderStyle = this.instances.stylesData?.folder ?? CSSBridge.DEFAULT_FOLDER_STYLE;
            blob.initTextStyle();
        }
    }

    // ================================ GETTERS ================================

    hasMoreThanOneNode(key: string, path: string): boolean {
        const blob = this.foldersMap.get(path);

        if (blob) return blob.nodes.length > 1;

        const folder = ExtendedGraphInstances.app.vault.getFolderByPath(path);

        // folder.getFileCount() is probably more efficient but counts files that are not displayed in the graph
        // this.getNodesInFolder(folder).length is more accurate but may be slower

        return folder ? this.getNodesInFolder(folder).length > 1 : false;
    }

    // ================================ TOGGLE =================================



    enableAll(): void {
        const foldersManager = this.managers.get(FOLDER_KEY);
        if (!foldersManager) return;

        foldersManager.enable(foldersManager.getTypes());
        this.instances.foldersUI?.enableAllUI(FOLDER_KEY);
    }

    disableAll(): void {
        const foldersManager = this.managers.get(FOLDER_KEY);
        if (!foldersManager) return;

        foldersManager.disable(foldersManager.getTypes());
        this.instances.foldersUI?.disableAllUI(FOLDER_KEY);
    }

    enableAllWithAtLeastOneNode(): void {
        const foldersManager = this.managers.get(FOLDER_KEY);
        if (!foldersManager) return;

        const paths = foldersManager.getTypes();
        const needToBeEnabled: string[] = [];
        for (const path of paths) {
            if (this.instances?.foldersSet?.hasMoreThanOneNode(FOLDER_KEY, path)) {
                needToBeEnabled.push(path);
                this.instances.foldersUI?.enableUI(FOLDER_KEY, path);
            }
        }

        foldersManager.enable(needToBeEnabled);
    }

    disableAllWithAtLeastOneNode(): void {
        const foldersManager = this.managers.get(FOLDER_KEY);
        if (!foldersManager) return;

        const paths = foldersManager.getTypes();
        const needToBeDisabled: string[] = [];
        for (const path of paths) {
            if (this.instances?.foldersSet?.hasMoreThanOneNode(FOLDER_KEY, path)) {
                needToBeDisabled.push(path);
                this.instances.foldersUI?.disableUI(FOLDER_KEY, path);
            }
        }

        foldersManager.disable(needToBeDisabled);
    }
}