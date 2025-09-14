import { App, normalizePath } from "obsidian";
import {
    ExtendedGraphSettings,
    FoldersSet,
    GCFolders,
    getEngine,
    Graph,
    GraphEventsDispatcher,
    GraphsManager,
    GraphType,
    InteractiveManager,
    LegendUI,
    LinksSet,
    NodesSet,
    CSSTextStyle,
    ProxysManager,
    StatesManager,
    StatesUI,
    CSSFolderStyle,
    GraphStateData,
    canonicalizeVarName,
    GraphologyGraph,
    NodeStatCalculator,
    LinkStatCalculator,
    LayersManager,
    LayersUI,
    InteractiveEventsDispatcher,
    CSSBridge,
    getDataviewPlugin,
} from "./internal";
import ExtendedGraphPlugin from "./main";
import { GraphEngine, GraphRenderer, GraphView, LocalGraphView } from "obsidian-typings";
import { GraphFilter } from "./graph/graphFilter";

export class ExtendedGraphInstances {
    static plugin: ExtendedGraphPlugin; // init in main.ts
    static app: App; // init in main.ts
    static settings: ExtendedGraphSettings; // init in main.ts
    static graphsManager: GraphsManager; // init in main.ts
    static statesManager: StatesManager; // init in main.ts
    static proxysManager: ProxysManager; // init in main.ts
    static pinSVGDataUrl: string; // init in main.ts
    static configurationDirectory: string; // init in main.ts
    static graphologyGraph?: GraphologyGraph; // init the first time it is needed
}

export class GraphInstances {
    readonly view: GraphView | LocalGraphView;
    settings: ExtendedGraphSettings;
    readonly type: GraphType;
    readonly engine: GraphEngine;
    readonly renderer: GraphRenderer;

    readonly interactiveManagers = new Map<string, InteractiveManager>();

    graphEventsDispatcher: GraphEventsDispatcher; // init in graphEventsDispatcher.ts (constructor)
    interactiveEventsDispatcher: InteractiveEventsDispatcher; // init in graphEventsDispatcher.ts (constructor)
    cssBridge: CSSBridge; // init in graphEventsDispatcher.ts (constructor)
    filter: GraphFilter; // init in graphEventsDispatcher.ts (constructor)
    graph: Graph; // init in graph.ts (constructor)
    stateData?: GraphStateData; // graphsManager.ts (addGraph) and changed in statesUI.ts
    graphologyGraph?: GraphologyGraph; // init the first time it is needed

    layersManager?: LayersManager; // init in graph.ts (constructor)
    nodesSet: NodesSet; // init in graph.ts (constructor)
    linksSet: LinksSet; // init in graph.ts (constructor)
    foldersSet: FoldersSet | undefined; // init in graph.ts (constructor)

    legendUI: LegendUI | null = null;
    foldersUI: GCFolders | null = null;
    statesUI: StatesUI;
    layersUI?: LayersUI;

    coreStyleEl?: HTMLStyleElement; // init in graphDistacher.ts
    extendedStyleEl?: HTMLStyleElement; // init in graphDistacher.ts
    stylesData?: {
        nodeText: CSSTextStyle; // init in graphDistacher.ts
        folder: CSSFolderStyle; // init in graphDistacher.ts
    }

    nodesSizeCalculator: NodeStatCalculator | undefined;
    nodesColorCalculator: NodeStatCalculator | undefined;
    linksSizeCalculator: LinkStatCalculator | undefined;
    linksColorCalculator: LinkStatCalculator | undefined;

    colorGroupHaveChanged: boolean = false;
    statePinnedNodes: Record<string, { x: number; y: number; handled?: boolean }> | null = null;

    constructor(view: GraphView | LocalGraphView) {
        this.view = view;
        this.settings = structuredClone(ExtendedGraphInstances.settings);
        this.canonicalizeProperties();
        this.type = this.view.getViewType() === "graph" ? "graph" : "localgraph";
        const engine = getEngine(this.view);
        if (!engine) throw new Error("Graph engine is not initialized");
        this.engine = engine;
        this.renderer = this.view.renderer;
    }

    private canonicalizeProperties() {
        if (!this.settings.canonicalizePropertiesWithDataview || !getDataviewPlugin()) return;
        for (const property in this.settings.additionalProperties) {
            const canonicalizedProperty = canonicalizeVarName(property);
            if (canonicalizedProperty === property) continue;

            if (canonicalizedProperty in this.settings.additionalProperties) {
                delete this.settings.additionalProperties[property];
            }
            else {
                this.settings.additionalProperties[canonicalizedProperty] = this.settings.additionalProperties[property];
                delete this.settings.additionalProperties[property];
            }

            if (canonicalizedProperty in this.settings.interactiveSettings) {
                delete this.settings.interactiveSettings[property];
            }
            else {
                this.settings.interactiveSettings[canonicalizedProperty] = this.settings.interactiveSettings[property];
                delete this.settings.interactiveSettings[property];
            }
        }
    }

    setState(stateID: string) {
        this.stateData = ExtendedGraphInstances.statesManager.getStateDataById(stateID);

        // Find if there is a specific settings to load
        if (ExtendedGraphInstances.settings.saveConfigsWithState) {
            let importedSettings = ExtendedGraphInstances.statesManager.getConfig(stateID);
            if (importedSettings) {
                // Set the settings
                this.settings = importedSettings;
            }
        }
    }
}