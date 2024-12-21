import { App, CachedMetadata, Component, TFile, WorkspaceLeaf } from "obsidian";
import { GraphEventsDispatcher, WorkspaceLeafExt } from "./graph/graphEventsDispatcher";
import GraphExtendedPlugin from "./main";
import { GraphViewData } from "./views/viewData";
import { MenuUI } from "./graph/ui/menu";
import { DEFAULT_VIEW_ID } from "./globalVariables";


export class GraphsManager extends Component {
    dispatchers = new Map<string, GraphEventsDispatcher>();
    menus = new Map<string, MenuUI>();
    isInit = new Map<string, boolean>();
    app: App;
    themeObserver: MutationObserver;
    plugin: GraphExtendedPlugin;
    activeFile: TFile | null = null;
    


    constructor(plugin: GraphExtendedPlugin, app: App) {
        super();
        this.plugin = plugin;
        this.app = app;
    }

    onload(): void {
        this.registerEvent(this.app.metadataCache.on('changed', (file: TFile, data: string, cache: CachedMetadata) => {
            this.onMetadataCacheChange(file, data, cache);
        }));
        
        this.registerEvent(this.app.workspace.on('css-change', this.onThemeChange.bind(this)));
        // @ts-ignore
        this.registerEvent(this.app.workspace.on('extended-graph:view-needs-saving', this.onViewNeedsSaving.bind(this)));
        // @ts-ignore
        this.registerEvent(this.app.workspace.on('extended-graph:view-needs-deletion', this.onViewNeedsDeletion.bind(this)));
    }

    onunload(): void {
        if (this.themeObserver) {
            this.themeObserver.disconnect();
        }
    }

    // EVENTS

    onThemeChange() {
        this.dispatchers.forEach(dispatcher => {
            if (dispatcher.graph.nodesSet) {
                dispatcher.graph.nodesSet.updateOpacityLayerColor();
                dispatcher.renderer.changed();
            }
        });
    }

    async onMetadataCacheChange(file: TFile, data: string, cache: CachedMetadata) {
        if (this.plugin.settings.enableTags) {
            this.dispatchers.forEach(dispatcher => {
                if (!(dispatcher.graph && dispatcher.renderer)) return;
        
                const container = dispatcher.graph.nodesSet?.getNodeWrapperFromFile(file);
                if (!container) return;
        
                let newTypes: string[] = [];
                cache?.tags?.forEach(tagCache => {
                    const type = tagCache.tag.replace('#', '');
                    newTypes.push(type);
                });
        
                const needsUpdate = !container.matchesTagsTypes(newTypes);
        
                if (needsUpdate) {
                    const types = dispatcher.graph.nodesSet?.getAllTagTypesFromCache(this.app);
                    (types) && dispatcher.graph.nodesSet?.tagsManager?.update(types);
                }
            });
        }
    }

    async onViewNeedsSaving(viewData: GraphViewData) {
        let currentViewData = this.plugin.settings.views.find(v => v.name === viewData.name);
        if (currentViewData) {
            this.plugin.settings.views[this.plugin.settings.views.indexOf(currentViewData)] = viewData;
        }
        else {
            this.plugin.settings.views.push(viewData);
        }
        await this.plugin.saveSettings();
        new Notice(`Extended Graph: view "${viewData.name}" has been saved`);
        this.dispatchers.forEach(dispatcher => {
            dispatcher.viewsUI.updateViewsList(this.plugin.settings.views);
        });
    }

    async onViewNeedsDeletion(id: string) {
        const view = this.plugin.settings.views.find(v => v.id === id);
        if (!view) return;
        this.plugin.settings.views.remove(view);
        await this.plugin.saveSettings();
        new Notice(`Extended Graph: view "${view.name}" has been removed`);
        this.dispatchers.forEach(dispatcher => {
            dispatcher.viewsUI.updateViewsList(this.plugin.settings.views);
        });
    }

    onPluginEnabled(leaf: WorkspaceLeafExt) : void {
        this.enablePlugin(leaf);
    }

    onPluginDisabled(leaf: WorkspaceLeafExt) : void {
        this.disablePlugin(leaf);
    }

