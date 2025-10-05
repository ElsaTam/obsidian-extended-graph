import {
    CachedMetadata,
    Component,
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
    Pinner,
    nodeStatFunctionLabels,
    linkStatFunctionLabels,
    GraphStateModal,
    LinksStatCalculatorFactory,
    LinkStat,
    SettingQuery,
    t,
    getNLPPlugin,
    getDataviewPlugin,
    getLinks,
    PluginLifecycleManager as LifecycleManager,
    GraphLeavesManager,
    SearchLeavesManager,
    FileLeavesManager,
    VaultStatsManager,
    LeavesManager
} from "./internal";


declare module "obsidian" {
    interface Workspace {
        on(name: "extended-graph:enabled-in-view", callback: (view: GraphView | LocalGraphView) => any): EventRef;
        on(name: "extended-graph:disabled-in-view", callback: (view: GraphView | LocalGraphView) => any): EventRef;
    }
}

export class GraphsManager extends Component {
    optionsBackup: Map<string, GraphPluginInstanceOptions> = new Map();
    allInstances: Map<string, GraphInstances> = new Map();

    leavesManager: LeavesManager = new LeavesManager();
    lifecycleManager: LifecycleManager = new LifecycleManager();
    graphLeavesManager: GraphLeavesManager = new GraphLeavesManager();
    searchLeavesManager: SearchLeavesManager = new SearchLeavesManager();
    fileLeavesManager: FileLeavesManager = new FileLeavesManager();
    vaultStatsManager: VaultStatsManager = new VaultStatsManager();

    lastBackup: string;

    statusBarItem: HTMLElement;


    constructor() {
        super();
        this.addChild(this.leavesManager);
        this.addChild(this.graphLeavesManager);
        this.addChild(this.lifecycleManager);
        this.addChild(this.searchLeavesManager);
        this.addChild(this.fileLeavesManager);
        this.addChild(this.vaultStatsManager);
    }

    // ================================ LOADING ================================

    override onload(): void {
        this.addStatusBarItem();
        this.registerEvents();
    }

    private addStatusBarItem(): void {
        this.statusBarItem = ExtendedGraphInstances.plugin.addStatusBarItem();
        this.statusBarItem.addClasses(['plugin-extended-graph']);
    }

    private registerEvents() {
        this.onMetadataCacheChange = this.onMetadataCacheChange.bind(this);
        if (getDataviewPlugin()) {
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

    isCoreGraphLoaded(): boolean {
        return !!ExtendedGraphInstances.app.internalPlugins.getPluginById("graph")?._loaded;
    }


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