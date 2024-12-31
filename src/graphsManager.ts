import { CachedMetadata, Component, FileView, TFile, WorkspaceLeaf } from "obsidian";
import { GraphEventsDispatcher } from "./graph/graphEventsDispatcher";
import GraphExtendedPlugin from "./main";
import { GraphViewData } from "./views/viewData";
import { MenuUI } from "./ui/menu";
import { GraphControlsUI } from "./ui/graphControl";
import { getEngine } from "./helperFunctions";
import { GraphCorePluginInstance, GraphPluginOptions } from "./types/graphPluginInstance";
import { WorkspaceLeafExt } from "./types/leaf";
import { TAG_KEY } from "./globalVariables";


export class GraphsManager extends Component {
    globalUIs = new Map<string, {menu: MenuUI, control: GraphControlsUI}>();
    optionsBackup = new Map<string, GraphPluginOptions>();
    activeFile: TFile | null = null;

    lastBackup: string;
    localGraphID: string | null = null;
    
    plugin: GraphExtendedPlugin;
    dispatchers = new Map<string, GraphEventsDispatcher>();

    // ============================== CONSTRUCTOR ==============================
    
    constructor(plugin: GraphExtendedPlugin) {
        super();
        this.plugin = plugin;
    }

    // ================================ LOADING ================================

    onload(): void {
        this.registerEvent(this.plugin.app.metadataCache.on('changed', this.onMetadataCacheChange.bind(this)));
        this.registerEvent(this.plugin.app.workspace.on('css-change', this.onThemeChange.bind(this)));
    }

    // =============================== UNLOADING ===============================

    // ============================= THEME CHANGE ==============================

    private onThemeChange() {
        this.dispatchers.forEach(dispatcher => {
            if (dispatcher.graph.nodesSet) {
                dispatcher.graph.nodesSet.updateOpacityLayerColor();
                dispatcher.graph.renderer.changed();
            }
        });
    }

    // ============================ METADATA CHANGES ===========================

    private onMetadataCacheChange(file: TFile, data: string, cache: CachedMetadata) {
        if (this.plugin.settings.enableTags) {
            this.dispatchers.forEach(dispatcher => {
                if (!dispatcher.graph || !dispatcher.graph.renderer) return;
        
                const nodeWrapper = dispatcher.graph.nodesSet.getNodeWrapperFromFile(file);
                if (!nodeWrapper) return;
        
                const newTypes = this.extractTagsFromCache(cache);
                const needsUpdate = !nodeWrapper.arcsWrappers.get(TAG_KEY)?.matchesTypes(newTypes);

                if (needsUpdate) {
                    this.updateNodeTypes(dispatcher);
                }
            });
        }
    }

    private extractTagsFromCache(cache: CachedMetadata): string[] {
        if (!cache.tags) return [];
        return cache.tags.map(tagCache => tagCache.tag.replace('#', ''));
    }

    private updateNodeTypes(dispatcher: GraphEventsDispatcher): void {
        const types = dispatcher.graph.nodesSet.getAllInteractivesInGraph(TAG_KEY);
        if (types) {
            dispatcher.graph.nodesSet.managers.get(TAG_KEY)?.addTypes(types);
        }
    }

    // ================================ VIEWS =================================

    onViewNeedsSaving(viewData: GraphViewData) {
        this.updateViewArray(viewData);
        this.plugin.saveSettings().then(() => {
            new Notice(`Extended Graph: view "${viewData.name}" has been saved`);
            this.updateAllViews();
        });
    }

    private updateViewArray(viewData: GraphViewData): void {
        const index = this.plugin.settings.views.findIndex(v => v.name === viewData.name);
        if (index >= 0) {
            this.plugin.settings.views[index] = viewData;
        }
        else {
            this.plugin.settings.views.push(viewData);
        }
    }

    onViewNeedsDeletion(id: string) {
        const view = this.plugin.getViewDataById(id);
        if (!view) return;
        this.plugin.settings.views.remove(view);
        this.plugin.saveSettings().then(() => {
            new Notice(`Extended Graph: view "${view.name}" has been removed`);
            this.updateAllViews();
        });
    }
    
    private updateAllViews(): void {
        this.dispatchers.forEach(dispatcher => {
            dispatcher.viewsUI.updateViewsList(this.plugin.settings.views);
        });
    }

    // ================================ LAYOUT =================================

    onNewLeafOpen(leaf: WorkspaceLeafExt): void {
        this.setGlobalUI(leaf);
        if (this.isPluginAlreadyEnabled(leaf)) return;
        if (this.isGlobalGraphAlreadyOpened(leaf)) return;
        this.backupOptions(leaf);
    }

    private isPluginAlreadyEnabled(leaf: WorkspaceLeafExt): boolean {
        return this.dispatchers.has(leaf.id);
    }
    
    private isGlobalGraphAlreadyOpened(leaf: WorkspaceLeafExt): boolean {
        return this.optionsBackup.has(leaf.id) && leaf.view.getViewType() === "graph";
    }

