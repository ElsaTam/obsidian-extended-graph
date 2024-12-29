import { Component, setIcon, Setting, WorkspaceLeaf } from "obsidian";
import { EngineOptions } from "src/views/viewData";
import { DEFAULT_VIEW_ID } from "src/globalVariables";
import { GraphEventsDispatcher, WorkspaceLeafExt } from "src/graph/graphEventsDispatcher";
import { GraphsManager } from "src/graphsManager";

export class GraphControlsUI extends Component {
    graphsManager: GraphsManager;
    dispatcher: GraphEventsDispatcher | null;
    leaf: WorkspaceLeafExt;

    graphControls: HTMLElement;

    isCollapsed: boolean;

    root: HTMLDivElement;
    treeItemChildren: HTMLDivElement;
    collapseIcon: HTMLDivElement;
    onlyWhenPluginEnabled: HTMLElement[] = [];

    settingGlobalFilter: Setting;

    optionListeners: (t: any) => any;
    
    constructor(leaf: WorkspaceLeafExt, graphsManager: GraphsManager) {
        super();
        this.leaf = leaf;
        this.graphsManager = graphsManager;
        this.graphControls = leaf.containerEl.querySelector(".graph-controls") as HTMLElement;

        this.root = this.graphControls.createDiv("tree-item graph-control-section mod-extended-graph");

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

        let filterHeader = new Setting(this.treeItemChildren).setName("Filter");
        this.onlyWhenPluginEnabled.push(filterHeader.settingEl);

        this.settingGlobalFilter = this.createGlobalFilter();
        this.onlyWhenPluginEnabled.push(this.settingGlobalFilter.settingEl);

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

    createSaveSettingsAsDefault() : Setting {
        let setting = new Setting(this.treeItemChildren)
            .setName("Save settings as default");
        let icon = setting.controlEl.createDiv("clickable-icon save-button");
        setIcon(icon, "save");
        icon.addEventListener('click', e => {
            this.saveSettingsAsDefault();
        });
        return setting;
    }

    createGlobalFilter() : Setting {
        return new Setting(this.treeItemChildren)
            .setClass("mod-search-setting")
            .addTextArea(cb => {
                cb.setPlaceholder("Global filter")
                  .setValue(this.graphsManager.plugin.settings.globalFilter);
                cb.inputEl.addClass("search-input-container");
                cb.inputEl.onblur = (async e => {
                    if (this.graphsManager.plugin.settings.globalFilter !== cb.getValue()) {
                        this.graphsManager.plugin.settings.globalFilter = cb.getValue();
                        await this.graphsManager.plugin.saveSettings();
                        this.graphsManager.plugin.graphsManager.onGlobalFilterChanged(cb.getValue());
                    }
                });
                cb.inputEl.onkeydown = (async e => {
                    if ("Enter" === e.key) {
                        e.preventDefault();
                        if (this.graphsManager.plugin.settings.globalFilter !== cb.getValue()) {
                            this.graphsManager.plugin.settings.globalFilter = cb.getValue();
                            await this.graphsManager.plugin.saveSettings();
                            this.graphsManager.plugin.graphsManager.onGlobalFilterChanged(cb.getValue());
                        }
                    }
                });
            });
    }

    onPluginEnabled(dispatcher: GraphEventsDispatcher) : void {
        this.dispatcher = dispatcher;
        this.onlyWhenPluginEnabled.forEach(el => {
            this.treeItemChildren.appendChild(el);
        });
    }

    onPluginDisabled() : void {
        this.onlyWhenPluginEnabled.forEach(el => {
            try {
                this.treeItemChildren.removeChild(el);
            }
            catch {

            }
        });
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
        let viewData = this.graphsManager.plugin.settings.views.find(v => v.id === DEFAULT_VIEW_ID);
        if (!viewData) return;
        let engine: any;
        if (this.leaf.view.getViewType() === "graph") {
            // @ts-ignore
            engine =  this.leaf.view.dataEngine;
        }
        else if(this.leaf.view.getViewType() === "localgraph") {
            // @ts-ignore
            engine =  this.leaf.view.engine;
        }
        viewData.engineOptions = new EngineOptions(engine.getOptions());
        this.graphsManager.onViewNeedsSaving(viewData);
    }
}