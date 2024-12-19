import { Component, Modal, setIcon, WorkspaceLeaf } from "obsidian";
import { Graph } from "../graph";
import { EngineOptions, GraphViewData } from "src/views/viewData";
import { DEFAULT_VIEW_ID, NONE_TYPE } from "src/globalVariables";

export class GraphControlsUI extends Component {
    viewContent: HTMLElement;
    graph: Graph;
    leaf: WorkspaceLeaf;

    isCollapsed: boolean;

    root: HTMLDivElement;
    treeItemChildren: HTMLDivElement;
    collapseIcon: HTMLDivElement;
    

    constructor(graphicsManager: Graph, leaf: WorkspaceLeaf) {
        super();
        this.graph = graphicsManager;
        this.leaf = leaf;
        this.viewContent = this.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        
        // @ts-ignore
        let engine: any = this.leaf.view.getViewType() === "graph" ? this.leaf.view.dataEngine : this.leaf.view.engine;

        this.root = engine.controlsEl.createDiv("tree-item graph-control-section mod-extended-graph");
        let collapsible = this.root.createDiv("tree-item-self mod-collapsible");
        this.collapseIcon = collapsible.createDiv("tree-item-icon collapse-icon is-collapsed");
        setIcon(this.collapseIcon, "right-triangle");
        let inner = collapsible.createDiv("tree-item-inner");
        let header = inner.createEl("header", {
            cls: "graph-control-section-header",
            text: "Extended Graph"
        });

        this.treeItemChildren = this.root.createDiv("tree-item-children");
        let itemSave = this.treeItemChildren.createDiv("setting-item");
        let info = itemSave.createDiv("setting-item-info");
        let name = info.createDiv("setting-item-name");
        name.setText("Save settings as default");
        let description = info.createDiv("setting-item-description");
        let control = itemSave.createDiv("setting-item-control");
        let saveButton = control.createEl("button");
        setIcon(saveButton, "save");
        saveButton.addEventListener('click', event => {
            this.saveSettingsAsDefault();
        });

        collapsible.onClickEvent(() => {
            if (this.isCollapsed) {
                this.openGraphControlSection();
            }
            else {
                this.collapseGraphControlSection();
            }
        })

        this.collapseGraphControlSection();
    }

    onunload(): void {
        this.root.parentNode?.removeChild(this.root);
    }

    openGraphControlSection() {
        this.root.removeClass("is-collapsed");
        this.root.appendChild(this.treeItemChildren);
        this.collapseIcon.removeClass("is-collapsed");
        this.isCollapsed = false;
    }

    collapseGraphControlSection() {
        this.root.addClass("is-collapsed");
        this.root.removeChild(this.treeItemChildren);
        this.collapseIcon.addClass("is-collapsed");
        
        this.isCollapsed = true;
    }

    saveSettingsAsDefault() {
        let viewData = this.graph.settings.views.find(v => v.id === DEFAULT_VIEW_ID);
        if (!viewData) return;
        viewData.engineOptions = new EngineOptions(this.graph.engine.getOptions());
        viewData.engineOptions.search = this.graph.engine.filterOptions.search.inputEl.value;
        this.graph.app.workspace.trigger('extended-graph:view-needs-saving', viewData);
    }
}