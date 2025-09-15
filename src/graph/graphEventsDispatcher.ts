import { Component, Notice } from "obsidian";
import { GraphColorAttributes, GraphData, GraphLink } from "obsidian-typings";
import { Container, DisplayObject, Text } from "pixi.js";
import {
    ExtendedGraphSettings,
    FOLDER_KEY,
    GCFolders,
    getFile,
    getFileInteractives,
    getLinkID,
    Graph,
    GraphInstances,
    GraphologyGraph,
    InputsManager,
    LayersUI,
    LegendUI,
    LINK_KEY,
    LinksStatCalculatorFactory,
    linkStatFunctionLabels,
    LinkText,
    NodeStatCalculatorFactory,
    nodeStatFunctionLabels,
    Pinner,
    ExtendedGraphInstances,
    SettingQuery,
    StatesUI,
    t,
    InteractiveEventsDispatcher,
    CSSBridge
} from "../internal";
import { GraphFilter } from "./graphFilter";

interface LastFilteringAction {
    id: 'core-search' | 'core-tags' | 'core-attachments' | 'core-hide-unresolved' | 'core-orphans'
    | 'core-local-jumps' | 'core-local-forelinks' | 'core-local-backlinks'
    | 'plugin-interactives' | 'plugin-state-change' | undefined;

    searchNew: string;
    searchOld: string;
    showTagsNew: boolean;
    showTagsOld: boolean;
    showAttachmentsNew: boolean;
    showAttachmentsOld: boolean;
    hideUnresolvedNew: boolean;
    hideUnresolvedOld: boolean;
    showOrphansNew: boolean;
    showOrphansOld: boolean;

    localJumpsNew: number,
    localJumpsOld: number,
    localForelinksNew: boolean,
    localForelinksOld: boolean,
    localBacklinksNew: boolean;
    localBacklinksOld: boolean;

    interactives: { key: string, types: string[] };
    stateIDNew: string;
    stateIDOld: string;

    record: boolean;
    userChange: boolean;
}

export class GraphEventsDispatcher extends Component {
    instances: GraphInstances;
    inputsManager: InputsManager;
    reloadStateDuringInit: boolean;

    lastFilteringAction: LastFilteringAction | undefined;
    lastCheckboxContainerToggled: HTMLDivElement | undefined;

    isLocalResetting: boolean = false;
    listenStage: boolean = true;
    coreArrowAlpha?: number;
    coreLineHighlightColor?: GraphColorAttributes;
    coreSetData: (data: GraphData) => void;

    // ============================== CONSTRUCTOR ==============================

    /**
     * Constructor for GraphEventsDispatcher.
     * @param leaf - The workspace leaf.
     * @param graphsManager - The graphs manager.
     */
    constructor(instances: GraphInstances, reloadState: boolean) {
        super();
        instances.graphEventsDispatcher = this;
        this.instances = instances;

        this.reloadStateDuringInit = reloadState;

        this.instances.cssBridge = new CSSBridge(instances);
        this.addChild(this.instances.cssBridge);

        this.instances.interactiveEventsDispatcher = new InteractiveEventsDispatcher(instances)
        this.addChild(this.instances.interactiveEventsDispatcher);

        this.instances.filter = new GraphFilter(this.instances);

        this.initializeGraph();
        this.initializeUI();
        this.initializeFoldersUI();
    }

    private initializeGraph(): void {
        new Graph(this.instances);
        this.addChild(this.instances.graph);
    }

    private initializeUI(): void {
        this.initializeLayersUI();
        this.initializeLegendUI();

        this.instances.statesUI = new StatesUI(this.instances);
        this.instances.statesUI.updateStatesList();

        this.addChild(this.instances.statesUI);
    }

    private initializeLegendUI(): void {
        const settings = this.instances.settings;
        if (settings.enableFeatures[this.instances.type]['links'] || settings.enableFeatures[this.instances.type]['tags'] || this.hasAdditionalProperties(settings)) {
            this.instances.legendUI = new LegendUI(this.instances);
            this.addChild(this.instances.legendUI);
        }
    }

    private initializeFoldersUI(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['folders']) return;

