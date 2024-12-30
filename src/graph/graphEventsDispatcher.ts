import { Component } from "obsidian";
import { Graph } from "./graph";
import { LegendUI } from "../ui/legendUI";
import { ViewsUI } from "../ui/viewsUI";
import { GraphsManager } from "src/graphsManager";
import { WorkspaceLeafExt } from "src/types/leaf";
import { LINK_KEY } from "src/globalVariables";

export class GraphEventsDispatcher extends Component {
    type: string;

    graphsManager: GraphsManager;
    leaf: WorkspaceLeafExt;
    
    graph: Graph;
    legendUI: LegendUI | null = null;
    viewsUI: ViewsUI;

    /**
     * Constructor for GraphEventsDispatcher.
     * @param leaf - The workspace leaf.
     * @param graphsManager - The graphs manager.
     */
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super();
        this.leaf = leaf;
        this.graphsManager = graphsManager;

        this.graph = new Graph(this);
        this.addChild(this.graph);

        this.viewsUI = new ViewsUI(this);
        this.addChild(this.viewsUI);
        if (this.graphsManager.plugin.settings.enableLinks || this.graphsManager.plugin.settings.enableTags || Object.values(this.graphsManager.plugin.settings.additionalProperties).some(p => p)) {
            this.legendUI = new LegendUI(this);
            this.addChild(this.legendUI);
        }
        this.viewsUI.updateViewsList(this.graphsManager.plugin.settings.views);
    }

    /**
     * Called when the component is loaded.
     */
    onload(): void {
        let view = this.graphsManager.plugin.settings.views.find(v => v.id === this.viewsUI.currentViewID);
        (view) && this.graph.engine.setOptions(view.engineOptions);
    }

    /**
     * Called when the component is unloaded.
     */
    onunload(): void {
        this.leaf.view.renderer.px.stage.children[1].removeEventListener('childAdded', this.onChildAddedToStage);
        this.leaf.view.renderer.px.stage.children[1].removeEventListener('childRemoved', this.onChildRemovedFromStage);

        this.graphsManager.onPluginUnloaded(this.leaf);
    }

    /**
     * Called when the graph is ready.
     */
    onGraphReady() : void {
        // Update node opacity layer colors
        if (this.graph.staticSettings.fadeOnDisable) {
            this.graph.nodesSet.updateOpacityLayerColor();
        }

        this.onChildAddedToStage = this.onChildAddedToStage.bind(this)
        this.onChildRemovedFromStage = this.onChildRemovedFromStage.bind(this)

        this.leaf.view.renderer.px.stage.children[1].addEventListener('childAdded', this.onChildAddedToStage);
        this.leaf.view.renderer.px.stage.children[1].addEventListener('childRemoved', this.onChildRemovedFromStage);

        this.changeView(this.viewsUI.currentViewID);
    }

    // UPDATES

    /**
     * Called when a child is removed from the stage by the engine.
     */
    private onChildRemovedFromStage() : void {
        
    }

    /**
     * Called when a child is added to the stage by the engine.
     */
    private onChildAddedToStage() : void {
        if (this.leaf.view.renderer.nodes.length > this.graphsManager.plugin.settings.maxNodes) {
            new Notice(`Try to handle ${this.leaf.view.renderer.nodes.length}, but the limit is ${this.graphsManager.plugin.settings.maxNodes}. Extended Graph disabled.`);
            this.graphsManager.disablePlugin(this.leaf);
            return;
        }

        this.graph.nodesSet.load();
        this.graph.nodesSet.connectNodes();
        this.graph.linksSet.load();
        this.graph.linksSet.connectLinks();

        if (this.graph.linksSet.disconnectedLinks) {
            let linksToDisable = new Set<string>();
            for (const [cause, set] of Object.entries(this.graph.linksSet.disconnectedLinks)) {
                for (const id of set) {
                    let l = this.graph.linksSet.linksMap.get(id);
                    if (!l) continue;
                    if (this.graph.renderer.links.find(link => l.link.source.id === link.source.id && l.link.target.id === link.target.id)) {
                        linksToDisable.add(id);
                    }
                }
                if (linksToDisable.size > 0) {
                    this.graph.linksSet.disableLinks(linksToDisable, cause);
                    this.graph.updateWorker();
                }
            }
        }
    }

    // INTERACTIVES

    /**
     * Handles the addition of interactive elements.
     * @param name - The name of the interactive element type.
     * @param colorMaps - A map of types to their corresponding colors.
     */
    onInteractivesAdded(name: string, colorMaps: Map<string, Uint8Array>) {
        switch (name) {
            case LINK_KEY:
                this.onLinkTypesAdded(colorMaps);
                break;
            default:
                this.onNodeInteractiveTypesAdded(name, colorMaps);
                break;
        }
    }

    /**
     * Handles the removal of interactive elements.
     * @param name - The name of the interactive element type.
     * @param types - A set of types to be removed.
     */
    onInteractivesRemoved(name: string, types: Set<string>) {
        switch (name) {
            case LINK_KEY:
                this.onLinkTypesRemoved(types);
                break;
            default:
                this.onNodeInteractiveTypesRemoved(name, types);
                break;
        }
    }

    /**
     * Handles the color change of interactive elements.
     * @param name - The name of the interactive element type.
     * @param type - The type of the interactive element.
     * @param color - The new color of the interactive element.
     */
    onInteractiveColorChanged(name: string, type: string, color: Uint8Array) {
        switch (name) {
            case LINK_KEY:
                this.onLinkColorChanged(type, color);
                break;
            default:
                this.onNodeInteractiveColorChanged(name, type, color);
                break;
        }
    }

    /**
     * Handles the disabling of interactive elements.
     * @param name - The name of the interactive element type.
     * @param types - An array of types to be disabled.
     */
    onInteractivesDisabled(name: string, types: string[]) {
        switch (name) {
            case LINK_KEY:
                this.disableLinkTypes(types);
                break;
            default:
                this.disableNodeInteractiveTypes(name, types);
                break;
        }
    }

    /**
     * Handles the enabling of interactive elements.
     * @param name - The name of the interactive element type.
     * @param types - An array of types to be enabled.
     */
    onInteractivesEnabled(name: string, types: string[]) {
        switch (name) {
            case LINK_KEY:
                this.enableLinkTypes(types);
                break;
            default:
                this.enableNodeInteractiveTypes(name, types);
                break;
        }
    }

    // TAGS

    private onNodeInteractiveTypesAdded(key: string, colorMaps: Map<string, Uint8Array>) {
        this.graph.nodesSet?.resetArcs(key);
        colorMaps.forEach((color, type) => {
            this.legendUI?.addLegend(key, type, color);
        });
        this.leaf.view.renderer.changed();
    }

    private onNodeInteractiveTypesRemoved(key: string, types: Set<string>) {
        this.legendUI?.removeLegend(key, [...types]);
    }

    private onNodeInteractiveColorChanged(key: string, type: string, color: Uint8Array) {
        this.graph.nodesSet?.updateArcsColor(key, type, color);
        this.legendUI?.updateLegend(key, type, color);
        this.leaf.view.renderer.changed();
    }

    private disableNodeInteractiveTypes(key: string, types: string[]) {
        let nodesToDisable: string[] = [];
        for (const type of types) {
            nodesToDisable = nodesToDisable.concat(this.graph.nodesSet.disableInteractive(key, type));
        }
        if (!this.graph.staticSettings.fadeOnDisable && nodesToDisable.length > 0) {
            this.graph.disableNodes(nodesToDisable);
            this.graph.updateWorker();
        }
        else {
            this.leaf.view.renderer.changed();
        }
    }

    private enableNodeInteractiveTypes(key: string, types: string[]) {
        let nodesToEnable: string[] = [];
        for (const type of types) {
            nodesToEnable = nodesToEnable.concat(this.graph.nodesSet.enableInteractive(key, type));
        }
        if (!this.graph.staticSettings.fadeOnDisable && nodesToEnable.length > 0) {
            this.graph.enableNodes(nodesToEnable);
            this.graph.updateWorker();
        }
        else {
            this.leaf.view.renderer.changed();
        }
    }

    // LINKS

    private onLinkTypesAdded(colorMaps: Map<string, Uint8Array>) {
        colorMaps.forEach((color, type) => {
            this.graph.linksSet?.updateLinksColor(type, color);
            this.legendUI?.addLegend(LINK_KEY, type, color);
        });
        this.leaf.view.renderer.changed();
    }

    private onLinkTypesRemoved(types: Set<string>) {
        this.legendUI?.removeLegend(LINK_KEY, [...types]);
    }

    private onLinkColorChanged(type: string, color: Uint8Array) {
        this.graph.linksSet?.updateLinksColor(type, color);
        this.legendUI?.updateLegend(LINK_KEY, type, color);
        this.leaf.view.renderer.changed();
    }

    private disableLinkTypes(types: string[]) {
        if (this.graph.disableLinkTypes(types)) {
            this.graph.updateWorker();
        }
    }

    private enableLinkTypes(types: string[]) {
        if (this.graph.enableLinkTypes(types)) {
            this.graph.updateWorker();
        }
    }

    // VIEWS

    /**
     * Change the current view with the specified ID.
     * @param id - The ID of the view to change to.
     */
    changeView(id: string) {
        const viewData = this.graphsManager.plugin.settings.views.find(v => v.id === id);
        if (!viewData) return;
        this.graph.engine.setOptions(viewData.engineOptions);
        this.graph.engine.updateSearch();

        setTimeout(() => {
            for (let [key, manager] of this.graph.nodesSet.managers) {
                manager.loadView(viewData);
                this.legendUI?.enableAll(key);
                viewData.disabledTypes[key]?.forEach(type => {
                    this.legendUI?.disable(key, type);
                });
            }

            if (this.graph.linksSet.linksManager) {
                this.graph.linksSet.linksManager.loadView(viewData);
                this.legendUI?.enableAll(LINK_KEY);
                viewData.disabledTypes[LINK_KEY]?.forEach(type => {
                    this.legendUI?.disable(LINK_KEY, type);
                });
            }

            this.graph.updateWorker();
            this.graph.engine.updateSearch();
        }, 200);
    }

    /**
     * Deletes the view with the specified ID.
     * @param id - The ID of the view to delete.
     */
    deleteView(id: string) : void {
        this.graphsManager.onViewNeedsDeletion(id);
    }
}