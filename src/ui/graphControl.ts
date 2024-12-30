import { Component, setIcon, Setting } from "obsidian";
import { EngineOptions } from "src/views/viewData";
import { DEFAULT_VIEW_ID } from "src/globalVariables";
import { GraphEventsDispatcher } from "src/graph/graphEventsDispatcher";
import { GraphsManager } from "src/graphsManager";
import { getEngine } from "src/helperFunctions";
import { WorkspaceLeafExt } from "src/types/leaf";
import { GraphPlugin, GraphPluginInstance } from "obsidian-typings";
import { GraphCorePluginInstance } from "src/types/graphPluginInstance";

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
        this.createSaveForDefaultView();
        this.onlyWhenPluginEnabled.push(this.createSaveForNormalView().settingEl);
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

    createSaveForDefaultView() : Setting {
        let setting = new Setting(this.treeItemChildren)
            .setName("Save for default view")
            .setTooltip("Save the current settings as the default view settings");
        let icon = setting.controlEl.createDiv("clickable-icon save-button");
        setIcon(icon, "arrow-up-to-line");
        icon.addEventListener('click', e => {
            this.saveForDefaultView();
        });
        return setting;
    }

    createSaveForNormalView() : Setting {
        let setting = new Setting(this.treeItemChildren)
            .setName("Save for normal view")
            .setTooltip("Save the current settings as the normal view settings (no plugin enabled)");
        let icon = setting.controlEl.createDiv("clickable-icon save-button");
        setIcon(icon, "arrow-down-to-line");
        icon.addEventListener('click', e => {
            this.saveForNormalView();
        });
        return setting;
    }

    createGlobalFilter() : Setting {
        let filterHeader = new Setting(this.treeItemChildren).setName("Global filter");
        this.onlyWhenPluginEnabled.push(filterHeader.settingEl);

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

    saveForDefaultView() {
        let viewData = this.graphsManager.plugin.settings.views.find(v => v.id === DEFAULT_VIEW_ID);
        if (!viewData) return;
        let engine = getEngine(this.leaf);
        viewData.engineOptions = new EngineOptions(engine.getOptions());
        this.graphsManager.onViewNeedsSaving(viewData);
    }

    saveForNormalView() {
        let globalFilter = this.graphsManager.plugin.settings.globalFilter;
        this.graphsManager.plugin.settings.globalFilter = "";
        let instance: GraphCorePluginInstance = ((this.leaf.app.internalPlugins.getPluginById("graph") as GraphPlugin).instance as GraphCorePluginInstance);
        
        let engine = getEngine(this.leaf);
        instance.options = engine.getOptions();
        instance.saveOptions();
        this.graphsManager.plugin.settings.globalFilter = globalFilter;
    }
}