    syncWithLeaves(leaves: WorkspaceLeaf[]): void {
        const currentActiveLeavesID = leaves.map(l => l.id);
        const currentUsedLeavesID = Array.from(this.optionsBackup.keys());
        const localLeaf = leaves.find(l => l.view.getViewType() === "localgraph");
        
        this.localGraphID = localLeaf ? localLeaf.id : null;

        // Remove dispatchers from closed leaves
        for (const id of currentUsedLeavesID) {
            if (! currentActiveLeavesID.includes(id)) {
                this.disablePluginFromLeafID(id);
                this.globalUIs.delete(id);
                if (this.lastBackup !== id) this.optionsBackup.delete(id);
            }
        }
    }

    // =============================== GLOBAL UI ===============================

    private setGlobalUI(leaf: WorkspaceLeafExt): {menu: MenuUI, control: GraphControlsUI} {
        let globalUI = this.globalUIs.get(leaf.id);
        if (globalUI) return globalUI;

        const menuUI = new MenuUI(leaf);
        leaf.view.addChild(menuUI);

        const controlsUI = new GraphControlsUI(leaf, this);
        controlsUI.onPluginDisabled();
        leaf.view.addChild(controlsUI);

        this.registerLeafEvents(leaf);
        
        globalUI = {menu: menuUI, control: controlsUI};
        this.globalUIs.set(leaf.id, globalUI);
        return globalUI;
    }

    private registerLeafEvents(leaf: WorkspaceLeafExt): void {
        this.registerEvent(leaf.on('extended-graph:disable-plugin', this.disablePlugin.bind(this)));
        this.registerEvent(leaf.on('extended-graph:enable-plugin', this.enablePlugin.bind(this)));
        this.registerEvent(leaf.on('extended-graph:reset-plugin', this.resetPlugin.bind(this)));
    }

    // ============================= GLOBAL FILTER =============================

    onGlobalFilterChanged(filter: string): void {
        for (const [id, dispatcher] of this.dispatchers) {
            dispatcher.graph.engine.updateSearch();
            this.updateGlobalFilterUI(id, filter);
        }
    }

    private updateGlobalFilterUI(dispatcherID: string, filter: string): void {
        const textarea = this.globalUIs.get(dispatcherID)?.control.settingGlobalFilter.controlEl.querySelector("textarea");
        if (textarea) textarea.value = filter;
    }

    // ================================= COLORS ================================

    updatePalette(interactive: string): void {
        this.dispatchers.forEach(dispatcher => {
            dispatcher.graph.interactiveManagers.get(interactive)?.recomputeColors();
        });
    }

    updateColor(key: string, type: string): void {
        this.dispatchers.forEach(dispatcher => {
            dispatcher.graph.nodesSet.managers.get(key)?.recomputeColor(type);
        });
    }

    // ============================= ENABLE PLUGIN =============================

    addGraph(leaf: WorkspaceLeafExt, viewID?: string): GraphEventsDispatcher {
        let dispatcher = this.dispatchers.get(leaf.id);
        if (dispatcher) return dispatcher;

        dispatcher = new GraphEventsDispatcher(leaf, this);
        if (viewID) {
            dispatcher.viewsUI.currentViewID = viewID;
            dispatcher.viewsUI.select.value = viewID;
        }

        this.dispatchers.set(leaf.id, dispatcher);
        dispatcher.load();
        leaf.view.addChild(dispatcher);

        if (leaf.view.getViewType() === "localgraph") {
            this.localGraphID = leaf.id;
        }

        return dispatcher;
    }

    enablePlugin(leaf: WorkspaceLeafExt, viewID?: string): void {
        this.backupOptions(leaf);

        if (this.isPluginAlreadyEnabled(leaf)) return;
        if (this.isNodeLimitExceeded(leaf)) return;
        
        const dispatcher = this.addGraph(leaf, viewID);
        const globalUI = this.setGlobalUI(leaf);
        globalUI.menu.enable();
        globalUI.control.onPluginEnabled(dispatcher);
        
    }

    isNodeLimitExceeded(leaf: WorkspaceLeafExt): boolean {
        if (leaf.view.renderer.nodes.length > this.plugin.settings.maxNodes) {
            new Notice(`Try to handle ${leaf.view.renderer.nodes.length}, but the limit is ${this.plugin.settings.maxNodes}. Extended Graph disabled.`);
            return true;
        }
        return false;
    }

    // ============================ DISABLE PLUGIN =============================

    disablePlugin(leaf: WorkspaceLeafExt): void {
        this.disablePluginFromLeafID(leaf.id);
        leaf.view.renderer.changed();
    }

    disablePluginFromLeafID(leafID: string) {
        this.disableUI(leafID);
        this.unloadDispatcher(leafID);
    }

    private disableUI(leafID: string) {
        const globalUI = this.globalUIs.get(leafID);
        if (globalUI) {
            globalUI.menu.disable();
            globalUI.control.onPluginDisabled();
        }
    }

    private unloadDispatcher(leafID: string) {
        const dispatcher = this.dispatchers.get(leafID);
        if (dispatcher) {
            dispatcher.unload();
            dispatcher.graph.nodesSet.unload();
            dispatcher.graph.linksSet.unload();
        }
    }

