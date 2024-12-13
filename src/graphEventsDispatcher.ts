import { App, Component, EventRef, WorkspaceLeaf } from "obsidian";
import { Graph } from "./graph";
import { Legend } from "./legend";
import { Renderer } from "./types";
import { ExtendedGraphSettings } from "./settings";
import { Link, LinkWrapper } from "./link";

export type WorkspaceLeafExt = WorkspaceLeaf & {
    on(name: "extended-graph:graph-ready",      callback: ( ) => any)                              : EventRef;
    on(name: "extended-graph:add-tag-type",     callback: (type: string, color: Uint8Array) => any): EventRef;
    on(name: "extended-graph:clear-tag-types",  callback: (types: string[]) => any)                : EventRef;
    on(name: "extended-graph:change-tag-color", callback: (type: string, color: Uint8Array) => any): EventRef;
    on(name: "extended-graph:disable-tag",      callback: (type: string) => any)                   : EventRef;
    on(name: "extended-graph:enable-tag",       callback: (type: string) => any)                   : EventRef;

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
    legend: Legend;

    constructor(leaf: WorkspaceLeaf, app: App, settings: ExtendedGraphSettings) {
        super();
        this.leaf = leaf as WorkspaceLeafExt;
        this.settings = settings;

        this.renderer = this.leaf.view.renderer;
        this.canvas = leaf.containerEl.getElementsByTagName("canvas")[0];
        this.graph = new Graph(this.renderer, leaf, app, this.canvas, this.settings);
        this.legend = new Legend(this.graph, leaf);
    }

    onload(): void {
        console.log("Loading GraphEventsDispatcher");
        
        this.registerEvent(this.leaf.on('extended-graph:graph-ready', this.onGraphReady.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:add-tag-type', this.onTagTypeAdded.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:clear-tag-types', this.onTagsCleared.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:change-tag-color', this.onTagColorChanged.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:disable-tag', this.onTagDisabled.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:enable-tag', this.onTagEnabled.bind(this)));
        
        // @ts-ignore
        this.registerEvent(this.leaf.workspace.on('extended-graph:theme-change', this.onThemeChange.bind(this)));
    }

    onunload() : void {
        console.log("Unload GraphEventsDispatcher");
    }

    onGraphReady() : void {
        this.graph.test();
    }

    onTagTypeAdded(type: string, color: Uint8Array) {
        this.graph.resetArcs();
        this.legend.addTagLegend(type, color);
        this.renderer.changed();
    }

    onTagsCleared(types: string[]) {
        this.graph.resetArcs();
        this.legend.removeTagLegend(types);
        this.renderer.changed();
    }

    onTagColorChanged(type: string, color: Uint8Array) {
        this.graph.updateArcsColor(type, color);
        this.legend.updateTagLegend(type, color);
        this.renderer.changed();
    }

    onTagDisabled(type: string) {
        this.graph.disableTag(type);
        this.renderer.changed();
    }

    onTagEnabled(type: string) {
        this.graph.enableTag(type);
        this.renderer.changed();
    }

    onLinkClicked(linkWrapper: LinkWrapper) {
        this.graph.clickLink(linkWrapper);
    }

    onThemeChange(theme: string) {
        this.graph.updateBackground(theme);
        this.renderer.changed();
    }
}