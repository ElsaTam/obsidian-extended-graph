import {
    CachedMetadata,
    Component,
    FileView,
    MarkdownView,
    Menu,
    Notice,
    setIcon,
    TAbstractFile,
    TFile,
    TFolder,
    View,
    WorkspaceLeaf
} from "obsidian";
import {
    GraphData,
    GraphPluginInstance,
    GraphPluginInstanceOptions,
    GraphView,
    LocalGraphView
} from "obsidian-typings";
import {
    ExportCoreGraphToSVG,
    ExportExtendedGraphToSVG,
    ExportGraphToSVG,
    getEngine,
    GraphControlsUI,
    GraphEventsDispatcher,
    MenuUI,
    NodeStatCalculator,
    NodeStatCalculatorFactory,
    LinkStatCalculator,
    linkStatFunctionNeedsNLP,
    ExtendedGraphInstances,
    GraphInstances,
    WorkspaceExt,
    getFileInteractives,
    ExtendedGraphFileNode,
    getOutlinkTypes,
    LINK_KEY,
    getLinkID,
    FOLDER_KEY,
    getGraphView,
    Pinner,
    isGraphBannerView,
    getGraphBannerPlugin,
    getGraphBannerClass,
    nodeStatFunctionLabels,
    linkStatFunctionLabels,
    GraphType,
    GraphStateModal,
    LinksStatCalculatorFactory,
    LinkStat,
    SettingQuery,
    t,
    getNLPPlugin,
    GraphologyGraph,
    nodeStatFunctionIsDynamic,
    linkStatFunctionIsDynamic,
    getDataviewPlugin,
    getLinks
} from "./internal";



export class GraphsManager extends Component {
    globalUIs: Map<string, { menu: MenuUI, control: GraphControlsUI }> = new Map();
    optionsBackup: Map<string, GraphPluginInstanceOptions> = new Map();
    allInstances: Map<string, GraphInstances> = new Map();

    // Focus
    openNodes: string[] = [];
    observedSearched: Map<View, { childrenEl: HTMLDivElement, results: string[] }> = new Map();
    searchObserver: MutationObserver;

    lastBackup: string;
    localGraphID: string | null = null;

    isHandlingMarkdownViewChange: boolean = false;
    isResetting: Map<string, boolean> = new Map();

    statusBarItem: HTMLElement;

    nodesSizeCalculator: NodeStatCalculator | undefined;
    nodesColorCalculator: NodeStatCalculator | undefined;
    linksSizeCalculator: LinkStatCalculator | undefined;
    linksColorCalculator: LinkStatCalculator | undefined;

    // ================================ LOADING ================================

    onload(): void {
        this.addStatusBarItem();
        this.createSearchObserver();
        this.registerEvents();
    }

    private addStatusBarItem(): void {
        this.statusBarItem = ExtendedGraphInstances.plugin.addStatusBarItem();
        this.statusBarItem.addClasses(['plugin-extended-graph']);
    }

