import { Component, Modal, setIcon, Setting, WorkspaceLeaf } from "obsidian";
import { Graph } from "../graph";
import { EngineOptions, GraphViewData } from "src/views/viewData";
import { DEFAULT_VIEW_ID, NONE_TYPE } from "src/globalVariables";

export class GraphControlsUI extends Component {
    viewContent: HTMLElement;
    graph: Graph;
    leaf: WorkspaceLeaf;
    engine: any;

    isCollapsed: boolean;

    root: HTMLDivElement;
    treeItemChildren: HTMLDivElement;
    collapseIcon: HTMLDivElement;

    optionListeners: (t: any) => any;
    

    constructor(graphicsManager: Graph, leaf: WorkspaceLeaf) {
        super();
        this.graph = graphicsManager;
        this.leaf = leaf;
        this.viewContent = this.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        
        // @ts-ignore
        this.engine = this.leaf.view.getViewType() === "graph" ? this.leaf.view.dataEngine : this.leaf.view.engine;

        this.root = this.engine.controlsEl.createDiv("tree-item graph-control-section mod-extended-graph");
        let collapsible = this.root.createDiv("tree-item-self mod-collapsible");
        this.collapseIcon = collapsible.createDiv("tree-item-icon collapse-icon is-collapsed");
        setIcon(this.collapseIcon, "right-triangle");
        let inner = collapsible.createDiv("tree-item-inner");
        let header = inner.createEl("header", {
            cls: "graph-control-section-header",
            text: "Extended Graph"
        });

        this.treeItemChildren = this.root.createDiv("tree-item-children");
        this.createSaveSettingsAsDefault();
        new Setting(this.treeItemChildren).setName("Filter").setHeading();
        this.createGlobalFilter();
        this.createFullFilter();

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

    createSaveSettingsAsDefault() {
        new Setting(this.treeItemChildren)
            .setName("Save settings as default")
            .addButton(cb => {
                setIcon(cb.buttonEl, "save");
                cb.onClick(event => {
                    this.saveSettingsAsDefault();
                });
            });
    }

    createGlobalFilter() {
        new Setting(this.treeItemChildren)
            .setClass("mod-search-setting")
            .addTextArea(cb => {
                cb.setPlaceholder("Global filter")
                  .setValue(this.graph.plugin.settings.globalFilter);
                cb.inputEl.addClass("search-input-container");
                cb.inputEl.onblur = (e => {
                    if (this.graph.plugin.settings.globalFilter !== cb.getValue()) {
                        this.graph.plugin.settings.globalFilter = cb.getValue();
                        this.graph.plugin.saveSettings();
                        this.engine.updateSearch();
                    }
                });
                cb.inputEl.onkeydown = (e => {
                    if ("Enter" === e.key) {
                        e.preventDefault();
                        this.graph.plugin.settings.globalFilter = cb.getValue();
                        this.graph.plugin.saveSettings();
                        this.engine.updateSearch();
                    }
                });
            });
    }

    createFullFilter() {
        new Setting(this.treeItemChildren)
            .setName("Copy full filter")
            .addButton(cb => {
                setIcon(cb.buttonEl, "copy");
                cb.onClick(e => {
                    navigator.clipboard.writeText(this.engine.filterOptions.search.getValue());
                    new Notice(`Extended Graph: full filter copied to clipboard.`);
                });
            })
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
        let viewData = this.graph.plugin.settings.views.find(v => v.id === DEFAULT_VIEW_ID);
        if (!viewData) return;
        viewData.engineOptions = new EngineOptions(this.graph.engine.getOptions());
        viewData.engineOptions.search = this.graph.engine.filterOptions.search.inputEl.value;
        this.graph.app.workspace.trigger('extended-graph:view-needs-saving', viewData);
    }
}