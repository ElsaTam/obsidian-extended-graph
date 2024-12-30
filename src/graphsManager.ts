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
import { logToFile } from "./logs";


export class GraphsManager extends Component {
    globalUI = new Map<string, {menu: MenuUI, control: GraphControlsUI}>();
    optionsBackup = new Map<string, GraphPluginOptions>();
    activeFile: TFile | null = null;

    lastBackup: string;
    localGraphID: string | null = null;
    
    plugin: GraphExtendedPlugin;
    dispatchers = new Map<string, GraphEventsDispatcher>();
    
    constructor(plugin: GraphExtendedPlugin) {
        super();
        this.plugin = plugin;
    }

    onload(): void {
        this.registerEvent(this.plugin.app.metadataCache.on('changed', (file: TFile, data: string, cache: CachedMetadata) => {
            this.onMetadataCacheChange(file, data, cache);
        }));
        this.registerEvent(this.plugin.app.workspace.on('quit', () => {
            logToFile(this.plugin.app, "Quitting");
            for (const [id, dispatcher] of this.dispatchers) {
                dispatcher.leaf.view.removeChild(dispatcher);
                this.disablePluginFromLeafID(id);
            }
            this.restoreBackup();
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
        
                const needsUpdate = !nodeWrapper.arcsWrappers.get(TAG_KEY)?.matchesTypes(newTypes);
        
                if (needsUpdate) {
                    const types = dispatcher.graph.nodesSet?.getAllInteractivesInGraph(TAG_KEY);
                    (types) && dispatcher.graph.nodesSet?.managers.get(TAG_KEY)?.addTypes(types);
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
        if (this.optionsBackup.get(leaf.id) && leaf.view.getViewType() === "graph") return;

        this.backupOptions(leaf);
    }

    onGlobalFilterChanged(filter: string) : void {
        for (const [id, dispatcher] of this.dispatchers) {
            dispatcher.graph.engine.updateSearch();
            let textarea = this.globalUI.get(id)?.control.settingGlobalFilter.controlEl.querySelector("textarea");
            (textarea) && (textarea.value = filter);
        }
    }

    // MENU

    setGlobalUI(leaf: WorkspaceLeafExt) : {menu: MenuUI, control: GraphControlsUI} {
        let globalUI = this.globalUI.get(leaf.id);
        if (globalUI) return globalUI;

        let menuUI = new MenuUI(leaf);
        leaf.view.addChild(menuUI);
        this.registerEvent(leaf.on('extended-graph:disable-plugin', this.disablePlugin.bind(this)));
        this.registerEvent(leaf.on('extended-graph:enable-plugin', this.enablePlugin.bind(this)));
        this.registerEvent(leaf.on('extended-graph:reset-plugin', this.resetPlugin.bind(this)));

        let controlsUI = new GraphControlsUI(leaf, this);
        controlsUI.onPluginDisabled();
        leaf.view.addChild(controlsUI);
        
        globalUI = {menu: menuUI, control: controlsUI};
        this.globalUI.set(leaf.id, globalUI);
        return globalUI;
    }

    // SETTINGS UPDATE

    updatePalette(interactive: string) : void {
        this.dispatchers.forEach(dispatcher => {
            dispatcher.graph.interactiveManagers.get(interactive)?.recomputeColors();
        });
    }

    updateColor(key: string, type: string) : void {
        this.dispatchers.forEach(dispatcher => {
            dispatcher.graph.nodesSet?.managers.get(key)?.recomputeColor(type);
        });
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
        this.backupOptions(leaf);

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
        let globalUI = this.globalUI.get(leafID);

        globalUI?.menu.disable();
        globalUI?.control.onPluginDisabled();
        if (!dispatcher) return;

        dispatcher.unload();
        dispatcher.graph.nodesSet.unload();
        dispatcher.graph.linksSet.unload();
    }

    onPluginUnloaded(leaf: WorkspaceLeafExt) : void {
        logToFile(this.plugin.app, "Plugin unloaded");
        this.dispatchers.delete(leaf.id);
        
        if (this.localGraphID === leaf.id) this.localGraphID = null;

        if (leaf.view._loaded) {
            this.applyNormalView(leaf);
        }
        this.restoreBackup();
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
        const currentUsedLeavesID = Array.from(this.optionsBackup.keys());
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
                this.globalUI.delete(id);
                if (this.lastBackup !== id) this.optionsBackup.delete(id);
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

    backupOptions(leaf: WorkspaceLeafExt) {
        const engine = getEngine(leaf);
        const options = structuredClone(engine.getOptions());
        logToFile(this.plugin.app, "Backing up options: " + JSON.stringify(options));
        this.optionsBackup.set(leaf.id, options);
        this.lastBackup = leaf.id;
        this.plugin.settings.backupGraphOptions = options;
        this.plugin.saveSettings();
    }

    restoreBackup() {
        let backup = this.optionsBackup.get(this.lastBackup);
        logToFile(this.plugin.app, "Restoring backup: " + JSON.stringify(backup));
        let corePluginInstance: GraphCorePluginInstance = (this.plugin.app.internalPlugins.getPluginById("graph")?.instance as GraphCorePluginInstance);
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
        }
        corePluginInstance.saveOptions();
    }

    applyNormalView(leaf: WorkspaceLeafExt) {
        const engine = getEngine(leaf);
        engine?.setOptions(this.optionsBackup.get(leaf.id));
        engine?.updateSearch();
    }
}