        const graphControls = ExtendedGraphInstances.graphsManager.globalUIs.get(this.instances.view.leaf.id)?.control;
        if (!graphControls) return;

        const foldersManager = this.instances.foldersSet?.managers.get(FOLDER_KEY);
        if (!foldersManager) return;
        this.instances.foldersUI = new GCFolders(this.instances, foldersManager);
        this.instances.foldersUI.display();
    }

    private initializeLayersUI(): void {
        if (this.instances.settings.enableFeatures[this.instances.type].layers) {
            this.instances.layersUI = new LayersUI(this.instances);
            this.addChild(this.instances.layersUI);
        }
    }

    private hasAdditionalProperties(settings: ExtendedGraphSettings): boolean {
        return settings.enableFeatures[this.instances.type]['properties'] && Object.values(settings.additionalProperties).some(p => p[this.instances.type]);
    }

    // ================================ LOADING ================================

    /**
     * Called when the component is loaded.
     */
    onload(): void {
        this.loadCurrentStateEngineOptions();
        this.initGraphologyStats();
        this.createSetDataProxy();
    }

    private loadCurrentStateEngineOptions(): void {
        if (!this.reloadStateDuringInit) return;
        const state = ExtendedGraphInstances.settings.states.find(v => v.id === this.instances.statesUI.currentStateID);
        if (state) {
            this.instances.engine.setOptions(state.engineOptions);
            for (const node of this.instances.renderer.nodes) {
                node.fontDirty = true;
            }
        }
    }

    /**
     * Called when the graph is ready.
     */
    onGraphReady(): void {
        try {
            this.updateOpacityLayerColor();

            if (this.isLocalResetting) {
                this.isLocalResetting = false;
                if (this.instances.layersManager?.isEnabled) {
                    this.instances.layersManager.updateLayers();
                    this.instances.engine.render();
                }
                if (this.instances.stateData) {
                    this.instances.statePinnedNodes = structuredClone(this.instances.stateData.pinNodes) ?? {};
                }
            }
            else {
                this.bindStageEvents();
                this.inputsManager = new InputsManager(this.instances);

                this.createRenderCallbackProxy();
                this.createInitGraphicsProxy();
                this.createDestroyGraphicsProxy();
                this.changeArrowAlpha();
                this.removeLineHighlight();
                this.loadLastFilteringAction();
                this.registerEventsForLastFilteringAction();
                if (this.reloadStateDuringInit) {
                    ExtendedGraphInstances.statesManager.changeState(this.instances, this.instances.statesUI.currentStateID);
                }
                if (this.instances.layersManager?.isEnabled) {
                    this.instances.layersManager.updateLayers();
                    this.instances.engine.render();
                }
                else if (this.instances.stateData?.enableLayers) {
                    this.instances.layersManager?.enable();
                }
            }

            ExtendedGraphInstances.graphsManager.onPluginLoaded(this.instances.view);

            // Make sure to render multiple frames to let the elements fade in
            if (this.instances.settings.fadeInElements) {
                this.instances.renderer.changed();
            }
            // Make sure to render one frame in order to render every changes made by the plugin
            else if (this.instances.renderer.idleFrames > 60) {
                this.instances.renderer.idleFrames = 60;
                this.instances.renderer.queueRender();
            }
        }
        catch (error) {
            this.listenStage = false;
            if (typeof error === "string") {
                console.error(error.toUpperCase());
            } else if (error instanceof Error) {
                console.error(error.message);
            }
            ExtendedGraphInstances.graphsManager.disablePluginFromLeafID(this.instances.view.leaf.id);
            return;
        }
    }

    private updateOpacityLayerColor(): void {
        if (this.instances.settings.fadeOnDisable) {
            this.instances.nodesSet.updateOpacityLayerColor();
        }
    }

    private bindStageEvents(): void {
        this.onChildAddedToStage = this.onChildAddedToStage.bind(this);
        this.instances.renderer.hanger.on('childAdded', this.onChildAddedToStage);

        this.onChildRemovedFromStage = this.onChildRemovedFromStage.bind(this);
        this.instances.renderer.hanger.on('childRemoved', this.onChildRemovedFromStage);
    }

    private createRenderCallbackProxy(): void {
        const beforeRenderCallback = this.beforeRenderCallback.bind(this);
        ExtendedGraphInstances.proxysManager.registerProxy<typeof this.instances.renderer.renderCallback>(
            this.instances.renderer,
            "renderCallback",
            {
                apply(target, thisArg, args) {
                    beforeRenderCallback();
                    return Reflect.apply(target, thisArg, args);
                }
            }
        );
    }

    private initGraphologyStats(): void {
        if (!SettingQuery.needDynamicGraphology(this.instances)) return;

        this.instances.graphologyGraph = new GraphologyGraph(this.instances);

        if (SettingQuery.needDynamicGraphology(this.instances, { element: "node", stat: "size" })) {
            this.instances.nodesSizeCalculator = NodeStatCalculatorFactory.getCalculator('size', this.instances);
            this.instances.nodesSizeCalculator?.computeStats(this.instances.settings.graphStatsDirection).catch((error) => {
                console.error(error);
                new Notice(`${t("notices.nodeStatSizeFailed")} (${nodeStatFunctionLabels[this.instances.settings.nodesSizeFunction]}). ${t("notices.functionToDefault")}`);
                this.instances.settings.nodesSizeFunction = 'default';
                this.instances.nodesSizeCalculator = undefined;
            });
        }

        if (SettingQuery.needDynamicGraphology(this.instances, { element: "node", stat: "color" })) {
            this.instances.nodesColorCalculator = NodeStatCalculatorFactory.getCalculator('color', this.instances);
            this.instances.nodesColorCalculator?.computeStats(this.instances.settings.graphStatsDirection).catch((error) => {
                console.error(error);
                new Notice(`${t("notices.nodeStatColorFailed")} (${nodeStatFunctionLabels[this.instances.settings.nodesColorFunction]}). ${t("notices.functionToDefault")}`);
                this.instances.settings.nodesColorFunction = 'default';
                this.instances.nodesColorCalculator = undefined;
            })
        }

        if (SettingQuery.needDynamicGraphology(this.instances, { element: "link", stat: "size" })) {
            this.instances.linksSizeCalculator = LinksStatCalculatorFactory.getCalculator('size', this.instances);
            this.instances.linksSizeCalculator?.computeStats(this.instances.settings.graphStatsDirection).catch((error) => {
                console.error(error);
                new Notice(`${t("notices.linkStatSizeFailed")} (${linkStatFunctionLabels[this.instances.settings.linksSizeFunction]}). ${t("notices.functionToDefault")}`);
                this.instances.settings.linksSizeFunction = 'default';
                this.instances.linksSizeCalculator = undefined;
            });
        }

        if (SettingQuery.needDynamicGraphology(this.instances, { element: "link", stat: "color" })) {
            this.instances.linksColorCalculator = LinksStatCalculatorFactory.getCalculator('color', this.instances);
            this.instances.linksColorCalculator?.computeStats(this.instances.settings.graphStatsDirection).catch((error) => {
                console.error(error);
                new Notice(`${t("notices.linkStatColorFailed")} (${linkStatFunctionLabels[this.instances.settings.linksColorFunction]}). ${t("notices.functionToDefault")}`);
                this.instances.settings.linksColorFunction = 'default';
                this.instances.linksColorCalculator = undefined;
            });
        }
    }

    private createSetDataProxy() {
        const updateData = this.updateData.bind(this);
        const instances = this.instances;

        ExtendedGraphInstances.proxysManager.registerProxy<typeof this.instances.renderer.setData>(
            this.instances.renderer,
            "setData",
            {
                apply(target, thisArg, args) {
                    const data = updateData(args[0] as GraphData);
                    if (data) {
                        args[0] = data;
                        const res = Reflect.apply(target, thisArg, args);

                        // Recompute the graphology
                        instances.graphologyGraph?.buildGraphology();

                        return res;
                    }
                    else {
                        return false;
                    }
                }
            }
        )

    }

    private createDestroyGraphicsProxy() {
        const beforeDestroyGraphics = this.beforeDestroyGraphics.bind(this);
        ExtendedGraphInstances.proxysManager.registerProxy<typeof this.instances.renderer.destroyGraphics>(
            this.instances.renderer,
            "destroyGraphics",
            {
                apply(target, thisArg, argArray) {
                    beforeDestroyGraphics();
                    return Reflect.apply(target, thisArg, argArray);
                },
            }
        );
    }

    private createInitGraphicsProxy() {
        const afterInitGraphics = this.afterInitGraphics.bind(this);
        ExtendedGraphInstances.proxysManager.registerProxy<typeof this.instances.renderer.initGraphics>(
            this.instances.renderer,
            "initGraphics",
            {
                apply(target, thisArg, argArray) {
                    const res = Reflect.apply(target, thisArg, argArray);
                    afterInitGraphics();
                    return res;
                },
            }
        );
    }

    private changeArrowAlpha(): void {
        if (!this.instances.settings.enableFeatures[this.instances.type]['arrows']
            || !this.instances.settings.opaqueArrowsButKeepFading
        ) return;

        this.coreArrowAlpha = this.instances.renderer.colors.arrow.a;
        this.instances.renderer.colors.arrow.a = 1;
    }

    private removeLineHighlight(): void {
        if (!this.instances.settings.noLineHighlight) return;
        this.coreLineHighlightColor = this.instances.renderer.colors.lineHighlight;
        this.instances.renderer.colors.lineHighlight = this.instances.renderer.colors.line;
    }

    private loadLastFilteringAction(): void {
        this.lastFilteringAction = {
            id: undefined,
            searchNew: this.instances.engine.filterOptions.search.getValue() || '',
            searchOld: this.instances.engine.filterOptions.search.getValue() || '',
            showTagsNew: this.instances.engine.options.showTags || false,
            showTagsOld: this.instances.engine.options.showTags || false,
            showAttachmentsNew: this.instances.engine.options.showAttachments || false,
            showAttachmentsOld: this.instances.engine.options.showAttachments || false,
            hideUnresolvedNew: this.instances.engine.options.hideUnresolved || false,
            hideUnresolvedOld: this.instances.engine.options.hideUnresolved || false,
            showOrphansNew: this.instances.engine.options.showOrphans || true,
            showOrphansOld: this.instances.engine.options.showOrphans || true,
            localJumpsNew: this.instances.engine.options.localJumps || 1,
            localJumpsOld: this.instances.engine.options.localJumps || 1,
            localForelinksNew: this.instances.engine.options.localForelinks || true,
            localForelinksOld: this.instances.engine.options.localForelinks || true,
            localBacklinksNew: this.instances.engine.options.localBacklinks || true,
            localBacklinksOld: this.instances.engine.options.localBacklinks || true,
            interactives: { key: '', types: [] },
            stateIDNew: this.instances.statesUI.currentStateID,
            stateIDOld: this.instances.statesUI.currentStateID,

            record: true,
            userChange: false,
        }
    }

    private registerEventsForLastFilteringAction(): void {
        if (!this.lastFilteringAction) return;
        const lastFilteringAction = this.lastFilteringAction;

        // Search
        if (this.instances.engine.filterOptions.search.changeCallback) {
            ExtendedGraphInstances.proxysManager.registerProxy<typeof this.instances.engine.filterOptions.search.changeCallback>(
                this.instances.engine.filterOptions.search,
                'changeCallback',
                {
                    apply(target, thisArg, args) {
                        if (!lastFilteringAction.record) return Reflect.apply(target, thisArg, args);

                        lastFilteringAction.id = 'core-search';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.searchOld = lastFilteringAction.searchNew;
                        lastFilteringAction.searchNew = args[0];
                        return Reflect.apply(target, thisArg, args);
                    }
                }
            );
        }

        // Checkbox filters
        this.updateLastCheckboxToggled = this.updateLastCheckboxToggled.bind(this);
        const checkboxes = this.instances.view.contentEl.querySelectorAll('.graph-control-section.mod-filter .checkbox-container');
        for (const checkboxContainer of Array.from(checkboxes)) {
            checkboxContainer.addEventListener('mousedown', this.updateLastCheckboxToggled);
        }

        ExtendedGraphInstances.proxysManager.registerProxy<typeof this.instances.engine.options>(
            this.instances.engine,
            'options',
            {
                set(target, p, newValue, receiver) {
                    if (!lastFilteringAction.record) return Reflect.set(target, p, newValue, receiver);

                    if (p === 'showTags') {
                        lastFilteringAction.id = 'core-tags';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.showTagsOld = lastFilteringAction.showTagsNew;
                        lastFilteringAction.showTagsNew = newValue;
                    }
                    else if (p === 'showAttachments') {
                        lastFilteringAction.id = 'core-attachments';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.showAttachmentsOld = lastFilteringAction.showAttachmentsNew;
                        lastFilteringAction.showAttachmentsNew = newValue;
                    }
                    else if (p === 'hideUnresolved') {
                        lastFilteringAction.id = 'core-hide-unresolved';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.hideUnresolvedOld = lastFilteringAction.hideUnresolvedNew;
                        lastFilteringAction.hideUnresolvedNew = newValue;
                    }
                    else if (p === 'showOrphans') {
                        lastFilteringAction.id = 'core-orphans';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.showOrphansOld = lastFilteringAction.showOrphansNew;
                        lastFilteringAction.showOrphansNew = newValue;
                    }
                    else if (p === 'localJumps') {
                        lastFilteringAction.id = 'core-local-jumps';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.localJumpsOld = lastFilteringAction.localJumpsNew;
                        lastFilteringAction.localJumpsNew = newValue;
                    }
                    else if (p === 'localForelinks') {
                        lastFilteringAction.id = 'core-local-forelinks';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.localForelinksOld = lastFilteringAction.localForelinksNew;
                        lastFilteringAction.localForelinksNew = newValue;
                    }
                    else if (p === 'localBacklinks') {
                        lastFilteringAction.id = 'core-local-backlinks';
                        lastFilteringAction.userChange = true;
                        lastFilteringAction.localBacklinksOld = lastFilteringAction.localBacklinksNew;
                        lastFilteringAction.localBacklinksNew = newValue;
                    }
                    return Reflect.set(target, p, newValue, receiver);
                },
            }
        )
    }

    private setLastFilteringActionAsStateChange(stateID: string) {
        if (!this.lastFilteringAction || !this.lastFilteringAction.record) return;
        this.lastFilteringAction.id = 'plugin-state-change';
        this.lastFilteringAction.userChange = true;
        this.lastFilteringAction.stateIDOld = this.lastFilteringAction.stateIDNew;
        this.lastFilteringAction.stateIDNew = stateID;
    }

    setLastFilteringActionAsInteractive(key: string, types: string[]) {
        if (!this.lastFilteringAction || !this.lastFilteringAction.record) return;
        if (key !== FOLDER_KEY) {
            this.lastFilteringAction.id = 'plugin-interactives';
            this.lastFilteringAction.userChange = true;
            this.lastFilteringAction.interactives = { key, types };
        }
    }

    private updateLastCheckboxToggled(ev: MouseEvent) {
        this.lastCheckboxContainerToggled = ev.currentTarget as HTMLDivElement;
    }

    // =============================== RESETTING ===============================

    reloadLocalDispatcher(): void {
        if (this.instances.type !== "localgraph") return;

        this.isLocalResetting = true;
        this.instances.graph.unload();
        this.instances.graph.load();
    }

    // =============================== UNLOADING ===============================

    /**
     * Called when the component is unloaded.
     */
    onunload(): void {
        this.unbindStageEvents();
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.instances.renderer.renderCallback);
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.instances.renderer.setData);
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.instances.renderer.destroyGraphics);
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.instances.renderer.initGraphics);
        this.instances.foldersUI?.destroy();
        this.inputsManager.unload();
        ExtendedGraphInstances.graphsManager.onPluginUnloaded(this.instances.view);
        this.restoreArrowAlpha();
        this.restoreLineHighlight();
        this.unregisterEventsForLastFilteringAction();
        this.instances.engine.render();
    }

    private unbindStageEvents(): void {
        this.instances.renderer.hanger.off('childAdded', this.onChildAddedToStage);
        this.instances.renderer.hanger.off('childRemoved', this.onChildRemovedFromStage);
    }

    private restoreArrowAlpha(): void {
        if (this.coreArrowAlpha !== undefined) {
            this.instances.renderer.colors.arrow.a = this.coreArrowAlpha;
            this.coreArrowAlpha = undefined;
        }
    }

    private restoreLineHighlight(): void {
        if (this.coreLineHighlightColor !== undefined) {
            this.instances.renderer.colors.lineHighlight = this.coreLineHighlightColor;
            this.coreLineHighlightColor = undefined;
        }
    }

    private unregisterEventsForLastFilteringAction(): void {
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.instances.engine.filterOptions.search.changeCallback);

        const checkboxes = this.instances.view.contentEl.querySelectorAll('.graph-control-section.mod-filter .checkbox-container');
        for (const checkboxContainer of Array.from(checkboxes)) {
            checkboxContainer.addEventListener('mousedown', this.updateLastCheckboxToggled);
        }

        ExtendedGraphInstances.proxysManager.unregisterProxy(this.instances.engine.options);
    }

    // ============================= STAGE EVENTS ==============================

    /**
     * Called when a child is added to the stage by the engine.
     */
    private onChildAddedToStage(child: DisplayObject, container: Container, index: number): void {
        if (!this.listenStage) return;

        const node = this.instances.renderer.nodes.find(n => n.circle === child);
        if (node) {
            if (ExtendedGraphInstances.graphsManager.isNodeLimitExceededForView(this.instances.view)) {
                this.listenStage = false;
                setTimeout(() => {
                    ExtendedGraphInstances.graphsManager.disablePluginFromLeafID(this.instances.view.leaf.id);
                }, 200);
                return;
            }
            const extendedNode = this.instances.nodesSet.extendedElementsMap.get(node.id);
            if (!extendedNode) {
                this.instances.nodesSet.load(node.id);
            }
            else {
                extendedNode.setCoreElement(node);
                this.instances.layersManager?.addNode(node.id);
            }
            const file = getFile(node.id);
            const folderManager = this.instances.foldersSet?.managers.get(FOLDER_KEY);
            if (file && folderManager) {
                const paths = getFileInteractives(FOLDER_KEY, file);
                for (const path of paths) {
                    if (folderManager.isActive(path)) {
                        this.instances.foldersSet?.loadFolder(FOLDER_KEY, path);
                    }
                }
            }
        }

        const link = this.instances.renderer.links.find(l => l.px === child || l.arrow === child);
        if (link) {
            const add = (l: GraphLink) => {
                const extendedLink = this.instances.linksSet.extendedElementsMap.get(getLinkID(l));
                if (!extendedLink) {
                    this.instances.linksSet.load(getLinkID(l));
                }
                else {
                    extendedLink.setCoreElement(l);
                }
                this.instances.layersManager?.addLinkToContainer(l);
            }
            // We can add the link only if the line AND the arrow (if needed) have been added
            const canAdd = (l: GraphLink) => {
                return l.line && (!this.instances.renderer.fShowArrow || !!l.arrow);
            }
            if (canAdd(link)) {
                add(link);
            }
            else if (link.px === child) {
                // Check if "line" is added to the px
                child.on('childAdded', (child2: DisplayObject, container2: Container<DisplayObject>, index2: number) => {
                    if (child2 instanceof LinkText) return;
                    if (canAdd(link)) {
                        add(link);
                    }
                });
            }
        }

        if ("text" in child) {
            const node = this.instances.renderer.nodes.find(n => n.text === child as Text);
            if (node) {
                const extendedNode = this.instances.nodesSet.extendedElementsMap.get(node.id);
                if (extendedNode) {
                    extendedNode.extendedText.init();
                }
            }
        }
    }

    private onChildRemovedFromStage(child: DisplayObject, container: Container<DisplayObject>, index: number): void {
        if (!this.listenStage) return;

        if (this.instances.foldersSet) {
            for (const [id, folderBlob] of this.instances.foldersSet.foldersMap) {
                const nodesToRemove = folderBlob.nodes.filter(n => n.circle === null);
                for (const node of nodesToRemove) {
                    folderBlob.removeNode(node);
                }
                if (nodesToRemove.length > 0) {
                    folderBlob.updateGraphics(this.instances.renderer.scale);
                }
            }
        }
    }

    private updateData(data: GraphData): GraphData | undefined {
        // Filter out nodes
        data = this.instances.filter.filterData(data);

        // Disable extended links
        for (const extendedLink of this.instances.linksSet.extendedElementsMap.values()) {
            const needToDisable = !(extendedLink.coreElement.source.id in data.nodes)
                || !(extendedLink.coreElement.target.id in data.nodes)
                || !(extendedLink.coreElement.target.id in data.nodes[extendedLink.coreElement.source.id].links);
            if (extendedLink.isEnabled && needToDisable) {
                extendedLink.disable();
            }
            else if (!extendedLink.isEnabled && !needToDisable) {
                extendedLink.enable();
            }
        }


        const showNotice = this.lastFilteringAction?.userChange || true;
        if (this.lastFilteringAction) this.lastFilteringAction.userChange = false;
        if (ExtendedGraphInstances.graphsManager.isNodeLimitExceededForData(data, showNotice)) {
            if (ExtendedGraphInstances.settings.revertAction && this.lastFilteringAction) {
                this.revertLastFilteringAction();
                return undefined;
            }
            else {
                this.listenStage = false;
                setTimeout(() => {
                    ExtendedGraphInstances.graphsManager.disablePluginFromLeafID(this.instances.view.leaf.id);
                }, 200);
                return undefined;
            }
        }

        return data;
    }

    // ============================== GRAPH CYCLE ==============================

    private beforeDestroyGraphics() {
        this.instances.cssBridge.unload();
        this.unbindStageEvents();
        this.inputsManager.unbindStageEvents();
        ExtendedGraphInstances.proxysManager.unregisterProxy(this.instances.renderer.renderCallback);
        this.instances.layersManager?.destroyContainers();
        for (const el of this.instances.nodesSet.extendedElementsMap.values()) {
            ExtendedGraphInstances.proxysManager.unregisterProxy(el.coreElement.text);
        }
        for (const el of this.instances.linksSet.extendedElementsMap.values()) {
            el.restoreCoreElement();
        }

        //this.showDestroyed(this.instances.renderer.hanger);
    }

    private showDestroyed(el: any, trace: string[] = [], depth: number = 1) {
        if (!("children" in el)) return;
        for (const child of el.children) {
            if (child.destroyed) {
                console.debug(depth);
                console.debug(trace);
                console.debug(child);
            }
            else {
                const trace2 = [...trace]
                trace2.push(Object.getPrototypeOf(child).constructor.name);
                this.showDestroyed(child, trace2, depth + 1);
            }
        }
    }

    private afterInitGraphics() {
        setTimeout(() => {
            this.instances.cssBridge.load();
            for (const el of this.instances.linksSet.extendedElementsMap.values()) {
                el.init();
            }
            for (const el of this.instances.nodesSet.extendedElementsMap.values()) {
                el.init();
            }
            this.instances.nodesSet.onCSSChange();
            this.instances.foldersSet?.initGraphics();
            this.createRenderCallbackProxy();
            this.instances.layersManager?.rebuildContainers();
            if (this.instances.settings.enableFeatures[this.instances.type].focus) {
                if (this.instances.settings.highlightOpenNodes) {
                    for (const id of ExtendedGraphInstances.graphsManager.openNodes) {
                        this.instances.nodesSet.extendedElementsMap.get(id)?.toggleOpenInTab(true);
                    }
                }
                if (this.instances.settings.highlightSearchResults) {
                    for (const id of ExtendedGraphInstances.graphsManager.getSearchResults()) {
                        this.instances.nodesSet.extendedElementsMap.get(id)?.toggleIsSearchResult(true);
                    }
                }
            }
            this.bindStageEvents();
            this.inputsManager.bindStageEvents();
            this.instances.renderer.changed();
        }, this.instances.settings.delay);
    }

    private beforeRenderCallback() {
        // If nodes need to be pinned because we just changed the state and new nodes were added
        if (this.instances.statePinnedNodes) {
            const pinner = new Pinner(this.instances);
            pinner.setPinnedNodesFromState();
        }

        // Update the graphics of folders in order to redraw the box when nodes move
        if (this.instances.foldersSet) this.instances.foldersSet.updateGraphics();

        // Update the graphics of the links
        if (this.instances.settings.enableFeatures[this.instances.type]['links']) {
            if (this.instances.settings.interactiveSettings[LINK_KEY].showOnGraph || this.instances.settings.curvedLinks) {
                for (const id of this.instances.linksSet.connectedIDs) {
                    this.instances.linksSet.extendedElementsMap.get(id)?.graphicsWrapper?.pixiElement.updateFrame();
                }
            }
            if (this.instances.settings.displayLinkTypeLabel) {
                if (this.instances.settings.allowMultipleLinkTypes) {
                    for (const id of this.instances.linksSet.connectedIDs) {
                        this.instances.linksSet.extendedElementsMap.get(id)?.hideTextsBasedOnLength();
                    }
                }
                else {
                    for (const id of this.instances.linksSet.connectedIDs) {
                        this.instances.linksSet.extendedElementsMap.get(id)?.texts?.forEach(text => { if (text.isRendered) text.updateFrame(); });
                    }
                }
            }
        }
    }

    // ========================== REVERT LAST ACTION ===========================

    private revertLastFilteringAction(): void {
        // Disable the plugin if no last action was recorder (the plugin was just enabled)
        if (!this.lastFilteringAction || this.lastFilteringAction.id === undefined) {
            this.listenStage = false;
            ExtendedGraphInstances.graphsManager.disablePluginFromLeafID(this.instances.view.leaf.id);
            return;
        }

        switch (this.lastFilteringAction.id) {
            case 'core-search':
                this.instances.engine.filterOptions.search.inputEl.blur();
                this.lastFilteringAction.searchNew = this.lastFilteringAction.searchOld;
                this.instances.engine.filterOptions.search.inputEl.value = this.lastFilteringAction.searchOld;
                this.instances.engine.updateSearch();
                break;
            case 'core-tags':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.showTagsNew = this.lastFilteringAction.showTagsOld;
                break;
            case 'core-attachments':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.showAttachmentsNew = this.lastFilteringAction.showAttachmentsOld;
                break;
            case 'core-hide-unresolved':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.hideUnresolvedNew = this.lastFilteringAction.hideUnresolvedOld;
                break;
            case 'core-orphans':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.showOrphansNew = this.lastFilteringAction.showOrphansOld;
                break;
            case 'core-local-jumps':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.localJumpsNew = this.lastFilteringAction.localJumpsOld;
                break;
            case 'core-local-forelinks':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.localForelinksNew = this.lastFilteringAction.localForelinksOld;
                break;
            case 'core-local-backlinks':
                this.lastCheckboxContainerToggled?.dispatchEvent(new Event('click'));
                this.lastFilteringAction.localBacklinksNew = this.lastFilteringAction.localBacklinksOld;
                break;
            case 'plugin-interactives':
                const manager = this.instances.interactiveManagers.get(this.lastFilteringAction.interactives.key);
                if (manager) {
                    manager.disable(this.lastFilteringAction.interactives.types);
                    for (const type of this.lastFilteringAction.interactives.types) {
                        this.instances.legendUI?.disableUI(this.lastFilteringAction.interactives.key, type);
                    }
                }
                break;
            case 'plugin-state-change':
                if (this.lastFilteringAction.stateIDNew !== this.lastFilteringAction.stateIDOld) {
                    this.lastFilteringAction.stateIDNew = this.lastFilteringAction.stateIDOld;
                    this.instances.statesUI.setValue(this.lastFilteringAction.stateIDOld);
                    ExtendedGraphInstances.statesManager.changeState(this.instances, this.lastFilteringAction.stateIDOld);
                }
                break;
        }
    }

    // ================================ STATES =================================

    changeState(stateID: string) {
        this.setLastFilteringActionAsStateChange(stateID);
        ExtendedGraphInstances.statesManager.changeState(this.instances, stateID);
    }
}