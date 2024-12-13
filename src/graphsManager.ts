import { App, CachedMetadata, Component, TFile, WorkspaceLeaf } from "obsidian";
import { GraphEventsDispatcher } from "./graphEventsDispatcher";
import { ExtendedGraphSettings } from "./settings";


export class GraphsManager extends Component {
    _dispatchers: Map<WorkspaceLeaf, GraphEventsDispatcher>;
    app: App;
    themeObserver: MutationObserver;
    currentTheme: string;
    currentStyleSheetHref: string | null | undefined;

    constructor(app: App) {
        super();
        this._dispatchers = new Map<WorkspaceLeaf, GraphEventsDispatcher>();
        this.app = app;
        this.currentTheme = this.getTheme();
        this.currentStyleSheetHref = this.getStyleSheetHref();
    }

    onload(): void {
        this.registerEvent(this.app.metadataCache.on('changed', (file: TFile, data: string, cache: CachedMetadata) => {
            this.handleMetadataCacheChange(file, data, cache);
        }));

        this.listenToThemeChange();
    }

    onunload(): void {
        if (this.themeObserver) {
            this.themeObserver.disconnect();
        }
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
        dispatcher.addChild(dispatcher.legend);
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
    
            const container = dispatcher.graph.getGraphNodeContainerFromFile(file);
            if (!container) return;
    
            let newTypes: string[] = [];
            cache?.tags?.forEach(tagCache => {
                const type = tagCache.tag.replace('#', '');
                newTypes.push(type);
            });
    
            const needsUpdate = !container.matchesTypes(newTypes);
    
            if (needsUpdate) {
                dispatcher.graph.interactiveManagers.get("tag")?.update(dispatcher.graph.getAllTagTypesFromCache());
            }
        });
    }

    updatePalette(interactive: string) : void {
        this._dispatchers.forEach(dispatcher => {
            dispatcher.graph.interactiveManagers.get(interactive)?.recomputeColors();
        });
    }
}