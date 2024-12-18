import { App, Component, EventRef, Menu, WorkspaceLeaf } from "obsidian";
import { Graph } from "./graph";
import { LegendUI } from "./ui/legendUI";
import { GraphViewsUI } from "./ui/viewsUI";
import { Renderer } from "./renderer";
import { ExtendedGraphSettings } from "../settings";
import { FUNC_NAMES } from "src/globalVariables";
import { GraphsManager } from "src/graphsManager";

export type WorkspaceLeafExt = WorkspaceLeaf & {
    on(name: "extended-graph:disable-plugin",   callback: (leaf: WorkspaceLeafExt) => any) : EventRef;
    on(name: "extended-graph:enable-plugin",    callback: (leaf: WorkspaceLeafExt) => any) : EventRef;
    on(name: "extended-graph:graph-ready",      callback: ( ) => any) : EventRef;
    on(name: "extended-graph:engine-needs-update", callback: ( ) => any) : EventRef;
    on(name: "extended-graph:graph-needs-update",  callback: ( ) => any) : EventRef;
    on(name: "extended-graph:add-tag-types",    callback: (colorsMap: Map<string, Uint8Array>) => any) : EventRef;
    on(name: "extended-graph:remove-tag-types", callback: (types: Set<string>) => any)                 : EventRef;
    on(name: "extended-graph:clear-tag-types",  callback: (types: string[]) => any)                    : EventRef;
    on(name: "extended-graph:change-tag-color", callback: (type: string, color: Uint8Array) => any)    : EventRef;
    on(name: "extended-graph:disable-tags",     callback: (type: string[]) => any)                     : EventRef;
    on(name: "extended-graph:enable-tags",      callback: (type: string[]) => any)                     : EventRef;
    on(name: "extended-graph:add-link-types",    callback: (colorsMap: Map<string, Uint8Array>) => any) : EventRef;
    on(name: "extended-graph:remove-link-types", callback: (types: Set<string>) => any)                 : EventRef;
    on(name: "extended-graph:clear-link-types",  callback: (types: string[]) => any)                    : EventRef;
    on(name: "extended-graph:change-link-color", callback: (type: string, color: Uint8Array) => any)    : EventRef;
    on(name: "extended-graph:disable-links",     callback: (type: string[]) => any)                     : EventRef;
    on(name: "extended-graph:enable-links",      callback: (type: string[]) => any)                     : EventRef;
    on(name: "extended-graph:view-changed", callback: (name: string) => any) : EventRef;

    view: {
        renderer: Renderer
    }
}

export class GraphEventsDispatcher extends Component {
    type: string;
    leaf: WorkspaceLeafExt;
    settings: ExtendedGraphSettings;
    canvas: HTMLCanvasElement;
    renderer: Renderer;
    graph: Graph;
    legendUI: LegendUI;
    viewsUI: GraphViewsUI;
    graphsManager: GraphsManager;

