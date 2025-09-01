import { getLanguage, TFile } from "obsidian";
import { GraphLink, GraphNode } from "obsidian-typings";
import { Container, DisplayObject } from "pixi.js";
import { ExtendedGraphSettings, findClosestIndex, getFile, getFileInteractives, getLinkID, pixiAddChild, pixiAddChildAt, strCompare } from "../internal";
import { GraphInstances, ExtendedGraphInstances } from "../pluginInstances";

export interface Layer {
    id: string;
    level: number;
    label: string;
    levelFromID: boolean;
    levelFromDefault: boolean;
}

export interface GraphLayer {
    id: string;
    level: number;
    label: string;
    nodes: string[];
    container: Container;
}

export interface LayerGroup {
    level: number;
    alpha: number;
    layers: GraphLayer[];
}

export class LayersManager {
    layerGroups: LayerGroup[] = [];
    notInLayers: { nodeIDs: string[], layerGroup: LayerGroup };
    nodeLookup: Record<string, { group: LayerGroup, graphLayer: GraphLayer }> = {};
    graphicsArray: {
        circles: Set<DisplayObject>,
        names: Set<DisplayObject>,
        arrows: Set<DisplayObject>,
        links: Set<DisplayObject>,
        linksPixiElements: Set<DisplayObject>,
        linksContainer: Set<DisplayObject>,
    } = {
            circles: new Set(),
            names: new Set(),
            arrows: new Set(),
            links: new Set(),
            linksPixiElements: new Set(),
            linksContainer: new Set(),
        }
    instances: GraphInstances;
    currentLevel: number;
    isEnabled: boolean = false;

    constructor(instances: GraphInstances) {
        this.instances = instances;
        this.currentLevel = instances.stateData?.currentLayerLevel ?? 0;

        const notInLayerslevel = this.instances.settings.layersOrder === "ASC" ? -10000 : 10000;
        this.notInLayers = {
            nodeIDs: [],
            layerGroup: {
                level: notInLayerslevel,
                alpha: 0,
                layers: [{
                    id: "",
                    level: notInLayerslevel,
                    label: "",
                    nodes: [],
                    container: this.getNewContainer("", notInLayerslevel)
                }]
            }
        };
        this.notInLayers.layerGroup.alpha = instances.settings.nodesWithoutLayerOpacity;
        this.notInLayers.layerGroup.layers[0].container.alpha = instances.settings.nodesWithoutLayerOpacity;
    }

    rebuildContainers() {
        for (const group of this.layerGroups) {
            for (const layer of group.layers) {
                if (layer.container.destroyed) {
                    layer.container = this.getNewContainer(layer.id, layer.level);
                    layer.container.alpha = group.alpha;
                    for (const nodeID of layer.nodes) {
                        const node = this.instances.renderer.nodeLookup[nodeID];
                        if (node) {
                            this.addToContainer(node);
                        }
                    }
                }
            }
        }

        const noneLayer = this.notInLayers.layerGroup.layers[0];
        noneLayer.container = this.getNewContainer(noneLayer.id, noneLayer.level);
        noneLayer.container.alpha = this.notInLayers.layerGroup.alpha;
        for (const nodeID of this.notInLayers.nodeIDs) {
            const node = this.instances.renderer.nodeLookup[nodeID];
            if (node) {
                this.addToContainer(node);
            }
        }
    }

    // ============================== Add a node ===============================