    onPluginUnloaded(leaf: WorkspaceLeafExt): void {
        this.dispatchers.delete(leaf.id);
        
        if (this.localGraphID === leaf.id) this.localGraphID = null;

        if (leaf.view._loaded) {
            this.applyNormalView(leaf);
        }
        this.restoreBackup();
    }

    // ============================= RESET PLUGIN ==============================

    resetPlugin(leaf: WorkspaceLeafExt): void {
        const dispatcher = this.dispatchers.get(leaf.id);
        const viewID = dispatcher?.viewsUI.currentViewID;
        const scale = dispatcher ? dispatcher.graph.renderer.targetScale : false;
        this.disablePlugin(leaf);
        this.enablePlugin(leaf, viewID);
        const newDispatcher = this.dispatchers.get(leaf.id);
        if (newDispatcher && scale) {
            newDispatcher.graph.renderer.targetScale = scale;
        }
    }

    // ===================== CHANGE CURRENT MARKDOWN FILE ======================

    onActiveLeafChange(leaf: WorkspaceLeaf | null) {
        if (!leaf) return;
        if (this.isMarkdownLeaf(leaf)) {
            this.handleMarkdownViewChange(leaf.view as FileView);
        }
        else {
            this.changeActiveFile(null);
        }
    }

    private isMarkdownLeaf(leaf: WorkspaceLeaf): boolean {
        return (leaf.view.getViewType() === "markdown") && (leaf.view instanceof FileView);
    }

    private handleMarkdownViewChange(view: FileView): void {
        if (this.activeFile !== view.file) {
            this.changeActiveFile(view.file);
            if (this.localGraphID) {
                const localDispatcher = this.dispatchers.get(this.localGraphID);
                if (localDispatcher) this.resetPlugin(localDispatcher.leaf);
            }
            this.activeFile = view.file;
        }
    }

    changeActiveFile(file: TFile | null): void {
        if (!this.plugin.settings.enableFocusActiveNote) return;

        this.dispatchers.forEach(dispatcher => {
            if (dispatcher.leaf.view.getViewType() !== "graph") return;
            this.deEmphasizePreviousActiveFile(dispatcher);
            this.emphasizeActiveFile(dispatcher, file);
        })
    }

    private deEmphasizePreviousActiveFile(dispatcher: GraphEventsDispatcher) {
        if (this.activeFile) {
            dispatcher.graph.nodesSet?.emphasizeNode(this.activeFile, false);
        }
    }

    private emphasizeActiveFile(dispatcher: GraphEventsDispatcher, file: TFile | null) {
        if (file) {
            dispatcher.graph.nodesSet.emphasizeNode(file, true);
        }
    }

    // ==================== HANDLE NORMAL AND DEFAULT VIEW =====================

    backupOptions(leaf: WorkspaceLeafExt) {
        const engine = getEngine(leaf);
        const options = structuredClone(engine.getOptions());
        this.optionsBackup.set(leaf.id, options);
        this.lastBackup = leaf.id;
        this.plugin.settings.backupGraphOptions = options;
        this.plugin.saveSettings();
    }

    restoreBackup() {
        const backup = this.optionsBackup.get(this.lastBackup);
        const corePluginInstance = this.getCorePluginInstance();
        if (corePluginInstance && backup) {
            corePluginInstance.options.colorGroups = backup.colorGroups;
            corePluginInstance.options.search = backup.search;
            corePluginInstance.options.hideUnresolved = backup.hideUnresolved;
            corePluginInstance.options.showAttachments = backup.showAttachments;
            corePluginInstance.options.showOrphans = backup.showOrphans;
            corePluginInstance.options.showTags = backup.showTags;
            corePluginInstance.options.localBacklinks = backup.localBacklinks;
            corePluginInstance.options.localForelinks = backup.localForelinks;
            corePluginInstance.options.localInterlinks = backup.localInterlinks;
            corePluginInstance.options.localJumps = backup.localJumps;
            corePluginInstance.options.lineSizeMultiplier = backup.lineSizeMultiplier;
            corePluginInstance.options.nodeSizeMultiplier = backup.nodeSizeMultiplier;
            corePluginInstance.options.showArrow = backup.showArrow;
            corePluginInstance.options.textFadeMultiplier = backup.textFadeMultiplier;
            corePluginInstance.options.centerStrength = backup.centerStrength;
            corePluginInstance.options.linkDistance = backup.linkDistance;
            corePluginInstance.options.linkStrength = backup.linkStrength;
            corePluginInstance.options.repelStrength = backup.repelStrength;
            corePluginInstance.saveOptions();
        }
    }

    private getCorePluginInstance(): GraphCorePluginInstance | undefined {
        return this.plugin.app.internalPlugins.getPluginById("graph")?.instance as GraphCorePluginInstance;
    }

    applyNormalView(leaf: WorkspaceLeafExt) {
        const engine = getEngine(leaf);
        const options = this.optionsBackup.get(leaf.id);
        if (engine && options) {
            engine.setOptions(options);
            engine.updateSearch();
        }
    }
}