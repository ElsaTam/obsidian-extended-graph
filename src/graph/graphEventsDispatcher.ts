import { Component, EventRef, WorkspaceLeaf } from "obsidian";
import { Graph } from "./graph";
import { LegendUI } from "../ui/legendUI";
import { GraphViewsUI } from "../ui/viewsUI";
import { GraphControlsUI } from "../ui/graphControl";
import { Renderer } from "./renderer";
import { DEFAULT_VIEW_ID } from "src/globalVariables";
import { GraphsManager } from "src/graphsManager";

export type WorkspaceLeafExt = WorkspaceLeaf & {
    on(name: "extended-graph:disable-plugin",   callback: (leaf: WorkspaceLeafExt) => any) : EventRef;
    on(name: "extended-graph:enable-plugin",    callback: (leaf: WorkspaceLeafExt) => any) : EventRef;
    on(name: "extended-graph:reset-plugin",     callback: (leaf: WorkspaceLeafExt) => any) : EventRef;
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

    view: {
        renderer: Renderer
    }
}

export class GraphEventsDispatcher extends Component {
    type: string;
    animationFrameId: number | null = null;
    stopAnimation: boolean = true;

    graphsManager: GraphsManager;
    leaf: WorkspaceLeafExt;
    
    graph: Graph;
    legendUI: LegendUI | null = null;
    viewsUI: GraphViewsUI;
    controlsUI: GraphControlsUI;

    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super();
        this.leaf = leaf;
        this.graphsManager = graphsManager;

        this.graph = new Graph(this);
        this.addChild(this.graph);