    addNode(nodeID: string) {
        if (this.nodeLookup[nodeID]) {
            if (this.isEnabled) {
                const node = this.instances.renderer.nodeLookup[nodeID];
                if (node) {
                    this.addToContainer(node);
                }
            }
            return;
        }

        const file = getFile(nodeID);
        if (file) {
            const layer = LayersManager.getNodeLayer(file, this.instances.settings);
            if (layer) {
                // Add the node id to the layers
                let group = this.layerGroups.find(group => group.level === layer.level);
                let graphLayer = group?.layers.find(l => l.id === layer.id);
                if (group && graphLayer) {
                    graphLayer.nodes.push(nodeID);
                }
                else {
                    if (!group) {
                        group = {
                            level: layer.level,
                            layers: [],
                            alpha: 1,
                        };
                        this.layerGroups.push(group);
                    }
                    graphLayer = {
                        id: layer.id,
                        label: layer.label,
                        level: layer.level,
                        nodes: [nodeID],
                        container: this.getNewContainer(layer.id, layer.level),
                    };
                    group.layers.push(graphLayer);
                }
                this.nodeLookup[nodeID] = { group, graphLayer };

                return;
            }
        }

        this.notInLayers.nodeIDs.push(nodeID);
        this.nodeLookup[nodeID] = { group: this.notInLayers.layerGroup, graphLayer: this.notInLayers.layerGroup.layers[0] };
        if (this.isEnabled) {
            const node = this.instances.renderer.nodeLookup[nodeID];
            if (node) {
                this.addToContainer(node);
            }
        }
        return;
    }

    private getNewContainer(id: string, level: number): Container {
        const container = new Container();
        container.name = "layer-" + id;
        container.zIndex = this.instances.settings.layersOrder === "ASC" ? level : -1 * level;
        pixiAddChild(this.instances.renderer.hanger, container);
        return container;
    }


    // ==================== Fill up or fill out containers =====================


    private moveElementsInContainers() {
        for (const nodeID in this.nodeLookup) {
            const node = this.instances.renderer.nodeLookup[nodeID];
            if (node) {
                this.addToContainer(node);
            }
        }
    }

    private add(element: DisplayObject, layer: GraphLayer, array: keyof typeof this.graphicsArray, at?: number): void {
        if (!element.destroyed && element.parent
            && (element.parent === this.instances.renderer.hanger
                || (element.parent.name?.startsWith("layer-") && element.parent !== layer.container)
            )
        ) {
            const coreElement = ExtendedGraphInstances.proxysManager.getTargetForProxy(element) ?? element;
            at !== undefined ? pixiAddChildAt(layer.container, coreElement, at) : pixiAddChild(layer.container, coreElement);
            this.graphicsArray[array].add(coreElement);
            coreElement.on('destroyed', () => {
                this.graphicsArray[array].delete(coreElement);
            });
        }
    }

    private addToContainer(node: GraphNode) {
        if (!this.isEnabled) return;
        const sourceLayer = this.nodeLookup[node.id].graphLayer;
        if (!sourceLayer) return;

        // Add the node to the container
        if (node.circle) { this.add(node.circle, sourceLayer, 'circles'); }
        if (node.text) { this.add(node.text, sourceLayer, 'names'); }

        // Add links
        for (const link of Object.values(node.forward).concat(Object.values(node.reverse)).map(link => link as GraphLink)) {
            this.addLinkToContainer(link);
        }
    }

    addLinkToContainer(link: GraphLink) {
        if (!this.isEnabled) return;
        const sourceLayer = this.nodeLookup[link.source.id]?.graphLayer;
        if (!sourceLayer) return;

        const linkID = getLinkID(link);
        const extendedLink = this.instances.linksSet.extendedElementsMap.get(linkID);

        const targetLayer = this.nodeLookup[link.target.id]?.graphLayer;
        const layer = targetLayer
            ? targetLayer.level < sourceLayer.level && this.instances.settings.layersOrder === "ASC"
                ? targetLayer
                : sourceLayer
            : sourceLayer;

        if (!extendedLink?.container) {
            const pixiElement = extendedLink?.graphicsWrapper?.pixiElement;
            if (pixiElement) { this.add(pixiElement, layer, 'linksPixiElements', 0); }
            if (link.arrow) { this.add(link.arrow, layer, 'arrows', 0); }
            if (link.px) { this.add(link.px, layer, 'links', 0); }
        }
        else {
            if (extendedLink.container) { this.add(extendedLink.container, layer, 'linksContainer', 0); }
        }
    }

