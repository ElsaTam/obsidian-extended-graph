import { CachedMetadata, Component, FileView, TFile, WorkspaceLeaf } from "obsidian";
import { GraphEventsDispatcher, WorkspaceLeafExt } from "./graph/graphEventsDispatcher";
import GraphExtendedPlugin from "./main";
import { GraphViewData } from "./views/viewData";
import { MenuUI } from "./ui/menu";
import { GraphControlsUI } from "./ui/graphControl";


export class GraphsManager extends Component {
    menus = new Map<string, {menu: MenuUI, control: GraphControlsUI}>();
    isInit = new Map<string, boolean>();
    activeFile: TFile | null = null;

    localGraphID: string | null = null;
    
    plugin: GraphExtendedPlugin;
    dispatchers = new Map<string, GraphEventsDispatcher>();

    optionsBackup: any | null;
    
    constructor(plugin: GraphExtendedPlugin) {
        super();
        this.plugin = plugin;
    }

    onload(): void {
        this.registerEvent(this.plugin.app.metadataCache.on('changed', (file: TFile, data: string, cache: CachedMetadata) => {
            this.onMetadataCacheChange(file, data, cache);
        }));
        
        this.registerEvent(this.plugin.app.workspace.on('css-change', this.onThemeChange.bind(this)));
    }

    // EVENTS

    onThemeChange() {
        this.dispatchers.forEach(dispatcher => {
            if (dispatcher.graph.nodesSet) {
                dispatcher.graph.nodesSet.updateOpacityLayerColor();
                dispatcher.graph.renderer.changed();
            }
        });
    }

    onMetadataCacheChange(file: TFile, data: string, cache: CachedMetadata) {
        if (this.plugin.settings.enableTags) {
            this.dispatchers.forEach(dispatcher => {
                if (!(dispatcher.graph && dispatcher.graph.renderer)) return;
        
                const nodeWrapper = dispatcher.graph.nodesSet?.getNodeWrapperFromFile(file);
                if (!nodeWrapper) return;
        
                let newTypes: string[] = [];
                cache?.tags?.forEach(tagCache => {
                    const type = tagCache.tag.replace('#', '');
                    newTypes.push(type);
                });
        
                const needsUpdate = !nodeWrapper.arcsWrapper?.matchesTypes(newTypes);
        
                if (needsUpdate) {
                    const types = dispatcher.graph.nodesSet?.getAllTagsInGraph(this.plugin.app);
                    (types) && dispatcher.graph.nodesSet?.tagsManager?.update(types);
                }
            });
        }
    }

    onViewNeedsSaving(viewData: GraphViewData) {
        let currentViewData = this.plugin.settings.views.find(v => v.name === viewData.name);
        if (currentViewData) {
            this.plugin.settings.views[this.plugin.settings.views.indexOf(currentViewData)] = viewData;
        }
        else {
            this.plugin.settings.views.push(viewData);
        }
        this.plugin.saveSettings().then(() => {
            new Notice(`Extended Graph: view "${viewData.name}" has been saved`);
            this.dispatchers.forEach(dispatcher => {
                dispatcher.viewsUI.updateViewsList(this.plugin.settings.views);
            });
        });
    }

    onViewNeedsDeletion(id: string) {
        const view = this.plugin.settings.views.find(v => v.id === id);
        if (!view) return;
        this.plugin.settings.views.remove(view);
        this.plugin.saveSettings().then(() => {
            new Notice(`Extended Graph: view "${view.name}" has been removed`);
            this.dispatchers.forEach(dispatcher => {
                dispatcher.viewsUI.updateViewsList(this.plugin.settings.views);
            });
        });
    }

    onNewLeafOpen(leaf: WorkspaceLeafExt) : void {
        // Add menu UI
        let menu = this.setGlobalUI(leaf);
        
        // plugin already enabled
        if (this.dispatchers.get(leaf.id)) return;

        // leaf already opened and is global graph
        if (this.isInit.get(leaf.id) && leaf.view.getViewType() === "graph") return;

        this.isInit.set(leaf.id, true);
    }

