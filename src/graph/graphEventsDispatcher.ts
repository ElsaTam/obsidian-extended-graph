import { App, Component, EventRef, WorkspaceLeaf } from "obsidian";
import { Graph } from "./graph";
import { LegendUI } from "./ui/legendUI";
import { GraphViewsUI } from "./ui/viewsUI";
import { Renderer } from "./renderer";
import { ExtendedGraphSettings } from "../settings";

export type WorkspaceLeafExt = WorkspaceLeaf & {
    on(name: "extended-graph:graph-ready",      callback: ( ) => any) : EventRef;
    on(name: "extended-graph:add-tag-type",     callback: (type: string, color: Uint8Array) => any) : EventRef;
    on(name: "extended-graph:clear-tag-types",  callback: (types: string[]) => any)                 : EventRef;
    on(name: "extended-graph:change-tag-color", callback: (type: string, color: Uint8Array) => any) : EventRef;
    on(name: "extended-graph:disable-tags",     callback: (type: string[]) => any)                  : EventRef;
    on(name: "extended-graph:enable-tag",       callback: (type: string) => any)                    : EventRef;
    on(name: "extended-graph:add-relationship-type",     callback: (type: string, color: Uint8Array) => any) : EventRef;
    on(name: "extended-graph:clear-relationship-types",  callback: (types: string[]) => any)                 : EventRef;
    on(name: "extended-graph:change-relationship-color", callback: (type: string, color: Uint8Array) => any) : EventRef;
    on(name: "extended-graph:disable-relationships",     callback: (type: string[]) => any)                  : EventRef;
    on(name: "extended-graph:enable-relationship",       callback: (type: string) => any)                    : EventRef;

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

        this.registerEvent(this.leaf.on('extended-graph:add-tag-type', this.onTagTypeAdded.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:clear-tag-types', this.onTagsCleared.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:change-tag-color', this.onTagColorChanged.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:disable-tags', this.onTagsDisabled.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:enable-tag', this.onTagEnabled.bind(this)));
        
        this.registerEvent(this.leaf.on('extended-graph:add-relationship-type', this.onRelationshipTypeAdded.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:clear-relationship-types', this.onRelationshipsCleared.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:change-relationship-color', this.onRelationshipColorChanged.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:disable-relationships', this.onRelationshipsDisabled.bind(this)));
        this.registerEvent(this.leaf.on('extended-graph:enable-relationship', this.onRelationshipEnabled.bind(this)));
    }

    onunload() : void {
        
    }

    onGraphReady() : void {
        this.graph.test();
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

    onTagEnabled(type: string) {
        this.graph.enableTag(type);
        this.renderer.changed();
    }

    // RELATIONSHIPS

    onRelationshipTypeAdded(type: string, color: Uint8Array) {
        this.graph.updateLinksColor(type, color);
        this.legendUI.addLegend("relationship", type, color);
        this.renderer.changed();
    }

    onRelationshipsCleared(types: string[]) {
        //this.graph.resetArcs();
        this.legendUI.removeLegend("relationship", types);
        this.renderer.changed();
    }

    onRelationshipColorChanged(type: string, color: Uint8Array) {
        this.graph.updateLinksColor(type, color);
        this.legendUI.updateLegend("relationship", type, color);
        this.renderer.changed();
    }

    onRelationshipsDisabled(types: string[]) {
        types.forEach(type => {
            this.graph.disableRelationship(type);
        });
        this.renderer.changed();
    }

    onRelationshipEnabled(type: string) {
        this.graph.enableRelationship(type);
        this.renderer.changed();
    }
}