    private moveElementsOutOfContainers() {
        // Make sure we add them back in the correct order
        for (const element of this.graphicsArray.links) {
            pixiAddChild(this.instances.renderer.hanger, element);
        }
        for (const element of this.graphicsArray.arrows) {
            pixiAddChild(this.instances.renderer.hanger, element);
        }
        for (const element of this.graphicsArray.linksPixiElements) {
            pixiAddChild(this.instances.renderer.hanger, element);
        }
        for (const element of this.graphicsArray.linksContainer) {
            pixiAddChild(this.instances.renderer.hanger, element);
        }
        for (const element of this.graphicsArray.circles) {
            pixiAddChild(this.instances.renderer.hanger, element);
        }
        for (const element of this.graphicsArray.names) {
            pixiAddChild(this.instances.renderer.hanger, element);
        }

        this.graphicsArray.links.clear();
        this.graphicsArray.arrows.clear();
        this.graphicsArray.linksPixiElements.clear();
        this.graphicsArray.linksContainer.clear();
        this.graphicsArray.circles.clear();
        this.graphicsArray.names.clear();
    }

    // ========================= Change current level ==========================

    increaseCurrentLevel(): void {
        const currentIndex = this.getCurrentIndex();
        if (currentIndex === this.layerGroups.length - 1) return;
        this.setCurrentLevel(this.layerGroups[currentIndex + 1].level);
    }

    decreaseCurrentLevel(): void {
        const currentIndex = this.getCurrentIndex();
        if (currentIndex === 0) return;
        this.setCurrentLevel(this.layerGroups[currentIndex - 1].level);
    }

    setCurrentLevel(n: number, render = true): void {
        this.currentLevel = n;
        if (this.isEnabled) {
            this.updateOpacity();
            if (render) this.instances.engine.render();
            this.instances.layersUI?.updateCurrentLevelUI(this.getCurrentIndex());
        }
    }

    getCurrentIndex(): number {
        return findClosestIndex(this.layerGroups.map(group => group.level), this.currentLevel);
    }

    // ================== Recompute layers order and opacity ===================

    updateLayers(): void {
        if (!this.isEnabled) return;
        this.sortLayers();
        this.updateOpacity();
        this.updateUI();
    }

    private sortLayers(): void {
        this.layerGroups.sort((a, b) =>
            a.level - b.level
        );
        if (this.instances.settings.layersOrder === "DESC") {
            this.layerGroups.reverse();
        }
    }

    private updateOpacity(): void {
        const currentIndex = this.getCurrentIndex();
        for (let i = 0; i < this.layerGroups.length; i++) {
            this.layerGroups[i].alpha = this.getOpacity(currentIndex, i);
            for (const layer of this.layerGroups[i].layers) {
                layer.container.alpha = this.layerGroups[i].alpha;
            }
        }
    }

    private getOpacity(currentIndex: number, index: number): number {
        // If the index is out of range, return 0
        const shift = index - currentIndex;
        if (shift < 0 || shift >= this.instances.settings.numberOfActiveLayers) {
            return 0;
        }

        if (!this.instances.settings.useLayerCustomOpacity) {
            return (this.instances.settings.numberOfActiveLayers - shift) / this.instances.settings.numberOfActiveLayers;
        }

        // If a custom opacity is set for the level, use it
        const level = this.layerGroups[index].level;
        if (level in this.instances.settings.layersCustomOpacity) {
            return this.instances.settings.layersCustomOpacity[level];
        }

        // Interpolate between the two closests custom opacity
        const activeLayers = this.layerGroups.slice(currentIndex, currentIndex + this.instances.settings.numberOfActiveLayers);
        let lowestBound = {
            opacity: 1,
            index: 0,
        };
        for (let i = shift; i >= 0; i--) {
            if (activeLayers[i].level in this.instances.settings.layersCustomOpacity) {
                lowestBound = {
                    opacity: this.instances.settings.layersCustomOpacity[activeLayers[i].level],
                    index: i,
                };
                break;
            }
        }
        let highestBound = {
            opacity: 0,
            index: this.instances.settings.numberOfActiveLayers,
        };
        for (let i = shift; i < activeLayers.length; i++) {
            if (activeLayers[i].level in this.instances.settings.layersCustomOpacity) {
                highestBound = {
                    opacity: this.instances.settings.layersCustomOpacity[activeLayers[i].level],
                    index: i,
                };
                break;
            }
        }

        const f = (shift - lowestBound.index) / (highestBound.index - lowestBound.index);
        return (1 - f) * lowestBound.opacity + f * highestBound.opacity;
    }