    onGlobalFilterChanged(filter: string) : void {
        for (const [id, dispatcher] of this.dispatchers) {
            dispatcher.graph.engine.updateSearch();
            let textarea = this.menus.get(id)?.control.settingGlobalFilter.controlEl.querySelector("textarea");
            (textarea) && (textarea.value = filter);
        }
    }

    // MENU

    setGlobalUI(leaf: WorkspaceLeafExt) : {menu: MenuUI, control: GraphControlsUI} {
        let globalUI = this.menus.get(leaf.id);
        if (globalUI) return globalUI;

        let menuUI = new MenuUI(leaf);
        leaf.view.addChild(menuUI);
        this.registerEvent(leaf.on('extended-graph:disable-plugin', this.disablePlugin.bind(this)));
        this.registerEvent(leaf.on('extended-graph:enable-plugin', this.enablePlugin.bind(this)));
        this.registerEvent(leaf.on('extended-graph:reset-plugin', this.resetPlugin.bind(this)));

        let controlsUI = new GraphControlsUI(leaf, this);
        leaf.view.addChild(controlsUI);
        
        globalUI = {menu: menuUI, control: controlsUI};
        this.menus.set(leaf.id, globalUI);
        return globalUI;
    }

    // SETTINGS UPDATE

    updatePalette(interactive: string) : void {
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

    addGraph(leaf: WorkspaceLeafExt, viewID?: string) : GraphEventsDispatcher {
        let dispatcher = this.dispatchers.get(leaf.id);
        if (dispatcher) return dispatcher;

        dispatcher = new GraphEventsDispatcher(leaf, this);
        (viewID) && (dispatcher.viewsUI.currentViewID = viewID);
        (viewID) && (dispatcher.viewsUI.select.value = viewID);

        this.dispatchers.set(leaf.id, dispatcher);
        dispatcher.load();
        leaf.view.addChild(dispatcher);

        if (leaf.view.getViewType() === "localgraph") {
            this.localGraphID = leaf.id;
        }

        return dispatcher;
    }

    enablePlugin(leaf: WorkspaceLeafExt, viewID?: string) : void {
        let dispatcher = this.dispatchers.get(leaf.id);
        let globalUI = this.setGlobalUI(leaf);

        if (!this.optionsBackup) { this.backupNormalView(); }

        if (dispatcher) return;

        if (leaf.view.renderer.nodes.length > this.plugin.settings.maxNodes) {
            new Notice(`Try to handle ${leaf.view.renderer.nodes.length}, but the limit is ${this.plugin.settings.maxNodes}. Extended Graph disabled.`);
            return;
        }
        else {
            dispatcher = this.addGraph(leaf, viewID);
            globalUI.menu.enable();
            globalUI.control.onPluginEnabled(dispatcher);
        }
    }

    disablePlugin(leaf: WorkspaceLeafExt) : void {
        this.disablePluginFromLeafID(leaf.id);
        leaf.view.renderer.changed();
    }

    disablePluginFromLeafID(leafID: string) {
        let dispatcher = this.dispatchers.get(leafID);
        let globalUI = this.menus.get(leafID);

        globalUI?.menu.disable();
        globalUI?.control.onPluginDisabled();
        if (!dispatcher) return;

        dispatcher.unload();
        dispatcher.graph.nodesSet?.unload();
        dispatcher.graph.linksSet?.unload();
        this.dispatchers.delete(leafID);
        
        if (this.localGraphID === leafID) this.localGraphID = null;

        if (this.dispatchers.size === 0) {
            this.applyNormalView(dispatcher.graph.engine);
            this.optionsBackup = null;
        }
    }

    resetPlugin(leaf: WorkspaceLeafExt) : void {
        let dispatcher = this.dispatchers.get(leaf.id);
        let viewID = dispatcher?.viewsUI.currentViewID;
        let scale = dispatcher ? dispatcher.graph.renderer.targetScale : false;
        this.disablePlugin(leaf);
        this.enablePlugin(leaf, viewID);
        dispatcher = this.dispatchers.get(leaf.id);
        if (dispatcher && scale)
            dispatcher.graph.renderer.targetScale = scale;
    }

    syncWithLeaves(leaves: WorkspaceLeaf[]) : void {
        const currentActiveLeavesID = leaves.map(l => l.id);
        const currentUsedLeavesID = Array.from(this.isInit.keys());
        const localLeaf = leaves.find(l => l.view.getViewType() === "localgraph");
        if (localLeaf) {
            this.localGraphID = localLeaf.id;
        }
        else {
            this.localGraphID = null;
        }

        // Remove dispatchers from closed leaves
        for (const id of currentUsedLeavesID) {
            if (! currentActiveLeavesID.includes(id)) {
                this.disablePluginFromLeafID(id);
                this.isInit.delete(id);
                this.menus.delete(id);
            }
        }
    }

    // CHANGE CURRENT MARKDOWN FILE

    onActiveLeafChange(leaf: WorkspaceLeaf | null) {
        if (leaf && leaf.view.getViewType() === "markdown" && leaf.view instanceof FileView) {
            if (this.activeFile !== leaf.view.file) {
                this.highlightFile(leaf.view.file);
                if (this.localGraphID) {
                    let localDispatcher = this.dispatchers.get(this.localGraphID);
                    localDispatcher && this.resetPlugin(localDispatcher.leaf);
                }
                this.activeFile = leaf.view.file;
            }
        }
        else {
            this.highlightFile(null);
        }
    }

    highlightFile(file: TFile | null) : void {
        if (this.plugin.settings.enableFocusActiveNote) {
            this.dispatchers.forEach(dispatcher => {
                if (dispatcher.leaf.view.getViewType() !== "graph") return;
                if (this.activeFile) {
                    dispatcher.graph.nodesSet?.highlightNode(this.activeFile, false);
                }
                if (file) {
                    dispatcher.graph.nodesSet?.highlightNode(file, true);
                }
            })
        }
    }

    // HANDLE NORMAL AND DEFAULT VIEW

    backupNormalView() {
        let corePluginInstance: any = this.plugin.app.internalPlugins.getPluginById("graph")?.instance;
        this.optionsBackup = structuredClone(corePluginInstance.options);
    }

    applyNormalView(engine: any) {
        let corePluginInstance: any = this.plugin.app.internalPlugins.getPluginById("graph")?.instance;
        // @ts-ignore
        if (corePluginInstance) {
            corePluginInstance.options.colorGroups = this.optionsBackup.colorGroups;
            corePluginInstance.options.search = this.optionsBackup.search;
            corePluginInstance.options.hideUnresolved = this.optionsBackup.hideUnresolved;
            corePluginInstance.options.showAttachments = this.optionsBackup.showAttachments;
            corePluginInstance.options.showOrphans = this.optionsBackup.showOrphans;
            corePluginInstance.options.showTags = this.optionsBackup.showTags;
            corePluginInstance.options.localBacklinks = this.optionsBackup.localBacklinks;
            corePluginInstance.options.localForelinks = this.optionsBackup.localForelinks;
            corePluginInstance.options.localInterlinks = this.optionsBackup.localInterlinks;
            corePluginInstance.options.localJumps = this.optionsBackup.localJumps;
            corePluginInstance.options.lineSizeMultiplier = this.optionsBackup.lineSizeMultiplier;
            corePluginInstance.options.nodeSizeMultiplier = this.optionsBackup.nodeSizeMultiplier;
            corePluginInstance.options.showArrow = this.optionsBackup.showArrow;
            corePluginInstance.options.textFadeMultiplier = this.optionsBackup.textFadeMultiplier;
            corePluginInstance.options.centerStrength = this.optionsBackup.centerStrength;
            corePluginInstance.options.linkDistance = this.optionsBackup.linkDistance;
            corePluginInstance.options.linkStrength = this.optionsBackup.linkStrength;
            corePluginInstance.options.repelStrength = this.optionsBackup.repelStrength;
        }
        engine.setOptions(this.optionsBackup);
    }
}