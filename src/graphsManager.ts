import { App, CachedMetadata, Component, TFile, WorkspaceLeaf } from "obsidian";
import { GraphEventsDispatcher } from "./graphEventsDispatcher";
import { ExtendedGraphSettings } from "./settings";


export class GraphsManager extends Component {
    _dispatchers: Map<WorkspaceLeaf, GraphEventsDispatcher>;
    app: App;

    constructor(app: App) {
        super();
        this._dispatchers = new Map<WorkspaceLeaf, GraphEventsDispatcher>();
        this.app = app;
    }

    onload(): void {
        console.log("Loading Graphs Manager");
        
        this.registerEvent(this.app.metadataCache.on('changed', (file: TFile, data: string, cache: CachedMetadata) => {
            this.handleMetadataCacheChange(file, data, cache);
        }));
    }

    onunload(): void {
        console.log("Unload Graphs Manager");
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
                dispatcher.graph.tagsManager.update(dispatcher.graph.getAllTagTypesFromCache());
            }
        });
    }

    updatePalette() : void {
        this._dispatchers.forEach(dispatcher => {
            dispatcher.graph.tagsManager.recomputeColors();
        });
    }
}