    private createSearchObserver(): void {
        this.searchObserver = new MutationObserver((mutationsList, obs) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    const entry = this.observedSearched.entries().find((entry) => {
                        return entry[1].childrenEl === mutation.target;
                    });
                    if (entry) {
                        this.computeSearchNodes(entry[0]);
                    }
                }
            }
        });
    }

    private registerEvents() {
        this.onMetadataCacheChange = this.onMetadataCacheChange.bind(this);
        if (getDataviewPlugin(false)) {
            // @ts-ignore
            this.registerEvent(ExtendedGraphInstances.app.metadataCache.on('dataview:metadata-change',
                (type: string, file: TFile, oldPath?: string) => {
                    if (!this.isCoreGraphLoaded()) return;
                    if (type === "update") {
                        this.onMetadataCacheChange(file);
                    }
                }
            ));
        }
        else {
            this.registerEvent(ExtendedGraphInstances.app.metadataCache.on('changed', (file, data, cache) => {
                if (!this.isCoreGraphLoaded()) return;
                this.onMetadataCacheChange(file, data, cache);
            }));
        }

        this.onDelete = this.onDelete.bind(this);
        this.registerEvent(ExtendedGraphInstances.app.vault.on('delete', (file) => {
            if (!this.isCoreGraphLoaded()) return;
            this.onDelete(file);
        }));

        this.onRename = this.onRename.bind(this);
        this.registerEvent(ExtendedGraphInstances.app.vault.on('rename', (file, oldPath) => {
            if (!this.isCoreGraphLoaded()) return;
            this.onRename(file, oldPath);
        }));

        this.onCSSChange = this.onCSSChange.bind(this);
        this.registerEvent(ExtendedGraphInstances.app.workspace.on('css-change', () => {
            if (!this.isCoreGraphLoaded()) return;
            this.onCSSChange();
        }));

        this.registerEvent(ExtendedGraphInstances.app.workspace.on('layout-change', () => {
            if (!this.isCoreGraphLoaded()) return;
            ExtendedGraphInstances.plugin.onLayoutChange();
        }));

        this.onActiveLeafChange = this.onActiveLeafChange.bind(this);
        this.registerEvent(ExtendedGraphInstances.app.workspace.on('active-leaf-change', (leaf) => {
            if (!this.isCoreGraphLoaded()) return;
            this.onActiveLeafChange(leaf);
        }));

        this.onFileOpen = this.onFileOpen.bind(this);
        this.registerEvent(ExtendedGraphInstances.app.workspace.on('file-open', (file) => {
            if (!this.isCoreGraphLoaded()) return;
            this.onFileOpen(file);
        }));

        this.updatePaletteForInteractive = this.updatePaletteForInteractive.bind(this);
        this.registerEvent((ExtendedGraphInstances.app.workspace as WorkspaceExt).on('extended-graph:settings-colorpalette-changed', (key: string) => {
            if (!this.isCoreGraphLoaded()) return;
            this.updatePaletteForInteractive(key);
        }));

        this.updateColorForInteractiveType = this.updateColorForInteractiveType.bind(this);
        this.registerEvent((ExtendedGraphInstances.app.workspace as WorkspaceExt).on('extended-graph:settings-interactive-color-changed', (key: string, type: string) => {
            if (!this.isCoreGraphLoaded()) return;
            this.updateColorForInteractiveType(key, type);
        }));

        this.onNodeMenuOpened = this.onNodeMenuOpened.bind(this);
        this.registerEvent(ExtendedGraphInstances.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) => {
            if (!this.isCoreGraphLoaded()) return;
            this.onNodeMenuOpened(menu, file, source, leaf);
        }));
    }

    private isCoreGraphLoaded(): boolean {
        return !!ExtendedGraphInstances.app.internalPlugins.getPluginById("graph")?._loaded;
    }

    initializeNodesSizeCalculator(): void {
        this.nodesSizeCalculator = NodeStatCalculatorFactory.getCalculator('size');
        this.nodesSizeCalculator?.computeStats(ExtendedGraphInstances.settings.graphStatsDirection).catch((error) => {
            console.error(error);
            new Notice(`${t("notices.nodeStatSizeFailed")} (${nodeStatFunctionLabels[ExtendedGraphInstances.settings.nodesSizeFunction]}). ${t("notices.functionToDefault")}`);
            ExtendedGraphInstances.settings.nodesSizeFunction = 'default';
            ExtendedGraphInstances.plugin.saveSettings();
            this.nodesSizeCalculator = undefined;
        });
    }

    initializeNodesColorCalculator(): void {
        this.nodesColorCalculator = NodeStatCalculatorFactory.getCalculator('color');
        this.nodesColorCalculator?.computeStats(ExtendedGraphInstances.settings.graphStatsDirection).catch((error) => {
            console.error(error);
            new Notice(`${t("notices.nodeStatColorFailed")} (${nodeStatFunctionLabels[ExtendedGraphInstances.settings.nodesColorFunction]}). ${t("notices.functionToDefault")}`);
            ExtendedGraphInstances.settings.nodesColorFunction = 'default';
            ExtendedGraphInstances.plugin.saveSettings();
            this.nodesColorCalculator = undefined;
        });
    }

    initializeLinksSizeCalculator(): void {
        if (this.canUseLinkStatFunction('size')) {
            this.linksSizeCalculator = LinksStatCalculatorFactory.getCalculator('size');
            this.linksSizeCalculator?.computeStats(ExtendedGraphInstances.settings.graphStatsDirection).catch((error) => {
                console.error(error);
                ExtendedGraphInstances.settings.linksSizeFunction = 'default';
                ExtendedGraphInstances.plugin.saveSettings();
                new Notice(`${t("notices.linkStatSizeFailed")} (${linkStatFunctionLabels[ExtendedGraphInstances.settings.linksSizeFunction]}). ${t("notices.functionToDefault")}`);
                this.linksSizeCalculator = undefined;
            });
        }
    }

    initializeLinksColorCalculator(): void {
        if (this.canUseLinkStatFunction('color')) {
            this.linksColorCalculator = LinksStatCalculatorFactory.getCalculator('color');
            this.linksColorCalculator?.computeStats(ExtendedGraphInstances.settings.graphStatsDirection).catch((error) => {
                console.error(error);
                ExtendedGraphInstances.settings.linksColorFunction = 'default';
                ExtendedGraphInstances.plugin.saveSettings();
                new Notice(`${t("notices.linkStatColorFailed")} (${linkStatFunctionLabels[ExtendedGraphInstances.settings.linksColorFunction]}). ${t("notices.functionToDefault")}`);
                this.linksColorCalculator = undefined;
            });
        }
    }

    private canUseLinkStatFunction(stat: LinkStat): boolean {
        const fn = stat === 'color' ? ExtendedGraphInstances.settings.linksColorFunction : ExtendedGraphInstances.settings.linksSizeFunction;

        if (!getNLPPlugin() && linkStatFunctionNeedsNLP[fn]) {
            new Notice(`${t("notices.nlpPluginRequired")} (${fn})`);
            if (stat === 'color') {
                this.linksColorCalculator = undefined;
                ExtendedGraphInstances.settings.linksColorFunction = 'default';
            }
            else {
                this.linksSizeCalculator = undefined;
                ExtendedGraphInstances.settings.linksSizeFunction = 'default';
            }
            ExtendedGraphInstances.plugin.saveSettings();
            return false;
        }
        return true;
    }

    // =============================== UNLOADING ===============================

    // ============================= THEME CHANGE ==============================

    private onCSSChange() {
        for (const instances of this.allInstances.values()) {
            instances.cssBridge.onCSSChange();
        }
    }

    // ============================ METADATA CHANGES ===========================

    /**
     * Called when a file has been indexed, and its (updated) cache is now available.
     * @param file - The updated TFile
     * @param data - The new content of the markdown file
     * @param cache - The new cached metadata
     */
    private onMetadataCacheChange(file: TFile, data?: string, cache?: CachedMetadata) {
        for (const instances of this.allInstances.values()) {
            if (!instances.graph || !instances.renderer) return;

            // Update nodes interactives
            const extendedNode = instances.nodesSet.extendedElementsMap.get(file.path) as ExtendedGraphFileNode;
            if (!extendedNode) return;
            for (const [key, manager] of instances.nodesSet.managers) {
                let newTypes = [...getFileInteractives(key, file, instances.settings)];
                newTypes = newTypes.filter(type => !SettingQuery.excludeType(ExtendedGraphInstances.settings, key, type));
                if (newTypes.length === 0) {
                    newTypes.push(instances.settings.interactiveSettings[key].noneType);
                }
                const { typesToRemove: typesToRemoveForTheNode, typesToAdd: typesToAddForTheNode } = extendedNode.matchesTypes(key, [...newTypes]);
                for (const type of typesToRemoveForTheNode) {
                    instances.nodesSet.typesMap[key][type].delete(extendedNode.id);
                }
                for (const type of typesToAddForTheNode) {
                    if (!instances.nodesSet.typesMap[key][type]) instances.nodesSet.typesMap[key][type] = new Set<string>();
                    instances.nodesSet.typesMap[key][type].add(extendedNode.id);
                }
                extendedNode.setTypes(key, new Set<string>(newTypes));

                const typesToRemove = typesToRemoveForTheNode.filter(type => instances.nodesSet.typesMap[key][type].size === 0);
                if (typesToRemove.length > 0) {
                    manager.removeTypes(typesToRemove);
                }
                const managersTypes = manager.getTypes();
                const typesToAdd = typesToAddForTheNode.filter(type => {
                    return !managersTypes.includes(type);
                })
                if (typesToAdd.length > 0) {
                    manager.addTypes(typesToAdd);
                }

                if (typesToRemove.length === 0 && typesToAdd.length === 0 && (typesToRemoveForTheNode.length > 0 || typesToAddForTheNode.length > 0)) {
                    extendedNode.graphicsWrapper.resetManagerGraphics(manager);
                }
            }

            // Handle links
            const linkManager = instances.linksSet.managers.get(LINK_KEY);
            if (linkManager) {
                // Remove extendedLinks that are no longer valids
                const newOutLinks = getLinks(file);
                const extendedOutlinks = Array.from(instances.linksSet.extendedElementsMap.values()).filter(
                    link => link.coreElement.source.id === file.path
                );
                for (const extendedOutlink of extendedOutlinks) {
                    if (!newOutLinks.contains(extendedOutlink.coreElement.target.id)) {
                        instances.linksSet.delete(extendedOutlink);
                    }
                }

                // Get the new map target-to-types
                const newOutlinkTypes = getOutlinkTypes(instances.settings, file);
                for (const target of newOutLinks) {
                    if (!newOutlinkTypes.has(target)) {
                        newOutlinkTypes.set(target, new Set());
                    }
                }

                // Update the types
                for (let [targetID, newTypes] of newOutlinkTypes) {
                    const extendedLink = instances.linksSet.extendedElementsMap.get(getLinkID({ source: { id: file.path }, target: { id: targetID } }));
                    if (!extendedLink) continue;

                    // Make sure we have unique types and only types that are not excluded
                    newTypes = new Set<string>([...newTypes].filter(type => !SettingQuery.excludeType(ExtendedGraphInstances.settings, LINK_KEY, type)));
                    if (newTypes.size === 0) {
                        newTypes.add(instances.settings.interactiveSettings[LINK_KEY].noneType);
                    }

                    // Get the types that no longer matches the links and the one that still do
                    const { typesToRemove: typesToRemoveForTheLink, typesToAdd: typesToAddForTheLink } = extendedLink.matchesTypes(LINK_KEY, [...newTypes]);

                    // Update the typesMap of the linkSet
                    for (const type of typesToRemoveForTheLink) {
                        instances.linksSet.typesMap[LINK_KEY][type].delete(extendedLink.id);
                    }
                    for (const type of typesToAddForTheLink) {
                        if (!instances.linksSet.typesMap[LINK_KEY][type]) instances.linksSet.typesMap[LINK_KEY][type] = new Set<string>();
                        instances.linksSet.typesMap[LINK_KEY][type].add(extendedLink.id);
                    }

                    // Update the types of the link
                    extendedLink.setTypes(LINK_KEY, new Set<string>(newTypes));

                    // Find the types to remove from the linksSet
                    const typesToRemove = typesToRemoveForTheLink.filter(type => {
                        return instances.linksSet.typesMap[LINK_KEY][type].size === 0
                    });
                    if (typesToRemove.length > 0) {
                        linkManager.removeTypes(typesToRemove);
                    }

                    // Add the new types to the manager
                    const managersTypes = linkManager.getTypes();
                    const typesToAdd = typesToAddForTheLink.filter(type => {
                        return !managersTypes.includes(type);
                    });
                    if (typesToAdd.length > 0) {
                        linkManager.addTypes(typesToAdd);
                    }

                    // Update the graphics elements
                    if (typesToRemove.length === 0 && typesToAdd.length === 0 && (typesToRemoveForTheLink.length > 0 || typesToAddForTheLink.length > 0)) {
                        extendedLink.graphicsWrapper?.resetManagerGraphics(linkManager);
                    }
                }
            }

            // Check if we need to re-render because an external link was added
            if (instances.settings.externalLinks !== "none") {
                const flattenURLs = (urls: { domain?: string; href?: string; }[]) => {
                    return urls.flatMap(url => [url.domain, url.href]).filter(url => url !== undefined).unique();
                }
                const previousURLs = flattenURLs(instances.nodesSet.getExternalLinks(file.path));
                instances.nodesSet.cacheExternalLinks(file.path, true).then((hasLinks) => {
                    const newURLs = flattenURLs(instances.nodesSet.getExternalLinks(file.path));
                    const symDifference = previousURLs.filter(url => !newURLs.includes(url))
                        .concat(newURLs.filter(url => !previousURLs.includes(url)));
                    if (symDifference.length > 0) {
                        instances.engine.render();
                    }
                });
            }
        }
    }

    private onDelete(file: TAbstractFile) {
        const id = file.path;
        if (file instanceof TFile) {
            for (const [leafID, instances] of this.allInstances) {
                const nodesSet = instances.nodesSet;
                const extendedNode = nodesSet.extendedElementsMap.get(id);
                if (!extendedNode) continue;

                for (const [key, manager] of nodesSet.managers) {
                    const types = extendedNode.getTypes(key);
                    const typesToRemove: string[] = [];
                    for (const type of types) {
                        nodesSet.typesMap[key][type].delete(id);
                        if (nodesSet.typesMap[key][type]?.size === 0) {
                            typesToRemove.push(type);
                        }
                    }
                    manager.removeTypes(typesToRemove);
                }

                nodesSet.extendedElementsMap.delete(id);
                nodesSet.connectedIDs.delete(id);
                extendedNode?.graphicsWrapper?.disconnect();
                extendedNode?.graphicsWrapper?.destroyGraphics();

                const linksSet = instances.linksSet;
                const extendedLinks = [...linksSet.extendedElementsMap.values()].filter(el => el.coreElement.source.id === id);
                for (const extendedLink of extendedLinks) {
                    const linkID = extendedLink.id;

                    const types = extendedLink.getTypes(LINK_KEY);
                    const typesToRemove: string[] = [];
                    for (const type of types) {
                        linksSet.typesMap[LINK_KEY][type].delete(linkID);
                        if (linksSet.typesMap[LINK_KEY][type]?.size === 0) {
                            typesToRemove.push(type);
                        }
                    }
                    linksSet.managers.get(LINK_KEY)?.removeTypes(typesToRemove);

                    linksSet.extendedElementsMap.delete(linkID);
                    linksSet.connectedIDs.delete(linkID);
                    extendedLink?.graphicsWrapper?.disconnect();
                    extendedLink?.graphicsWrapper?.destroyGraphics();

                }
            }
        }
        else if (file instanceof TFolder) {
            for (const [leafID, instances] of this.allInstances) {
                const foldersSet = instances.foldersSet;
                foldersSet?.managers.get(FOLDER_KEY)?.removeTypes([id]);
            }
        }
    }

    private onRename(file: TAbstractFile, oldPath: string) {
        const newPath = file.path;
        let predicate: (oldPath: string, currentPath: string) => boolean = function (oldPath: string, currentPath: string): boolean {
            return oldPath === currentPath;
        };

        for (const [leafID, instances] of this.allInstances) {
            // Type maps
            for (const [key, manager] of instances.nodesSet.managers) {
                instances.nodesSet.typesMap[key] = Object.fromEntries(
                    Object.entries(instances.nodesSet.typesMap[key]).map(([type, nodeIDs]) => {
                        return [type, new Set([...nodeIDs].filter(nodeID => !predicate(oldPath, nodeID)))];
                    })
                );
            }
            for (const [key, manager] of instances.linksSet.managers) {
                instances.linksSet.typesMap[key] = Object.fromEntries(
                    Object.entries(instances.linksSet.typesMap[key]).map(([type, linkIDs]) => {
                        return [type, new Set([...linkIDs].filter(linkID => {
                            const extendedLink = instances.linksSet.extendedElementsMap.get(linkID);
                            return extendedLink
                                && !predicate(oldPath, extendedLink.coreElement.source.id)
                                && !predicate(oldPath, extendedLink.coreElement.target.id);
                        }))];
                    })
                );
            }

            // Extended nodes and connected ids
            for (const extendedNode of [...instances.nodesSet.extendedElementsMap.values()]) {
                if (oldPath === extendedNode.id) {
                    instances.nodesSet.extendedElementsMap.delete(extendedNode.id);
                    extendedNode.id = newPath;
                    instances.nodesSet.extendedElementsMap.set(extendedNode.id, extendedNode);
                    if (instances.nodesSet.connectedIDs.has(oldPath)) {
                        instances.nodesSet.connectedIDs.delete(oldPath);
                        instances.nodesSet.connectedIDs.add(newPath);
                    }
                }
            }

            // Extended links and connected ids
            for (const extendedLink of [...instances.linksSet.extendedElementsMap.values()]) {
                const sourceChanged = oldPath === extendedLink.coreElement.source.id;
                const targetChanged = oldPath === extendedLink.coreElement.target.id;
                if (sourceChanged || targetChanged) {
                    const oldID = extendedLink.id;
                    instances.linksSet.extendedElementsMap.delete(extendedLink.id); // Delete from the map
                    if (sourceChanged) {
                        extendedLink.id = getLinkID({ source: { id: newPath }, target: { id: extendedLink.coreElement.target.id } }); // Change the id
                    }
                    if (targetChanged) {
                        extendedLink.id = getLinkID({ source: { id: extendedLink.coreElement.source.id }, target: { id: newPath } });
                    }
                    instances.linksSet.extendedElementsMap.set(extendedLink.id, extendedLink); // Add to the map
                    if (instances.linksSet.connectedIDs.has(oldID)) {
                        instances.linksSet.connectedIDs.delete(oldID);
                        instances.linksSet.connectedIDs.add(extendedLink.id);
                    }
                }
            }

            // Pinned nodes
            const pinner = new Pinner(instances);
            for (const [nodeID, extendedNode] of instances.nodesSet.extendedElementsMap) {
                if (extendedNode.isPinned && nodeID === newPath) {
                    pinner.pinNode(newPath, extendedNode.coreElement.x, extendedNode.coreElement.y);
                }
            }
            for (const state of ExtendedGraphInstances.settings.states) {
                if (!state.pinNodes) break;
                const pinNodes = structuredClone(Object.entries(state.pinNodes));
                for (const [currentPath, pos] of pinNodes) {
                    if (oldPath === currentPath) {
                        delete state.pinNodes[currentPath];
                        state.pinNodes[newPath] = pos;
                    }
                }
                ExtendedGraphInstances.statesManager.onStateNeedsSaving(state, false);
            }
        }
    }

    // ================================ LAYOUT =================================

    initLeaf(leaf: WorkspaceLeaf): void {
        const view = getGraphView(leaf);
        if (!view || view.leaf.isDeferred) return;

        try {
            this.setGlobalUI(view);
        }
        catch (e) {
            // UI not set, probably because the graph is in a closed sidebar
            console.warn("WARNING: could not set global UI.");
            console.warn(e);
        }
        if (this.isPluginAlreadyEnabled(view)) return;

        if (!this.isGlobalGraphAlreadyOpened(view)) {
            this.backupOptions(view);
        }

        if (ExtendedGraphInstances.settings.enableFeatures[view.getViewType()]['auto-enabled']) {
            this.enablePlugin(view, ExtendedGraphInstances.settings.startingStateID);
        }
    }

    isPluginAlreadyEnabled(view: GraphView | LocalGraphView): boolean {
        return this.allInstances.has(view.leaf.id);
    }

    private isGlobalGraphAlreadyOpened(view: GraphView | LocalGraphView): boolean {
        return this.optionsBackup.has(view.leaf.id) && view.getViewType() === "graph";
    }

    syncWithLeaves(leaves: WorkspaceLeaf[]): void {
        const currentActiveLeavesID = leaves.map(l => l.id);
        const localLeaf = leaves.find(l =>
            l.view.getViewType() === "localgraph"
            && (l.view instanceof View)
            && !l.isDeferred
            && !isGraphBannerView(l.view as LocalGraphView));

        this.localGraphID = localLeaf ? localLeaf.id : null;

        // Remove dispatchers from closed leaves
        const allInstancesIDs = [...this.allInstances.keys()];
        for (const leafID of allInstancesIDs) {
            if (!currentActiveLeavesID.includes(leafID)) {
                this.disablePluginFromLeafID(leafID);
            }
        }

        // Remove options backups, but keep one
        const optionsBackupIDs = [...this.optionsBackup.keys()];
        for (const leafID of optionsBackupIDs) {
            if (!currentActiveLeavesID.includes(leafID) && this.lastBackup !== leafID) {
                this.optionsBackup.delete(leafID);
            }
        }

        // Remove UI from closed leaves
        const globalUIsIDs = [...this.globalUIs.keys()];
        for (const leafID of globalUIsIDs) {
            if (!currentActiveLeavesID.includes(leafID)) {
                this.globalUIs.delete(leafID);
            }
        }

        // Focus
        this.computeOpenNodes();
        this.observeSearchViews();
    }

    // ================================= FOCUS =================================

    private computeOpenNodes(): void {
        // Find out which nodes are opened
        const newOpenNodes: string[] = [];
        ExtendedGraphInstances.app.workspace.iterateAllLeaves((leaf) => {
            if (("state" in leaf.view) && (typeof leaf.view.state === "object") && (leaf.view.state) && ("file" in leaf.view.state) && (typeof leaf.view.state.file === "string")) {
                newOpenNodes.push(leaf.view.state.file);
            }
            else if ("file" in leaf.view && leaf.view.file instanceof TFile) {
                newOpenNodes.push(leaf.view.file.path);
            }
        });

        // Update the nodes accordingly
        const nodesRemoved = this.openNodes.filter(id => !newOpenNodes.contains(id));
        const nodesAdded = newOpenNodes.filter(id => !this.openNodes.contains(id));
        if (nodesRemoved.length > 0 || nodesAdded.length > 0) {
            for (const instances of this.allInstances.values()) {
                if (!instances.settings.enableFeatures[instances.type].focus || !instances.settings.highlightOpenNodes)
                    continue;
                let hasChanged = false;
                for (const id of nodesRemoved) {
                    const node = instances.nodesSet.extendedElementsMap.get(id);
                    if (node) {
                        node.toggleOpenInTab(false);
                        hasChanged = true;
                    }
                }
                for (const id of nodesAdded) {
                    const node = instances.nodesSet.extendedElementsMap.get(id);
                    if (node) {
                        node.toggleOpenInTab(true);
                        hasChanged = true;
                    }
                }
                if (hasChanged) {
                    instances.renderer.changed();
                }
            }
        }
        this.openNodes = newOpenNodes;
    }

    private observeSearchViews(): void {
        const searchLeaves = ExtendedGraphInstances.app.workspace.getLeavesOfType("search");

        // Remove any observed search that is no longer valid
        for (const view of Array.from(this.observedSearched.keys())) {
            if (!searchLeaves.find(leaf => leaf.view === view && !leaf.isDeferred)) {
                this.observedSearched.delete(view);
            }
        }

        // Observe newly opened search leaves
        for (const leaf of searchLeaves) {
            const view = leaf.view;
            if (!("dom" in view && view.dom && typeof view.dom === "object")) continue;
            if (!("resultDomLookup" in view.dom && view.dom.resultDomLookup && view.dom.resultDomLookup instanceof Map)) return;
            if (!("childrenEl" in view.dom && view.dom.childrenEl && view.dom.childrenEl instanceof HTMLDivElement)) continue;

            const childrenEl = view.dom.childrenEl;

            if (!this.observedSearched.has(view) || this.observedSearched.get(view)?.childrenEl !== childrenEl) {
                this.searchObserver.observe(childrenEl, { childList: true });
                this.observedSearched.set(view, { childrenEl: childrenEl, results: [] });
            }
        }
    }

    private computeSearchNodes(view: View): void {
        if (view.getViewType() !== "search") return;
        if (view.leaf.isDeferred) return;

        const entry = this.observedSearched.get(view);
        if (!entry) return;

        if (!("dom" in view && view.dom && typeof view.dom === "object")) return;
        if (!("resultDomLookup" in view.dom && view.dom.resultDomLookup && view.dom.resultDomLookup instanceof Map)) return;
        const resultDomLookup = view.dom.resultDomLookup;

        // Find the current search results
        const newResults: string[] = [];
        for (const file of resultDomLookup.keys()) {
            if (file instanceof TFile) {
                newResults.push(file.path);
            }
        }

        // Update the nodes accordingly
        const nodesRemoved = entry.results.filter(id => !newResults.contains(id));
        const nodesAdded = newResults.filter(id => !entry.results.contains(id));
        if (nodesRemoved.length > 0 || nodesAdded.length > 0) {
            for (const instances of this.allInstances.values()) {
                if (!instances.settings.enableFeatures[instances.type].focus || !instances.settings.highlightSearchResults)
                    continue;
                let hasChanged = false;
                for (const id of nodesRemoved) {
                    const node = instances.nodesSet.extendedElementsMap.get(id);
                    if (node) {
                        node.toggleIsSearchResult(false);
                        hasChanged = true;
                    }
                }
                for (const id of nodesAdded) {
                    const node = instances.nodesSet.extendedElementsMap.get(id);
                    if (node) {
                        node.toggleIsSearchResult(true);
                        hasChanged = true;
                    }
                }
                if (hasChanged) {
                    instances.renderer.changed();
                }
            }
        }

        entry.results = newResults;
    }

    isSearchResult(path: string): boolean {
        for (const entry of this.observedSearched.values()) {
            if (entry.results.contains(path)) return true;
        }
        return false;
    }

    getSearchResults(): string[] {
        return this.observedSearched.values().reduce((acc: string[], entry) => {
            return acc.concat(entry.results);
        }, []);
    }

    // =============================== GLOBAL UI ===============================

    private setGlobalUI(view: GraphView | LocalGraphView): { menu: MenuUI, control: GraphControlsUI } {
        let globalUI = this.globalUIs.get(view.leaf.id);

        if (globalUI && globalUI.menu.view === view && globalUI.control.view === view) return globalUI;

        const menuUI = new MenuUI(view);
        view.addChild(menuUI);

        const controlsUI = new GraphControlsUI(view);
        controlsUI.onPluginDisabled();
        view.addChild(controlsUI);

        globalUI = { menu: menuUI, control: controlsUI };
        this.globalUIs.set(view.leaf.id, globalUI);
        return globalUI;
    }

    // ================================ COLORS =================================

    updatePaletteForInteractive(interactive: string): void {
        this.allInstances.forEach(instance => {
            instance.interactiveManagers.get(interactive)?.recomputeColors();
        });
    }

    updateColorForInteractiveType(key: string, type: string): void {
        this.allInstances.forEach(instance => {
            instance.interactiveManagers.get(key)?.recomputeColor(type);
        });
    }

    // ================================= STATS =================================

    updateSizeFunctionForNodesStat(): void {
        for (const [leafID, instances] of this.allInstances) {
            instances.settings.nodesSizeFunction = ExtendedGraphInstances.settings.nodesSizeFunction;
            instances.renderer.changed();
        }
    }

    updatePaletteForNodesStat(): void {
        for (const [leafID, instances] of this.allInstances) {
            instances.settings.nodesColorFunction = ExtendedGraphInstances.settings.nodesColorFunction;
            instances.renderer.changed();
        }
    }

    updateSizeFunctionForLinksStat(): void {
        for (const [leafID, instances] of this.allInstances) {
            if (!instances.settings.curvedLinks) {
                for (const [id, extendedLink] of instances.linksSet.extendedElementsMap) {
                    extendedLink.changeCoreLinkThickness();
                }
            }
            instances.renderer.changed();
        }
    }

    updatePaletteForLinksStat(): void {
        for (const [leafID, instances] of this.allInstances) {
            for (const [id, extendedLink] of instances.linksSet.extendedElementsMap) {
                extendedLink.graphicsWrapper?.updateGraphics();
            }
            instances.renderer.changed();
        }
    }

    // ============================= ENABLE PLUGIN =============================

    enablePlugin(view: GraphView | LocalGraphView, stateID?: string, reloadState: boolean = true): void {
        if (!this.isResetting.get(view.leaf.id)) {
            this.backupOptions(view);
        }

        if (this.isPluginAlreadyEnabled(view)) return;
        if (this.isNodeLimitExceededForView(view)) return;

        const globalUI = this.setGlobalUI(view);
        globalUI.menu.disableUI();

        const actuallyEnablePlugin = async () => {
            const instances = await this.addGraph(view, stateID ?? ExtendedGraphInstances.settings.startingStateID, reloadState);

            if (ExtendedGraphInstances.settings.enableFeatures[instances.type]["elements-stats"]) {
                if (this.nodesSizeCalculator?.functionKey !== ExtendedGraphInstances.settings.nodesSizeFunction
                    && !SettingQuery.needDynamicGraphology(instances, { element: "node", stat: "size" })
                ) {
                    this.initializeNodesSizeCalculator();
                }
                if (this.nodesColorCalculator?.functionKey !== ExtendedGraphInstances.settings.nodesColorFunction
                    && !SettingQuery.needDynamicGraphology(instances, { element: "node", stat: "color" })
                ) {
                    this.initializeNodesColorCalculator();
                }
                if (this.linksSizeCalculator?.functionKey !== ExtendedGraphInstances.settings.linksSizeFunction
                    && !SettingQuery.needDynamicGraphology(instances, { element: "link", stat: "size" })
                ) {
                    this.initializeLinksSizeCalculator();
                }
                if (this.linksColorCalculator?.functionKey !== ExtendedGraphInstances.settings.linksColorFunction
                    && !SettingQuery.needDynamicGraphology(instances, { element: "link", stat: "color" })
                ) {
                    this.initializeLinksColorCalculator();
                }
            }

            globalUI.menu.setEnableUIState();
            globalUI.control.onPluginEnabled(instances);
            this.updateStatusBarItem(view.leaf);
        }


        if (ExtendedGraphInstances.settings.syncDefaultState) {
            ExtendedGraphInstances.statesManager.saveForDefaultState(view).then(() => actuallyEnablePlugin());
        }
        else {
            actuallyEnablePlugin();
        }
    }

    private async addGraph(view: GraphView | LocalGraphView, stateID: string, reloadState: boolean): Promise<GraphInstances> {
        let instances = this.allInstances.get(view.leaf.id);
        if (instances) return instances;

        instances = new GraphInstances(view);
        this.allInstances.set(view.leaf.id, instances);
        instances.setState(stateID);
        new GraphEventsDispatcher(instances, reloadState);
        if (stateID) {
            instances.statesUI.setValue(stateID);
        }

        instances.graphEventsDispatcher.load();
        view.addChild(instances.graphEventsDispatcher);

        if (view.getViewType() === "localgraph" && !isGraphBannerView(view)) {
            this.localGraphID = view.leaf.id;
        }

        return instances;
    }

    isNodeLimitExceededForView(view: GraphView | LocalGraphView): boolean {
        if (view.renderer.nodes.length > ExtendedGraphInstances.settings.maxNodes) {
            new Notice(`${t("notices.nodeLimiteExceeded")} (${view.renderer.nodes.length}). ${t("notices.nodeLimitIs")} ${ExtendedGraphInstances.settings.maxNodes}. ${t("notices.changeInSettings")}.`);
            return true;
        }
        return false;
    }

    isNodeLimitExceededForData(data: GraphData, notice: boolean = true): boolean {
        if (Object.keys(data.nodes).length > ExtendedGraphInstances.settings.maxNodes) {
            if (notice)
                new Notice(`${t("notices.nodeLimiteExceeded")} (${Object.keys(data.nodes).length}). ${t("notices.nodeLimitIs")} ${ExtendedGraphInstances.settings.maxNodes}. ${t("plugin.name")} ${t("notices.disabled")}. ${t("notices.changeInSettings")}.`);
            return true;
        }
        return false;
    }

    onPluginLoaded(view: GraphView | LocalGraphView): void {
        this.isResetting.set(view.leaf.id, false);
        this.globalUIs.get(view.leaf.id)?.menu.enableUI();
    }


    // ============================ DISABLE PLUGIN =============================

    disablePlugin(view: GraphView | LocalGraphView): void {
        this.disablePluginFromLeafID(view.leaf.id);
        if (!this.isResetting.get(view.leaf.id)) {
            view.renderer.changed();
        }
    }

    disablePluginFromLeafID(leafID: string) {
        this.disableUI(leafID);
        this.unloadDispatcher(leafID);
    }

    private disableUI(leafID: string) {
        const globalUI = this.globalUIs.get(leafID);
        if (globalUI) {
            globalUI.menu.disableUI();
            globalUI.menu.setDisableUIState();
            globalUI.control.onPluginDisabled();
        }
    }

    private unloadDispatcher(leafID: string) {
        const instances = this.allInstances.get(leafID);
        if (instances) {
            instances.graphEventsDispatcher.unload();
        }
        else {
            this.globalUIs.get(leafID)?.menu.enableUI();
        }
    }

    onPluginUnloaded(view: GraphView | LocalGraphView): void {
        this.allInstances.delete(view.leaf.id);

        if (this.localGraphID === view.leaf.id) this.localGraphID = null;

        if (!this.isResetting.get(view.leaf.id)) {
            if (view._loaded) {
                this.applyNormalState(view);
            }
            this.restoreBackupInGraphJson();
            this.globalUIs.get(view.leaf.id)?.menu.enableUI();
        }

        this.updateStatusBarItem(view.leaf);
    }

    // ============================= RESET PLUGIN ==============================

    resetAllPlugins(graphtype: GraphType) {
        const views = [...this.allInstances.values()].filter(i => i.type === graphtype).map(i => i.view);
        for (const view of views) {
            this.resetPlugin(view);
        }
    }

    resetPlugin(view: GraphView | LocalGraphView, reloadState: boolean = true, stateID?: string): void {
        this.isResetting.set(view.leaf.id, true);
        const instances = this.allInstances.get(view.leaf.id);
        stateID = stateID ?? instances?.stateData?.id;
        const scale = instances?.renderer.targetScale ?? false;
        this.disablePlugin(view);
        this.enablePlugin(view, stateID, reloadState);
        const newDispatcher = this.allInstances.get(view.leaf.id);
        if (newDispatcher && scale) {
            newDispatcher.renderer.targetScale = scale;
        }
    }

    // ===================== CHANGE CURRENT MARKDOWN FILE ======================

    onActiveLeafChange(leaf: WorkspaceLeaf | null) {
        // Change the number of nodes in the status bar
        this.updateStatusBarItem(leaf);
    }

    private isMarkdownLeaf(leaf: WorkspaceLeaf): boolean {
        return (leaf.view.getViewType() === "markdown") && (leaf.view instanceof FileView);
    }

    private onFileOpen(file: TFile | null): void {
        if (this.isHandlingMarkdownViewChange) return;
        this.isHandlingMarkdownViewChange = true;
        if (this.localGraphID) {
            const localInstances = this.allInstances.get(this.localGraphID);
            if (localInstances) {
                const instances = this.allInstances.get(localInstances.view.leaf.id);
                if (instances) {
                    this.isResetting.set(this.localGraphID, true);
                    instances.graphEventsDispatcher.reloadLocalDispatcher();
                }
            }
        }
        if (file) {
            const graphBannerPlugin = getGraphBannerPlugin();
            if (graphBannerPlugin) {
                // If there is a Graph Banner plugin graph, center it on the correct node.
                // It's not working perfectly, I think the Graph Banner plugin does its part after this piece of code,
                // which means that nodes get a new position after the zooming.
                const leaves = ExtendedGraphInstances.app.workspace.getLeavesOfType('markdown').filter(leaf => leaf.view instanceof MarkdownView && (leaf.view as MarkdownView).file === file);
                for (const leaf of leaves) {
                    if (!(leaf.view instanceof MarkdownView)) continue;
                    const view = leaf.view as MarkdownView;
                    const graphBannerView = getGraphBannerPlugin()?.graphViews.find(el => el.node === view.contentEl.querySelector(`.${getGraphBannerClass()}`))?.leaf.view;
                    if (graphBannerView && this.allInstances.get(graphBannerView.leaf.id)) {
                        const graphBannerViewTyped = graphBannerView as LocalGraphView;
                        this.zoomOnNode(graphBannerViewTyped, file.path, graphBannerViewTyped.renderer.targetScale);
                    }
                }
            }
        }
        this.isHandlingMarkdownViewChange = false;
    }

    // ==================== HANDLE NORMAL AND DEFAULT STATE ====================

    backupOptions(view: GraphView | LocalGraphView) {
        const engine = getEngine(view);
        if (!engine) return;
        const options = structuredClone(engine.getOptions());
        this.optionsBackup.set(view.leaf.id, options);
        //delete options.search;
        this.lastBackup = view.leaf.id;
        ExtendedGraphInstances.settings.backupGraphOptions = options;
        ExtendedGraphInstances.plugin.saveSettings();
    }

    restoreBackupInGraphJson() {
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

    getCorePluginInstance(): GraphPluginInstance | undefined {
        return ExtendedGraphInstances.app.internalPlugins.getPluginById("graph")?.instance as GraphPluginInstance;
    }

    applyNormalState(view: GraphView | LocalGraphView) {
        const engine = getEngine(view);
        const options = this.optionsBackup.get(view.leaf.id);
        if (engine && options) {
            engine.setOptions(options);
            for (const node of engine.renderer.nodes) {
                node.fontDirty = true;
            }
        }
    }


    // =============================== NODE MENU ===============================

    onNodeMenuOpened(menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) {
        if (source === "graph-context-menu" && leaf && file instanceof TFile) {
            this.allInstances.get(leaf.id)?.graphEventsDispatcher.inputsManager.onNodeMenuOpened(menu, file);
        }
    }

    // ============================== SCREENSHOT ===============================

    getSVGScreenshot(view: GraphView | LocalGraphView) {
        const instances = this.allInstances.get(view.leaf.id);
        let exportToSVG: ExportGraphToSVG;
        if (instances) {
            exportToSVG = new ExportExtendedGraphToSVG(instances);
        }
        else {
            const engine = getEngine(view);
            if (!engine) return;
            exportToSVG = new ExportCoreGraphToSVG(engine);
        }
        exportToSVG.toClipboard();
    }

    // ============================= ZOOM ON NODE ==============================

    zoomOnNode(view: GraphView | LocalGraphView, nodeID: string, targetScale?: number) {
        const renderer = view.renderer;
        const node = renderer.nodes.find(node => node.id === nodeID);
        if (!node) return;

        let scale = renderer.scale;
        if (targetScale === undefined) targetScale = ExtendedGraphInstances.settings.zoomFactor;
        let panX = renderer.panX
        let panY = renderer.panY;
        renderer.targetScale = Math.min(8, Math.max(1 / 128, targetScale));

        let zoomCenterX = renderer.zoomCenterX;
        let zoomCenterY = renderer.zoomCenterY;

        if (0 === zoomCenterX && 0 === zoomCenterY) {
            const s = window.devicePixelRatio;
            zoomCenterX = renderer.width / 2 * s;
            zoomCenterY = renderer.height / 2 * s;
        }

        const n = 0.85;
        scale = scale * n + targetScale * (1 - n);
        panX -= node.x * scale + panX - zoomCenterX;
        panY -= node.y * scale + panY - zoomCenterY;
        renderer.setPan(panX, panY);
        renderer.setScale(scale);
        renderer.changed();
    }

    // =============================== STATUS BAR ==============================

    updateStatusBarItem(leaf: WorkspaceLeaf | null, numberOfNodes?: number) {
        // Change the number of nodes in the status bar
        this.statusBarItem.detach();
        this.addStatusBarItem();

        if (leaf && (leaf.view.getViewType() === "graph" || leaf.view.getViewType() === "localgraph")) {
            // Add the number of nodes
            if (numberOfNodes === undefined) numberOfNodes = (leaf.view as GraphView | LocalGraphView).renderer.nodes.length;
            if (numberOfNodes !== undefined) {
                this.statusBarItem.createSpan({ text: numberOfNodes.toString() + " " + t("plugin.nodes"), cls: "status-bar-item-segment" });
            }

            const instances = this.allInstances.get(leaf.id);
            if (instances) {
                // Open the graph state modal on click
                this.statusBarItem.addClass("mod-clickable");
                this.statusBarItem.addEventListener('click', () => {
                    const modal = new GraphStateModal(instances);
                    modal.open();
                });

                // Add the number of selected nodes
                const numberOfSelectedNodes = Object.keys(instances.nodesSet.selectedNodes).length;
                if (numberOfSelectedNodes > 0) {
                    this.statusBarItem.createSpan({ text: `(${numberOfSelectedNodes} ${t("inputs.selected")})`, cls: "status-bar-item-segment" });
                }

                // Add the info button
                const infoButton = createSpan({ cls: "status-bar-item-icon status-bar-item-segment" });
                setIcon(infoButton, "info");
                this.statusBarItem.appendChild(infoButton);
            }
            else {
                this.statusBarItem.removeClass("mod-clickable");
            }
        }
    }
}