    onNewLeafOpen(leaf: WorkspaceLeafExt) : void {
        if (this.isInit.get(leaf.id)) return;

        // Add menu UI
        this.setMenu(leaf);

        // If global graph, set the engine options to default
        if (leaf.view.getViewType() === "graph") {
            // @ts-ignore
            let engine = leaf.view.dataEngine;
            let defaultView = this.plugin.settings.views.find(v => v.id === DEFAULT_VIEW_ID);
            if (defaultView) engine.setOptions(defaultView.engineOptions);
        }

        this.isInit.set(leaf.id, true);
    }

    // MENU

    setMenu(leaf: WorkspaceLeafExt) : MenuUI {
        let menuUI = this.menus.get(leaf.id);
        if (menuUI) return menuUI;
        menuUI = new MenuUI(leaf);
        leaf.view.addChild(menuUI);
        this.menus.set(leaf.id, menuUI);
        this.registerEvent(leaf.on('extended-graph:disable-plugin', this.onPluginDisabled.bind(this)));
        this.registerEvent(leaf.on('extended-graph:enable-plugin', this.onPluginEnabled.bind(this)));
        return menuUI;
    }

    // SETTINGS UPDATE

    updatePalette(interactive: string) : void {
        if (interactive === "tag" && !this.plugin.settings.enableTags) return;
        if (interactive === "link" && !this.plugin.settings.enableLinks) return;
        this.dispatchers.forEach(dispatcher => {
            dispatcher.graph.interactiveManagers.get(interactive)?.recomputeColors();
        });
    }

    updateTagColor(type: string) : void {
        if (this.plugin.settings.enableTags) {
            this.dispatchers.forEach(dispatcher => {
                dispatcher.graph.nodesSet?.tagsManager?.recomputeColor(type);
            });
        }
    }
    
    // ENABLE/DISABLE PLUGIN

    addGraph(leaf: WorkspaceLeafExt) : GraphEventsDispatcher {
        if (leaf.view.renderer.nodes.length > this.plugin.settings.maxNodes) {
            throw new Error("Too many nodes, plugin is disables in this graph");
        }

        let dispatcher = this.dispatchers.get(leaf.id);
        if (dispatcher) return dispatcher;

        dispatcher = new GraphEventsDispatcher(leaf, this.app, this.plugin, this);

        this.dispatchers.set(leaf.id, dispatcher);
        dispatcher.load();
        leaf.view.addChild(dispatcher);

        return dispatcher;
    }

    enablePlugin(leaf: WorkspaceLeafExt) : void {
        let dispatcher = this.dispatchers.get(leaf.id);
        let menuUI = this.setMenu(leaf);

        if (dispatcher) return;

        try {
            dispatcher = this.addGraph(leaf);
            menuUI.enable();
        }
        catch (error) {
            console.error(error);
            this.disablePlugin(leaf);
        }
    }

    disablePlugin(leaf: WorkspaceLeafExt) : void {
        this.disablePluginFromLeafID(leaf.id);
        leaf.view.renderer.changed();
    }

    disablePluginFromLeafID(leafID: string) {
        let dispatcher = this.dispatchers.get(leafID);
        this.menus.get(leafID)?.disable();
        if (!dispatcher) return;

        dispatcher.unload();
        dispatcher.graph.nodesSet?.unload();
        dispatcher.graph.linksSet?.unload();
        this.dispatchers.delete(leafID);
    }

    syncWithLeaves(leaves: WorkspaceLeaf[]) : void {
        const currentActiveLeavesID = leaves.map(l => l.id);
        const currentUsedLeavesID = Array.from(this.isInit.keys());

        // Remove dispatchers from closed leaves
        for (const id of currentUsedLeavesID) {
            if (! currentActiveLeavesID.includes(id)) {
                this.disablePluginFromLeafID(id);
                this.isInit.delete(id);
            }
        }
    }

    // HIGHLIGHT CURRENT FILE

    highlightFile(file: TFile | null) : void {
        if (this.plugin.settings.enableFocusActiveNote) {
            if (this.activeFile !== file) {
                this.dispatchers.forEach(dispatcher => {
                    if (dispatcher.leaf.view.getViewType() !== "graph") return;
                    if (this.activeFile) {
                        dispatcher.graph.nodesSet?.highlightNode(this.activeFile, false);
                    }
                    if (file) {
                        dispatcher.graph.nodesSet?.highlightNode(file, true);
                    }
                })
                this.activeFile = file;
            }
        }
    }
}