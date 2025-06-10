import { App } from "obsidian";
import { ExtendedGraphSettings, FoldersSet, GCFolders, getEngine, Graph, GraphEventsDispatcher, GraphsManager, GraphType, InteractiveManager, LegendUI, LinksSet, NodesSet, CSSTextStyle, ProxysManager, StatesManager, StatesUI, CSSFolderStyle, GraphStateData } from "./internal";
import ExtendedGraphPlugin from "./main";
import { GraphEngine, GraphRenderer, GraphView, LocalGraphView } from "obsidian-typings";

export class PluginInstances {
    static plugin: ExtendedGraphPlugin; // init in main.ts
    static app: App; // init in main.ts
    static settings: ExtendedGraphSettings; // init in main.ts
    static graphsManager: GraphsManager; // init in main.ts
    static statesManager: StatesManager; // init in main.ts
    static proxysManager: ProxysManager; // init in main.ts
    static pinSVGDataUrl: string; // init in main.ts
}

export class GraphInstances {
    readonly view: GraphView | LocalGraphView;
    readonly settings: ExtendedGraphSettings;
    readonly type: GraphType;
    readonly engine: GraphEngine;
    readonly renderer: GraphRenderer;

    readonly interactiveManagers = new Map<string, InteractiveManager>();

    dispatcher: GraphEventsDispatcher; // init in graphEventsDispatcher.ts (constructor)
    graph: Graph; // init in graph.ts (constructor)
    stateData?: GraphStateData; // graphsManager.ts (addGraph) and changed in statesUI.ts


    nodesSet: NodesSet; // init in graph.ts (constructor)
    linksSet: LinksSet; // init in graph.ts (constructor)
    foldersSet: FoldersSet | undefined; // init in graph.ts (constructor)

    legendUI: LegendUI | null = null;
    foldersUI: GCFolders | null = null;
    statesUI: StatesUI;

    coreStyleEl?: HTMLStyleElement; // init in graphDistacher.ts
    extendedStyleEl?: HTMLStyleElement; // init in graphDistacher.ts
    stylesData?: {
        nodeText: CSSTextStyle; // init in graphDistacher.ts
        folder: CSSFolderStyle; // init in graphDistacher.ts
    }

    colorGroupHaveChanged: boolean = false;
    statePinnedNodes: Record<string, { x: number; y: number; handled?: boolean }> | null = null;

    constructor(view: GraphView | LocalGraphView) {
        this.view = view;
        this.settings = structuredClone(PluginInstances.settings);
        this.type = this.view.getViewType() === "graph" ? "graph" : "localgraph";
        this.engine = getEngine(this.view);
        this.renderer = this.view.renderer;
    }
}