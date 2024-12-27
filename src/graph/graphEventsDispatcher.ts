import { Component, EventRef, WorkspaceLeaf } from "obsidian";
import { Graph } from "./graph";
import { LegendUI } from "../ui/legendUI";
import { ViewsUI } from "../ui/viewsUI";
import { GraphControlsUI } from "../ui/graphControl";
import { Renderer } from "./renderer";
import { GraphsManager } from "src/graphsManager";
import { DEFAULT_VIEW_ID } from "src/globalVariables";

export type WorkspaceLeafExt = WorkspaceLeaf & {
    on(name: "extended-graph:disable-plugin",   callback: (leaf: WorkspaceLeafExt) => any) : EventRef;
    on(name: "extended-graph:enable-plugin",    callback: (leaf: WorkspaceLeafExt) => any) : EventRef;
    on(name: "extended-graph:reset-plugin",     callback: (leaf: WorkspaceLeafExt) => any) : EventRef;

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
    viewsUI: ViewsUI;

    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super();
        this.leaf = leaf;
        this.graphsManager = graphsManager;

        this.graph = new Graph(this);
        this.addChild(this.graph);

        this.viewsUI = new ViewsUI(this);
        this.addChild(this.viewsUI);
        if (this.graphsManager.plugin.settings.enableLinks || this.graphsManager.plugin.settings.enableTags) {
            this.legendUI = new LegendUI(this);
            this.addChild(this.legendUI);
        }
        this.viewsUI.updateViewsList(this.graphsManager.plugin.settings.views);
    }

    onload(): void {
        let view = this.graphsManager.plugin.settings.views.find(v => v.id === this.viewsUI.currentViewID);
        (view) && this.graph.setEngineOptions(view.engineOptions);

        this.startUpdateFrame();
    }

    onunload(): void {
        this.stopAnimation = true;
        this.leaf.view.renderer.worker.removeEventListener("message", this.startUpdateFrame.bind(this));
        this.leaf.view.renderer.worker.removeEventListener("wheel", this.startUpdateFrame.bind(this));

        this.leaf.view.renderer.px.stage.children[1].removeEventListener('childAdded', this.childAddedByEngine.bind(this));
        this.leaf.view.renderer.px.stage.children[1].removeEventListener('childRemoved', this.childRemovedByEngine.bind(this));

        this.onViewChanged(DEFAULT_VIEW_ID);

        //this._children.forEach(c => c.unload());

        //this.graph.nodesSet.enableAll();
        //this.graph.linksSet.enableAll();
        //this.graph.updateWorker();
    }

    onGraphReady() : void {
        if (this.graph.settings.linkCurves) {
            this.leaf.view.renderer.worker.addEventListener("message", this.startUpdateFrame.bind(this));
            this.leaf.view.renderer.px.stage.addEventListener("wheel", this.startUpdateFrame.bind(this));
        }

        this.leaf.view.renderer.px.stage.children[1].addEventListener('childAdded', this.childAddedByEngine.bind(this));
        this.leaf.view.renderer.px.stage.children[1].addEventListener('childRemoved', this.childRemovedByEngine.bind(this));

        this.onViewChanged(this.viewsUI.currentViewID);
        this.graph.test();
    }

    // UPDATES

    private childRemovedByEngine() : void {

    }

    private childAddedByEngine() : void {
        if (this.leaf.view.renderer.nodes.length > this.graphsManager.plugin.settings.maxNodes) {
            new Notice(`Try to handle ${this.leaf.view.renderer.nodes.length}, but the limit is ${this.graphsManager.plugin.settings.maxNodes}. Extended Graph disabled.`);
            this.graphsManager.disablePlugin(this.leaf);
            return;
        }

        this.graph.nodesSet.connectNodes();
        this.graph.linksSet.connectLinks();

        if (this.graph.linksSet.disconnectedLinks) {
            let linksToDisable = new Set<string>();
            for (const id of this.graph.linksSet.disconnectedLinks) {
                let l = this.graph.linksSet.linksMap.get(id);
                if (!l) continue;
                if (this.graph.renderer.links.find(link => l.link.source.id === link.source.id && l.link.target.id === link.target.id)) {
                    linksToDisable.add(id);
                }
            }
            if (linksToDisable.size > 0) {
                this.graph.linksSet.disableLinks(linksToDisable, false);
                this.graph.updateWorker();
            }
        }
    }

    onGraphNeedsUpdate() {
        if (this.graphsManager.plugin.settings.enableTags && this.graph.nodesSet) {
            this.graph.initSets().then(() => {
                this.graph.nodesSet?.resetArcs();
            }).catch(e => {
                console.error(e);
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
            for(const [id, l] of this.graph.linksSet?.linksMap) {
                l.wrapper?.updateGraphics();
            }
        }
        this.animationFrameId = requestAnimationFrame(this.updateFrame.bind(this));
    }

    // INTERACTIVES

    onInteractivesAdded(name: string, colorMaps: Map<string, Uint8Array>) {
        switch (name) {
            case "tag":
                this.onTagTypesAdded(colorMaps);
                break;
            case "link":
                this.onLinkTypesAdded(colorMaps);
                break;
        }
    }

    onInteractivesRemoved(name: string, types: Set<string>) {
        switch (name) {
            case "tag":
                this.onTagTypesRemoved(types);
                break;
            case "link":
                this.onLinkTypesRemoved(types);
                break;
        }
    }

    onInteractiveColorChanged(name: string, type: string, color: Uint8Array) {
        switch (name) {
            case "tag":
                this.onTagColorChanged(type, color);
                break;
            case "link":
                this.onLinkColorChanged(type, color);
                break;
        }
    }

    onInteractivesDisabled(name: string, types: string[]) {
        switch (name) {
            case "tag":
                this.disableTagTypes(types);
                break;
            case "link":
                this.disableLinkTypes(types);
                break;
        }
    }

    onInteractivesEnabled(name: string, types: string[]) {
        switch (name) {
            case "tag":
                this.enableTagTypes(types);
                break;
            case "link":
                this.enableLinkTypes(types);
                break;
        }
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

    onTagColorChanged(type: string, color: Uint8Array) {
        this.graph.nodesSet?.updateArcsColor(type, color);
        this.legendUI?.updateLegend("tag", type, color);
        this.leaf.view.renderer.changed();
    }

    disableTagTypes(types: string[]) {
        let nodesToDisable: string[] = [];
        for (const type of types) {
            nodesToDisable = nodesToDisable.concat(this.graph.nodesSet.disableTag(type));
        }
        if (!this.graph.settings.fadeOnDisable && nodesToDisable.length > 0) {
            this.graph.disableNodes(nodesToDisable);
            this.graph.updateWorker();
        }
        else {
            this.leaf.view.renderer.changed();
        }
    }

    enableTagTypes(types: string[]) {
        let nodesToEnable: string[] = [];
        for (const type of types) {
            nodesToEnable = nodesToEnable.concat(this.graph.nodesSet.enableTag(type));
        }
        if (!this.graph.settings.fadeOnDisable && nodesToEnable.length > 0) {
            this.graph.enableNodes(nodesToEnable);
            this.graph.updateWorker();
        }
        else {
            this.leaf.view.renderer.changed();
        }
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

    onLinkColorChanged(type: string, color: Uint8Array) {
        this.graph.linksSet?.updateLinksColor(type, color);
        this.legendUI?.updateLegend("link", type, color);
        this.leaf.view.renderer.changed();
    }

    disableLinkTypes(types: string[]) {
        if (this.graph.disableLinkTypes(types)) {
            this.graph.updateWorker();
        }
    }

    enableLinkTypes(types: string[]) {
        if (this.graph.enableLinkTypes(types)) {
            this.graph.updateWorker();
        }
    }

    // VIEWS

    onViewChanged(id: string) {
        const viewData = this.graphsManager.plugin.settings.views.find(v => v.id === id);
        if (!viewData) return;

        if (this.graph.nodesSet.tagsManager) {
            this.graph.nodesSet.tagsManager.loadView(viewData);
            this.legendUI?.enableAll("tag");
            viewData.disabledTags.forEach(type => {
                this.legendUI?.disable("tag", type);
            });
        }

        if (this.graph.linksSet.linksManager) {
            this.graph.linksSet.linksManager.loadView(viewData);
            this.legendUI?.enableAll("link");
            viewData.disabledLinks.forEach(type => {
                this.legendUI?.disable("link", type);
            });
        }

        this.graph.setEngineOptions(viewData.engineOptions);
        this.graph.updateWorker();
    }
}