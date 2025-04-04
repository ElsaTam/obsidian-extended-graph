import { TFile } from "obsidian";
import { Assets, Texture } from "pixi.js";
import { GraphNode } from "obsidian-typings";
import { AbstractSet, DisconnectionCause, ExtendedGraphAttachmentNode, ExtendedGraphFileNode, ExtendedGraphNode, ExtendedGraphUnresolvedNode, FileNodeGraphicsWrapper, getBackgroundColor, getFile, getFileInteractives, GraphInstances, InteractiveManager, Media, PluginInstances } from "src/internal";
import { ExtendedGraphTagNode } from "../extendedElements/extendedGraphTagNode";
import { AttachmentNodeGraphicsWrapper } from "../graphicElements/nodes/attachmentNodeGraphicsWrapper";


export class NodesSet extends AbstractSet<GraphNode> {
    extendedElementsMap: Map<string, ExtendedGraphNode>;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances, managers: InteractiveManager[]) {
        super(instances, managers);

        this.coreCollection = this.instances.renderer.nodes;
    }

    // ================================ LOADING ================================

    protected override handleMissingElements(ids: Set<string>): void {
        this.applyBackgroundColor(ids);
        this.loadAssets(ids);
    }

    private applyBackgroundColor(ids: Set<string>) {
        const backgroundColor = getBackgroundColor(this.instances.renderer);
        for (const id of ids) {
            const extendedNode = this.extendedElementsMap.get(id);
            if (!extendedNode || !extendedNode.graphicsWrapper) continue;
            if (extendedNode.coreElement.type !== "tag") {
                extendedNode.graphicsWrapper.updateOpacityLayerColor(backgroundColor);
            }
        }
    }

    // ================================ IMAGES =================================

    private loadAssets(ids: Set<string>): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['imagesFromProperty']
            && !this.instances.settings.enableFeatures[this.instances.type]['imagesFromEmbeds']
            && !this.instances.settings.enableFeatures[this.instances.type]['imagesForAttachments']
            && !this.instances.settings.enableFeatures[this.instances.type]['icons']) return;


        for (const id of ids) {
            this.getImageURI(id).then(imageURI => {
                if (imageURI) {
                    if (imageURI.type === "image") {
                        Assets.load(imageURI.uri).then((texture: Texture) => {
                            this.initNodeImages(id, texture);
                        });
                    }
                    else if (imageURI.type === "icon") {
                        const extendedNode = this.extendedElementsMap.get(id);
                        extendedNode?.graphicsWrapper?.initIcon();
                    }
                }
            });
        }
    }

    private async getImageURI(id: string): Promise<{ uri: string, type: 'icon' | 'image' } | null> {
        let extendedNode = this.extendedElementsMap.get(id);
        if (!extendedNode || !extendedNode.graphicsWrapper) return null;

        let imageUri: string | null = null;

        // Priority to images
        if (this.instances.settings.enableFeatures[this.instances.type]['imagesFromProperty']
            || this.instances.settings.enableFeatures[this.instances.type]['imagesFromEmbeds']
            || this.instances.settings.enableFeatures[this.instances.type]['imagesForAttachments']) {

            if (this.instances.settings.enableFeatures[this.instances.type]['imagesFromProperty']
                && (extendedNode.coreElement.type === ""
                    || extendedNode.coreElement.type === "focused")) {
                imageUri = await Media.getImageUriFromProperty(this.instances.settings.imageProperty, id);
            }
            if (!imageUri && this.instances.settings.enableFeatures[this.instances.type]['imagesFromEmbeds']
                && (extendedNode.coreElement.type === ""
                    || extendedNode.coreElement.type === "focused")) {
                imageUri = await Media.getImageUriFromEmbeds(id);
            }
            if (this.instances.settings.enableFeatures[this.instances.type]['imagesForAttachments']
                && extendedNode.coreElement.type === "attachment") {
                imageUri = await Media.getImageUriForAttachment(id);
            }

            if (imageUri) return { uri: imageUri, type: 'image' }
        }

        // Then, icons (or emojis)
        if (this.instances.settings.enableFeatures[this.instances.type]['icons']) {
            const icon = extendedNode.getIcon();
            if (icon?.svg || icon?.emoji) return { uri: "", type: "icon" }
        }

        return null;
    }

    private initNodeImages(id: string, texture: Texture): void {
        const extendedNode = this.extendedElementsMap.get(id);
        if (!extendedNode || !extendedNode.graphicsWrapper) return;
        if (extendedNode.coreElement.type === "tag" || extendedNode.coreElement.type === "unresolved") return;

        try {
            switch (extendedNode.coreElement.type) {
                case "attachment":
                    (extendedNode.graphicsWrapper as AttachmentNodeGraphicsWrapper).initNodeImage(texture);
                    break;

                case "":
                case "focused":
                    if ('initNodeImage' in extendedNode.graphicsWrapper) {
                        (extendedNode.graphicsWrapper as FileNodeGraphicsWrapper).initNodeImage(texture);
                    }
                    break;
            }
        }
        catch {

        }
    }

    // =========================== EXTENDED ELEMENTS ===========================

    protected override createExtendedElement(node: GraphNode): void {
        const id = node.id;

        const types = new Map<string, Set<string>>();
        for (const [key, manager] of this.managers) {
            types.set(key, this.getTypes(key, node));
        }

        let extendedGraphNode: ExtendedGraphNode;
        if (node.type === "tag") {
            extendedGraphNode = new ExtendedGraphTagNode(
                this.instances,
                node,
                types,
                [...this.managers.values()]
            );
        }
        else if (node.type === "attachment") {
            extendedGraphNode = new ExtendedGraphAttachmentNode(
                this.instances,
                node,
                types,
                [...this.managers.values()]
            );
        }
        else if (node.type === "unresolved") {
            extendedGraphNode = new ExtendedGraphUnresolvedNode(
                this.instances,
                node
            );
        }
        else {
            extendedGraphNode = new ExtendedGraphFileNode(
                this.instances,
                node,
                types,
                [...this.managers.values()]
            );
        }

        this.extendedElementsMap.set(id, extendedGraphNode);
        this.connectedIDs.add(id);

    }

    override loadCascadesForMissingElements(ids: Set<string>): void {
        for (const id of ids) {
            const extendedGraphNode = this.extendedElementsMap.get(id);
            if (!extendedGraphNode) continue;
            if (extendedGraphNode.isAnyManagerDisabled()) {
                this.instances.graph.disableNodes([extendedGraphNode.id]);
            }
            if (this.instances.graph.addNodeInCascadesAfterCreation(extendedGraphNode.id) && !extendedGraphNode.isActive) {
                this.disableElements([extendedGraphNode.id], DisconnectionCause.USER);
            }
        }
    }

    // ================================ GETTERS ================================

    protected override getID(element: GraphNode): string {
        return element.id;
    }

    protected override getTypesFromFile(key: string, element: GraphNode, file: TFile): Set<string> {
        return getFileInteractives(key, file);
    }

    protected getAbstractFile(node: GraphNode): TFile | null {
        return getFile(node.id);
    }

    // ============================= INTERACTIVES ==============================

    /**
     * Reset arcs for each node
     */
    resetArcs(key: string): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['tags']) return;
        for (const [id, extendedElement] of this.extendedElementsMap) {
            try {
                const manager = this.managers.get(key);
                if (!manager) continue;
                (extendedElement.graphicsWrapper as FileNodeGraphicsWrapper).resetManagerGraphics(manager);
            }
            catch {

            }
        }
    }

    // ============================ TOGGLE ELEMENTS ============================

    /**
     * Connects all node wrappers in the set to their obsidian node.
     */
    connectNodes(): void {
        for (const [id, extendedNode] of this.extendedElementsMap) {
            extendedNode.updateCoreElement();
        }
    }

    // ================================== CSS ==================================

    updateOpacityLayerColor() {
        const color = getBackgroundColor(this.instances.renderer);
        this.extendedElementsMap.forEach(extendedNode => {
            extendedNode.graphicsWrapper?.updateOpacityLayerColor(color);
        });
    }

    onCSSChange(): void {
        const color = getBackgroundColor(this.instances.renderer);
        this.extendedElementsMap.forEach(extendedNode => {
            extendedNode.graphicsWrapper?.updateOpacityLayerColor(color);
            extendedNode.graphicsWrapper?.updateIconBackgroundLayerColor(color);
            extendedNode.extendedText.updateTextBackgroundColor(color);
            extendedNode.extendedText.updateFontFamily();
        });
    }

    // =============================== EMPHASIZE ===============================

    /**
     * Highlights or unhighlights a node based on the provided file.
     * @param file - The file corresponding to the node.
     * @param emphasize - Whether to highlight or unhighlight the node.
     */
    emphasizeNode(file: TFile, emphasize: boolean): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['focus']) return;

        const extendedNode = this.extendedElementsMap.get(file.path);
        if (!extendedNode || !extendedNode.graphicsWrapper) return;

        try {
            if (emphasize) {
                let color = this.instances.renderer.colors.fillFocused.rgb;
                (extendedNode.graphicsWrapper as FileNodeGraphicsWrapper).emphasize(true);
            } else {
                (extendedNode.graphicsWrapper as FileNodeGraphicsWrapper).emphasize(false);
            }
        }
        catch {

        }
    }

    // =============================== PIN NODES ===============================

    isNodePinned(id: string): boolean | undefined {
        const extendedNode = this.instances.nodesSet.extendedElementsMap.get(id);
        if (!extendedNode) return;
        return extendedNode.isPinned;
    }

    // ================================= DEBUG =================================

    printDisconnectedNodes() {
        const pad = (str: string, length: number, char = ' ') =>
            str.padStart((str.length + length) / 2, char).padEnd(length, char);

        const rows: string[] = [];
        const maxIDLength = Math.max(...[...this.extendedElementsMap.keys()].map(id => id.length));

        let hrLength = maxIDLength + 2;
        hrLength += 12;
        hrLength += Object.values(DisconnectionCause).map(c => c.length + 3).reduce((s: number, a: number) => s + a, 0);

        const hr = "+" + "-".repeat(hrLength) + "+";

        for (const id of this.extendedElementsMap.keys()) {
            let row = "| " + id.padEnd(maxIDLength) + " | ";
            row += pad(this.connectedIDs.has(id) ? "X" : " ", 9) + " | ";
            for (const cause of Object.values(DisconnectionCause)) {
                let cell = this.disconnectedIDs[cause].has(id) ? "X" : " ";
                cell = pad(cell, cause.length);
                row += cell + " | ";
            }
            rows.push(row);
        }

        let header = "| " + "ID".padEnd(maxIDLength) + " | ";
        header += "connected | ";
        for (const cause of Object.values(DisconnectionCause)) {
            header += pad(cause, cause.length) + " | ";
        }

        let table = hr + "\n" + header + "\n" + hr + "\n" + rows.join("\n") + "\n" + hr;

        console.debug(table);
    }
}