    constructor(leaf: WorkspaceLeaf, app: App, settings: ExtendedGraphSettings, graphsManager: GraphsManager) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] new");
        super();
        this.leaf = leaf as WorkspaceLeafExt;
        this.settings = settings;
        this.graphsManager = graphsManager;

        this.renderer = this.leaf.view.renderer;
        this.canvas = this.renderer.interactiveEl;
        this.graph = new Graph(this.renderer, leaf, app, this.settings);
        this.addChild(this.graph);

        this.legendUI = new LegendUI(this.graph, leaf);
        this.addChild(this.legendUI);
        this.viewsUI = new GraphViewsUI(this.graph, leaf);
        this.addChild(this.viewsUI);
        this.viewsUI.updateViewsList(settings.views);
    }

    onload(): void {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onload");
        this.registerEvent(this.leaf.on('extended-graph:add-tag-types', this.onTagTypesAdded.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:remove-tag-types', this.onTagTypesRemoved.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:clear-tag-types', this.onTagsCleared.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:change-tag-color', this.onTagColorChanged.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:disable-tags', this.onTagsDisabled.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:enable-tags', this.onTagsEnabled.bind(this)));
        
        this.registerEvent(this.leaf.on('extended-graph:add-link-types', this.onLinkTypesAdded.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:remove-link-types', this.onLinkTypesRemoved.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:clear-link-types', this.onLinksCleared.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:change-link-color', this.onLinkColorChanged.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:disable-links', this.onLinksDisabled.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:enable-links', this.onLinksEnabled.bind(this)));

        this.registerEvent(this.leaf.on('extended-graph:view-changed', this.onViewChanged.bind(this)));

        this.registerEvent(this.leaf.on('extended-graph:graph-ready', this.onGraphReady.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:engine-needs-update', this.onEngineNeedsUpdate.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:graph-needs-update',  this.onGraphNeedsUpdate.bind(this)));
    }

    onunload(): void {
        this.renderer.px.stage.children[1].removeAllListeners();
    }

    onGraphReady() : void {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onGraphReady");
        if (this.graph.nodesSet.tagsManager.interactives.size === 0 && this.renderer.nodes.length > 0) {
            this.graphsManager.reloadPlugin(this.leaf);
            return;
        }
        this.renderer.px.stage.children[1].on('childAdded', (e: any) => {
            this.updateFromEngine();
        });
        this.renderer.px.stage.children[1].on('childRemoved', (e: any) => {
            this.updateFromEngine();
        });

        this.graph.test();
    }

    private updateFromEngine() {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] updateFromEngine");
        if (this.renderer.nodes.length > this.settings.maxNodes) {
            this.leaf.trigger("extended-graph:disable-plugin", this.leaf);
            return;
        }
        this.graph.nodesSet.updateNodesFromEngine();
        this.graph.linksSet.updateLinksFromEngine();
    }

    onEngineNeedsUpdate() {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onEngineNeedsUpdate");
        this.graph.updateWorker();
    }

    onGraphNeedsUpdate() {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onGraphNeedsUpdate");
        this.graph.initSets();
    }

    // TAGS

    onTagTypesAdded(colorMaps: Map<string, Uint8Array>) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagTypesAdded");
        this.graph.nodesSet.resetArcs();
        colorMaps.forEach((color, type) => {
            this.legendUI.addLegend("tag", type, color);
        });
        this.renderer.changed();
    }

    onTagTypesRemoved(types: Set<string>) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagTypesRemoved");
        this.legendUI.removeLegend("tag", [...types]);
    }

    onTagsCleared(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagsCleared");
        this.graph.nodesSet.removeArcs(types);
        this.legendUI.removeLegend("tag", types);
        this.renderer.changed();
    }

    onTagColorChanged(type: string, color: Uint8Array) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagColorChanged");
        this.graph.nodesSet.updateArcsColor(type, color);
        this.legendUI.updateLegend("tag", type, color);
        this.renderer.changed();
    }

    onTagsDisabled(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagsDisabled");
        types.forEach(type => {
            this.graph.nodesSet.disableTag(type);
        });
        this.renderer.changed();
    }

    onTagsEnabled(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onTagsEnabled");
        types.forEach(type => {
            this.graph.nodesSet.enableTag(type);
        });
        this.renderer.changed();
    }

    // LINKS


    onLinkTypesAdded(colorMaps: Map<string, Uint8Array>) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinkTypesAdded");
        colorMaps.forEach((color, type) => {
            this.graph.linksSet.updateLinksColor(type, color);
            this.legendUI.addLegend("link", type, color);
        });
        this.renderer.changed();
    }

    onLinkTypesRemoved(types: Set<string>) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinkTypesRemoved");
        this.legendUI.removeLegend("link", [...types]);
    }

    onLinksCleared(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinksCleared");
        //this.graph.resetArcs();
        this.legendUI.removeLegend("link", types);
        this.renderer.changed();
    }

    onLinkColorChanged(type: string, color: Uint8Array) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinkColorChanged");
        this.graph.linksSet.updateLinksColor(type, color);
        this.legendUI.updateLegend("link", type, color);
        this.renderer.changed();
    }

    onLinksDisabled(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinksDisabled");
        this.graph.disableLinkTypes(types);
        this.renderer.changed();
    }

    onLinksEnabled(types: string[]) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onLinksEnabled");
        this.graph.enableLinkTypes(types);
        this.renderer.changed();
    }

    // VIEWS

    onViewChanged(id: string) {
        FUNC_NAMES && console.log("[GraphEventsDispatcher] onViewChanged");
        const viewData = this.settings.views.find(v => v.id === id);
        if (!viewData) return;

        this.graph.nodesSet.tagsManager.loadView(viewData);
        this.graph.linksSet.linksManager.loadView(viewData);

        this.legendUI.enableAll("tag");
        viewData.disabledTags.forEach(type => {
            this.legendUI.disable("tag", type);
        });
        this.legendUI.enableAll("link");
        viewData.disabledLinks.forEach(type => {
            this.legendUI.disable("link", type);
        });
    }
}