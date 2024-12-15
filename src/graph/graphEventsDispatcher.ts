import { App, Component, EventRef, WorkspaceLeaf } from "obsidian";
import { Graph } from "./graph";
import { LegendUI } from "./ui/legendUI";
import { GraphViewsUI } from "./ui/viewsUI";
import { Renderer } from "./renderer";
import { ExtendedGraphSettings } from "../settings";

export type WorkspaceLeafExt = WorkspaceLeaf & {
    on(name: "extended-graph:graph-ready",      callback: ( ) => any) : EventRef;
    on(name: "extended-graph:disable-nodes", callback: (type: string[]) => any) : EventRef;
    on(name: "extended-graph:enable-nodes",  callback: (type: string[]) => any) : EventRef;
    on(name: "extended-graph:add-tag-type",     callback: (type: string, color: Uint8Array) => any) : EventRef;
    on(name: "extended-graph:clear-tag-types",  callback: (types: string[]) => any)                 : EventRef;
    on(name: "extended-graph:change-tag-color", callback: (type: string, color: Uint8Array) => any) : EventRef;
    on(name: "extended-graph:disable-tags",     callback: (type: string[]) => any)                  : EventRef;
    on(name: "extended-graph:enable-tags",      callback: (type: string[]) => any)                  : EventRef;
    on(name: "extended-graph:add-link-type",     callback: (type: string, color: Uint8Array) => any) : EventRef;
    on(name: "extended-graph:clear-link-types",  callback: (types: string[]) => any)                 : EventRef;
    on(name: "extended-graph:change-link-color", callback: (type: string, color: Uint8Array) => any) : EventRef;
    on(name: "extended-graph:disable-links",     callback: (type: string[]) => any)                  : EventRef;
    on(name: "extended-graph:enable-links",      callback: (type: string[]) => any)                  : EventRef;
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

    constructor(leaf: WorkspaceLeaf, app: App, settings: ExtendedGraphSettings) {
        super();
        this.leaf = leaf as WorkspaceLeafExt;
        this.settings = settings;

        this.renderer = this.leaf.view.renderer;
        this.canvas = leaf.containerEl.getElementsByTagName("canvas")[0];
        this.graph = new Graph(this.renderer, leaf, app, this.canvas, this.settings);

        this.legendUI = new LegendUI(this.graph, leaf);
        this.addChild(this.legendUI);
        this.viewsUI = new GraphViewsUI(this.graph, leaf);
        this.addChild(this.viewsUI);
        this.viewsUI.updateViewsList(settings.views);
    }

    onload(): void {
        this.registerEvent(this.leaf.on('extended-graph:graph-ready', this.onGraphReady.bind(this)));

        this.registerEvent(this.leaf.on('extended-graph:disable-nodes', this.onNodesDisabled.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:enable-nodes', this.onNodesEnabled.bind(this)));

        this.registerEvent(this.leaf.on('extended-graph:add-tag-type', this.onTagTypeAdded.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:clear-tag-types', this.onTagsCleared.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:change-tag-color', this.onTagColorChanged.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:disable-tags', this.onTagsDisabled.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:enable-tags', this.onTagsEnabled.bind(this)));
        
        this.registerEvent(this.leaf.on('extended-graph:add-link-type', this.onLinkTypeAdded.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:clear-link-types', this.onLinksCleared.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:change-link-color', this.onLinkColorChanged.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:disable-links', this.onLinksDisabled.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:enable-links', this.onLinksEnabled.bind(this)));

        this.registerEvent(this.leaf.on('extended-graph:view-changed', this.onViewChanged.bind(this)));
    }

    onunload() : void {
        
    }

    onGraphReady() : void {
        this.graph.test();
    }

    // NODES

    onNodesDisabled(ids: string[]) {
        this.graph.disableNodes(ids);
    }

    onNodesEnabled(ids: string[]) {
        this.graph.enableNodes(ids);
    }

    // TAGS

    onTagTypeAdded(type: string, color: Uint8Array) {
        this.graph.resetArcs();
        this.legendUI.addLegend("tag", type, color);
        this.renderer.changed();
    }

    onTagsCleared(types: string[]) {
        this.graph.resetArcs();
        this.legendUI.removeLegend("tag", types);
        this.renderer.changed();
    }

    onTagColorChanged(type: string, color: Uint8Array) {
        this.graph.updateArcsColor(type, color);
        this.legendUI.updateLegend("tag", type, color);
        this.renderer.changed();
    }

    onTagsDisabled(types: string[]) {
        types.forEach(type => {
            this.graph.disableTag(type);
        });
        this.renderer.changed();
    }

    onTagsEnabled(types: string[]) {
        types.forEach(type => {
            this.graph.enableTag(type);
        });
        this.renderer.changed();
    }

    // LINKS

    onLinkTypeAdded(type: string, color: Uint8Array) {
        this.graph.updateLinksColor(type, color);
        this.legendUI.addLegend("link", type, color);
        this.renderer.changed();
    }

    onLinksCleared(types: string[]) {
        //this.graph.resetArcs();
        this.legendUI.removeLegend("link", types);
        this.renderer.changed();
    }

    onLinkColorChanged(type: string, color: Uint8Array) {
        this.graph.updateLinksColor(type, color);
        this.legendUI.updateLegend("link", type, color);
        this.renderer.changed();
    }

    onLinksDisabled(types: string[]) {
        this.graph.disableLinks(types);
        this.renderer.changed();
    }

    onLinksEnabled(types: string[]) {
        this.graph.enableLinks(types);
        this.renderer.changed();
    }

    // VIEWS

    onViewChanged(id: string) {
        const viewData = this.settings.views.find(v => v.id === id);
        if (!viewData) return;

        this.graph.loadView(viewData);

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