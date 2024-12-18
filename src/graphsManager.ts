import { App, CachedMetadata, Component, TFile, WorkspaceLeaf } from "obsidian";
import { GraphEventsDispatcher, WorkspaceLeafExt } from "./graph/graphEventsDispatcher";
import { ExtendedGraphSettings } from "./settings";
import GraphExtendedPlugin from "./main";
import { GraphViewData } from "./views/viewData";
import { MenuUI } from "./graph/ui/menu";


export class GraphsManager extends Component {
    dispatchers = new Map<string, GraphEventsDispatcher>();
    menus = new Map<string, MenuUI>();
    app: App;
    themeObserver: MutationObserver;
    currentTheme: string;
    currentStyleSheetHref: string | null | undefined;
    plugin: GraphExtendedPlugin;
    


    constructor(plugin: GraphExtendedPlugin, app: App) {
        super();
        this.plugin = plugin;
        this.app = app;
        this.currentTheme = this.getTheme();
        this.currentStyleSheetHref = this.getStyleSheetHref();
    }

    onload(): void {
        this.registerEvent(this.app.metadataCache.on('changed', (file: TFile, data: string, cache: CachedMetadata) => {
            this.handleMetadataCacheChange(file, data, cache);
        }));

        this.listenToThemeChange();
        
        // @ts-ignore
        this.registerEvent(this.app.workspace.on('extended-graph:theme-change', this.onThemeChange.bind(this)));
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

    onThemeChange(theme: string) {
        this.dispatchers.forEach(dispatcher => {
            dispatcher.graph.nodesSet.updateBackground();
            dispatcher.renderer.changed();
        });
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
    
    private listenToThemeChange(): void {
        this.themeObserver = new MutationObserver(() => {
            const newTheme = this.getTheme();
            const newStyleSheetHref = this.getStyleSheetHref();
            if (newTheme !== this.currentTheme || (newStyleSheetHref !== this.currentStyleSheetHref)) {
                this.app.workspace.trigger('extended-graph:theme-change', this.currentTheme);
                this.currentTheme = newTheme;
                this.currentStyleSheetHref = newStyleSheetHref;
            }
        });
        
        this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        this.themeObserver.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
    }

    private getTheme() : string {
        return this.app.vault.getConfig('theme') as string;
    }

    private getStyleSheetHref() : string | null | undefined {
        return document.querySelector('link[rel="stylesheet"][href*="theme"]')?.getAttribute('href');
    }

    addGraph(leaf: WorkspaceLeafExt) : GraphEventsDispatcher {
        if (leaf.view.renderer.nodes.length > this.plugin.settings.maxNodes) {
            throw new Error("Too many nodes, plugin is disables in this graph");
        }

        let dispatcher = this.getGraphEventsDispatcher(leaf);
        if (dispatcher) return dispatcher;

        dispatcher = new GraphEventsDispatcher(leaf, this.app, this.plugin.settings, this);

        this.dispatchers.set(leaf.id, dispatcher);
        dispatcher.load();
        leaf.view.addChild(dispatcher);


        return dispatcher;
    }

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

    getGraphEventsDispatcher(leaf: WorkspaceLeafExt) : GraphEventsDispatcher | undefined {
        return this.dispatchers.get(leaf.id);
    }

    async handleMetadataCacheChange(file: TFile, data: string, cache: CachedMetadata) {
        this.dispatchers.forEach(dispatcher => {
            if (!(dispatcher.graph && dispatcher.renderer)) return;
    
            const container = dispatcher.graph.nodesSet.getNodeWrapperFromFile(file);
            if (!container) return;
    
            let newTypes: string[] = [];
            cache?.tags?.forEach(tagCache => {
                const type = tagCache.tag.replace('#', '');
                newTypes.push(type);
            });
    
            const needsUpdate = !container.matchesTagsTypes(newTypes);
    
            if (needsUpdate) {
                dispatcher.graph.nodesSet.tagsManager.update(dispatcher.graph.nodesSet.getAllTagTypesFromCache(this.app));
            }
        });
    }

    updatePalette(interactive: string) : void {
        this.dispatchers.forEach(dispatcher => {
            dispatcher.graph.interactiveManagers.get(interactive)?.recomputeColors();
        });
    }
    
    // ENABLE/DISABLE PLUGIN

    onPluginEnabled(leaf: WorkspaceLeafExt) : void {
        this.enablePlugin(leaf);
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

    onPluginDisabled(leaf: WorkspaceLeafExt) : void {
        this.disablePlugin(leaf);
    }

    disablePlugin(leaf: WorkspaceLeafExt) : void {
        let dispatcher = this.dispatchers.get(leaf.id);
        let menuUI = this.setMenu(leaf);
        menuUI.disable();

        if (!dispatcher) return;

        dispatcher.graph.nodesSet.unload();
        dispatcher.graph.linksSet.unload();
        dispatcher.unload();
        this.dispatchers.delete(leaf.id);
        leaf.view.renderer.changed();
    }
}