    private updateUI(): void {
        this.instances.layersUI?.updateLevels(this.layerGroups);
        this.instances.layersUI?.updateCurrentLevelUI(this.getCurrentIndex());
    }

    // ============================ Enable/Disable =============================

    enable() {
        this.isEnabled = true;
        this.instances.layersUI?.open();
        this.moveElementsInContainers();
        this.updateLayers();
        this.instances.engine.render();
    }

    disable() {
        this.isEnabled = false;
        this.moveElementsOutOfContainers();
        this.instances.layersUI?.close();
        this.instances.engine.render();
    }

    // ================================ Unload =================================

    unload(): void {
        if (!this.instances.graphEventsDispatcher.isLocalResetting) {
            this.isEnabled = false;
        }

        this.destroyContainers();

        this.nodeLookup = {};
        this.layerGroups = [];
        this.notInLayers.nodeIDs = [];
        this.notInLayers.layerGroup.layers[0].nodes = [];
    }

    destroyContainers() {
        // Apparently, the method moveElementsOutOfContainers calls async methods
        // Because it takes a few milliseconds after the return to really get every
        // element removed from the containers
        for (const group of this.layerGroups) {
            for (const layer of group.layers) {
                layer.container.on('childRemoved', (child, container) => {
                    if (container.children.length === 0) {
                        container.removeFromParent();
                        container.destroy();
                    }
                })
            }
        }
        this.notInLayers.layerGroup.layers[0].container.on('childRemoved', (child, container) => {
            if (container.children.length === 0) {
                container.removeFromParent();
                container.destroy();
            }
        })
        this.moveElementsOutOfContainers();
    }

    // ================================ Static =================================

    static parseLayerID(layerID: string): { level?: number, label: string } {
        const words = layerID.split("_");
        if (words.length === 0) return { label: layerID };
        let level: number | undefined = parseInt(words[0]);
        let label = words.length > 1 ? words.slice(1).join("_") : "";
        if (isNaN(level)) {
            level = undefined;
            label = layerID;
        }
        return { level, label };
    }

    static getNodeLayer(file: TFile, settings: ExtendedGraphSettings): Layer | null {
        for (const property of settings.layerProperties.filter(p => p !== "")) {
            const values = getFileInteractives(property, file, settings);
            for (const layerID of values) {
                const parsed = LayersManager.parseLayerID(layerID);

                return {
                    id: layerID,
                    level: parsed.level ?? settings.layersLevels[file.path] ?? settings.defaultLevelForLayers,
                    label: parsed.label,
                    levelFromID: parsed.level !== undefined,
                    levelFromDefault: parsed.level === undefined && !(file.path in settings.layersLevels),
                };
            }
        }
        return null;
    }

    static getAllLayers(settings: ExtendedGraphSettings): Layer[] {
        const files = ExtendedGraphInstances.app.vault.getMarkdownFiles();
        const results: Layer[] = [];
        for (const file of files) {
            LayersManager.addLayerIfNeeded(settings, results, file);
        }
        LayersManager.sortData(settings, results);
        return results;
    }

    static sortData(settings: ExtendedGraphSettings, data: Layer[]) {
        data.sort((a, b) => {
            if (a.level === b.level) {
                return strCompare(a.label, b.label);
            }
            return a.level - b.level;
        });
        if (settings.layersOrder === "DESC") {
            data.reverse();
        }
    }

    static addLayerIfNeeded(settings: ExtendedGraphSettings, results: Layer[], file: TFile) {
        const layer = LayersManager.getNodeLayer(file, settings);
        if (layer) {
            if (!results.some(l => l.id === layer.id)) {
                results.push(layer);
            }
        }
    }
}