import { App, CachedMetadata, Component, TFile, WorkspaceLeaf } from "obsidian";
import { GraphEventsDispatcher } from "./graph/graphEventsDispatcher";
import { ExtendedGraphSettings } from "./settings";
import GraphExtendedPlugin from "./main";
import { GraphViewData } from "./views/viewData";


export class GraphsManager extends Component {
    _dispatchers: Map<WorkspaceLeaf, GraphEventsDispatcher>;
    app: App;
    themeObserver: MutationObserver;
    currentTheme: string;
    currentStyleSheetHref: string | null | undefined;
    plugin: GraphExtendedPlugin;


    constructor(plugin: GraphExtendedPlugin, app: App) {
        super();
        this._dispatchers = new Map<WorkspaceLeaf, GraphEventsDispatcher>();
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
        this._dispatchers.forEach(dispatcher => {
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
        this._dispatchers.forEach(dispatcher => {
            dispatcher.viewsUI.updateViewsList(this.plugin.settings.views);
        });
    }

    async onViewNeedsDeletion(id: string) {
        const view = this.plugin.settings.views.find(v => v.id === id);
        if (!view) return;
        this.plugin.settings.views.remove(view);
        await this.plugin.saveSettings();
        new Notice(`Extended Graph: view "${view.name}" has been removed`);
        this._dispatchers.forEach(dispatcher => {
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

    addGraph(leaf: WorkspaceLeaf, settings: ExtendedGraphSettings) : GraphEventsDispatcher {
        let dispatcher = this.getGraphEventsDispatcher(leaf);
        if (dispatcher) return dispatcher;

        dispatcher = new GraphEventsDispatcher(leaf, this.app, settings);

        this._dispatchers.set(leaf, dispatcher);
        dispatcher.addChild(dispatcher.graph);
        dispatcher.addChild(dispatcher.legendUI);
        dispatcher.load();
        leaf.view.addChild(dispatcher);

        return dispatcher;
    }

    getGraphEventsDispatcher(leaf: WorkspaceLeaf) : GraphEventsDispatcher | undefined {
        return this._dispatchers.get(leaf);
    }

    async handleMetadataCacheChange(file: TFile, data: string, cache: CachedMetadata) {
        this._dispatchers.forEach(dispatcher => {
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
        this._dispatchers.forEach(dispatcher => {
            dispatcher.graph.interactiveManagers.get(interactive)?.recomputeColors();
        });
    }
}