        this.controlsUI = new GraphControlsUI(this);
        this.addChild(this.controlsUI);
        this.viewsUI = new GraphViewsUI(this);
        this.addChild(this.viewsUI);
        if (this.graphsManager.plugin.settings.enableLinks || this.graphsManager.plugin.settings.enableTags) {
            this.legendUI = new LegendUI(this);
            this.addChild(this.legendUI);
        }
        this.viewsUI.updateViewsList(this.graphsManager.plugin.settings.views);
    }

    onload(): void {

        if (this.graphsManager.plugin.settings.enableTags) {
            this.registerEvent(this.leaf.on('extended-graph:add-tag-types', this.onTagTypesAdded.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:remove-tag-types', this.onTagTypesRemoved.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:clear-tag-types', this.onTagsCleared.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:change-tag-color', this.onTagColorChanged.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:disable-tags', this.onTagsDisabled.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:enable-tags', this.onTagsEnabled.bind(this)));
        }
        
        if (this.graphsManager.plugin.settings.enableLinks) {
            this.registerEvent(this.leaf.on('extended-graph:add-link-types', this.onLinkTypesAdded.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:remove-link-types', this.onLinkTypesRemoved.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:clear-link-types', this.onLinksCleared.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:change-link-color', this.onLinkColorChanged.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:disable-links', this.onLinksDisabled.bind(this)));
            this.registerEvent(this.leaf.on('extended-graph:enable-links', this.onLinksEnabled.bind(this)));
        }

        this.onViewChanged(DEFAULT_VIEW_ID);

        this.startUpdateFrame();
    }

    onunload(): void {
        this.stopAnimation = true;
        this.leaf.view.renderer.px.stage.children[1].removeAllListeners();
        this.leaf.view.renderer.worker.removeEventListener("message", this.startUpdateFrame.bind(this));
    }

    onGraphReady() : void {
        this.leaf.view.renderer.px.stage.children[1].on('childAdded', (e: any) => {
            this.updateFromEngine();
        });
        this.leaf.view.renderer.px.stage.children[1].on('childRemoved', (e: any) => {
            this.updateFromEngine();
        });

        if (this.graph.settings.linkCurves) {
            this.leaf.view.renderer.worker.addEventListener("message", this.startUpdateFrame.bind(this));
            this.leaf.view.renderer.px.stage.addEventListener("wheel", this.startUpdateFrame.bind(this));
        }

        this.graph.test();
    }

    // UPDATES

    private updateFromEngine() {
        if (this.leaf.view.renderer.nodes.length > this.graphsManager.plugin.settings.maxNodes) {
            new Notice(`Try to handle ${this.leaf.view.renderer.nodes.length}, but the limit is ${this.graphsManager.plugin.settings.maxNodes}. Extended Graph disabled.`);
            this.graphsManager.disablePlugin(this.leaf);
            return;
        }

        if (this.graph.nodesSet)
            this.graph.nodesSet.updateNodesFromEngine();
        if (this.graph.linksSet)
            this.graph.linksSet.updateLinksFromEngine();

        this.startUpdateFrame();
    }

    onGlobalFilterChanged(filter: string) : void {
        this.graph.engine.updateSearch();
        let textarea = this.controlsUI.settingGlobalFilter.controlEl.querySelector("textarea");
        (textarea) && (textarea.value = filter);
    }

    onEngineNeedsUpdate() {
        this.graph.updateWorker();
    }

    onGraphNeedsUpdate() {
        if (this.graphsManager.plugin.settings.enableTags && this.graph.nodesSet) {
            this.graph.initSets().then(() => {
                this.graph.nodesSet?.resetArcs();
            });
        }
    }

    startUpdateFrame() {
        if (!this.stopAnimation) return;
        this.stopAnimation = false;
        requestAnimationFrame(this.updateFrame.bind(this));
    }

    updateFrame() {
        this.stopAnimation = (this.stopAnimation)
            || (this.graph.renderer.idleFrames > 60)
            || (!this.graph.linksSet);

        if (this.stopAnimation) {
            return;
        }
        if (this.graph.linksSet) {
            for(const [id, linkWrapper] of this.graph.linksSet?.linksMap) {
                linkWrapper.updateGraphics();
            }
        }
        this.animationFrameId = requestAnimationFrame(this.updateFrame.bind(this));
    }

    // TAGS

    onTagTypesAdded(colorMaps: Map<string, Uint8Array>) {
        this.graph.nodesSet?.resetArcs();
        colorMaps.forEach((color, type) => {
            this.legendUI?.addLegend("tag", type, color);
        });
        this.leaf.view.renderer.changed();
    }

    onTagTypesRemoved(types: Set<string>) {
        this.legendUI?.removeLegend("tag", [...types]);
    }

    onTagsCleared(types: string[]) {
        this.graph.nodesSet?.removeArcs(types);
        this.legendUI?.removeLegend("tag", types);
        this.leaf.view.renderer.changed();
    }

    onTagColorChanged(type: string, color: Uint8Array) {
        this.graph.nodesSet?.updateArcsColor(type, color);
        this.legendUI?.updateLegend("tag", type, color);
        this.leaf.view.renderer.changed();
    }

    onTagsDisabled(types: string[]) {
        types.forEach(type => {
            this.graph.nodesSet?.disableTag(type);
        });
        this.leaf.view.renderer.changed();
    }

    onTagsEnabled(types: string[]) {
        types.forEach(type => {
            this.graph.nodesSet?.enableTag(type);
        });
        this.leaf.view.renderer.changed();
    }

    // LINKS


    onLinkTypesAdded(colorMaps: Map<string, Uint8Array>) {
        colorMaps.forEach((color, type) => {
            this.graph.linksSet?.updateLinksColor(type, color);
            this.legendUI?.addLegend("link", type, color);
        });
        this.leaf.view.renderer.changed();
    }

    onLinkTypesRemoved(types: Set<string>) {
        this.legendUI?.removeLegend("link", [...types]);
    }

    onLinksCleared(types: string[]) {
        //this.graph.resetArcs();
        this.legendUI?.removeLegend("link", types);
        this.leaf.view.renderer.changed();
    }

    onLinkColorChanged(type: string, color: Uint8Array) {
        this.graph.linksSet?.updateLinksColor(type, color);
        this.legendUI?.updateLegend("link", type, color);
        this.leaf.view.renderer.changed();
    }

    onLinksDisabled(types: string[]) {
        this.graph.disableLinkTypes(types);
        this.leaf.view.renderer.changed();
    }

    onLinksEnabled(types: string[]) {
        this.graph.enableLinkTypes(types);
        this.leaf.view.renderer.changed();
    }

    // VIEWS

    onViewChanged(id: string) {
        const viewData = this.graphsManager.plugin.settings.views.find(v => v.id === id);
        if (!viewData) return;

        if (this.graph.nodesSet && this.graph.nodesSet.tagsManager) {
            this.graph.nodesSet.tagsManager.loadView(viewData);
            this.legendUI?.enableAll("tag");
            viewData.disabledTags.forEach(type => {
                this.legendUI?.disable("tag", type);
            });
        }

        if (this.graph.linksSet) {
            this.graph.linksSet.linksManager.loadView(viewData);
            this.legendUI?.enableAll("link");
            viewData.disabledLinks.forEach(type => {
                this.legendUI?.disable("link", type);
            });
        }

        this.graph.setEngineOptions(viewData.engineOptions);
    }
}