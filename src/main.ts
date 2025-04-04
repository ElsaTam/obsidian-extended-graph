import { addIcon, MarkdownView, Plugin, View, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, ExtendedGraphSettingTab, FOLDER_KEY, getGraphBannerClass, getGraphBannerPlugin, GraphBannerPlugin, GraphologySingleton, GraphsManager, hasEngine, INVALID_KEYS, isGraphBannerLoaded, LINK_KEY, PluginInstances, StatesManager, TAG_KEY } from './internal';
import { stronglyConnectedComponents } from 'graphology-components';
import { DirectedGraph } from 'graphology';
import { topologicalSort } from 'graphology-dag';
// https://pixijs.download/v7.4.2/docs/index.html

export default class ExtendedGraphPlugin extends Plugin {
    waitingTime: number = 0;

    // ================================ LOADING ================================

    async onload(): Promise<void> {
        PluginInstances.plugin = this;
        PluginInstances.app = this.app;
        await this.loadSettings();

        addIcon("git-fork-sparkles", `<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" class="git-fork-sparkles"><circle cx="50" cy="76" r="12"/><circle cx="25" cy="25" r="12"/><circle cx="76" cy="25" r="12"/><path d="M76 36v8c0 2.4-1.6 4-4 4H28c-2.4 0-4-1.6-4-4V36"/><path d="M50 50v12"/><path d="m 82.03746,54.745552 v 16"/><path d="m 90.03746,62.745552  h -16"/><path d="m 72.5023,80.767008 v 8"/><path d="m 76.5023,84.767008 h -8"/><path d="m 14.7461264,54.15018 v 8"/><path d="m 18.7461264,58.15018 h -8"/></g>`);

        this.initializeInvalidKeys();
        this.addSettingTab(new ExtendedGraphSettingTab(this));

        this.registerEvent(this.app.workspace.on('layout-ready', () => {
            this.loadGraphsManager();
            this.onLayoutChange();
        }));

        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!isGraphBannerLoaded()) return;

                if (!file || file.extension !== "md") return;

                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!view || view.file !== file) return;

                this.onMarkdownViewOpen(view);
            }),
        );

        this.registerEvent(
            this.app.workspace.on('layout-change', async () => {
                //this.onLayoutChange();
            })
        )
    }

    private initializeInvalidKeys(): void {
        for (const key of Object.keys(PluginInstances.settings.additionalProperties)) {
            INVALID_KEYS[key] = [];
        }
    }

    private loadGraphsManager() {
        PluginInstances.graphsManager = new GraphsManager();
        PluginInstances.statesManager = new StatesManager();
        this.addChild(PluginInstances.graphsManager);
        PluginInstances.graphsManager.load();
    }

    // =============================== UNLOADING ===============================

    onunload() {
    }

    // ================================ SETTINGS ===============================

    async loadSettings() {
        let data = await this.loadData();
        // Comlete default settings
        this.completeDefaultSettings();
        if (!data) data = DEFAULT_SETTINGS;
        // Remove invalid shallow keys
        for (const key in data) {
            if (!DEFAULT_SETTINGS.hasOwnProperty(key)) {
                delete data[key];
            }
        }
        // Deep load default settings
        this.loadSettingsRec(DEFAULT_SETTINGS, data);
        PluginInstances.settings = data;
    }

    private completeDefaultSettings() {
        DEFAULT_SETTINGS.interactiveSettings[TAG_KEY] = {
            colormap: "hsv",
            colors: [],
            unselected: [],
            noneType: "none",
            showOnGraph: true,
            enableByDefault: true,
        };

        DEFAULT_SETTINGS.interactiveSettings[LINK_KEY] = {
            colormap: "rainbow",
            colors: [],
            unselected: [],
            noneType: "none",
            showOnGraph: true,
            enableByDefault: true,
        };

        DEFAULT_SETTINGS.interactiveSettings[FOLDER_KEY] = {
            colormap: "winter",
            colors: [],
            unselected: [],
            noneType: ".",
            showOnGraph: true,
            enableByDefault: false,
        };
    }

    private loadSettingsRec(defaultSettings: any, userSettings: any) {
        if (!defaultSettings || typeof defaultSettings !== 'object' || Array.isArray(defaultSettings)) {
            return;
        }
        if (!userSettings || typeof userSettings !== 'object' || Array.isArray(userSettings)) {
            return;
        }
        // Complete settings
        for (const key in defaultSettings) {
            // Add settings
            if (!userSettings.hasOwnProperty(key)) {
                userSettings[key] = defaultSettings[key];
            }
            // Or recursively complete settings
            else {
                this.loadSettingsRec(defaultSettings[key], userSettings[key]);
            }
        }
    }

    async saveSettings() {
        await this.saveData(PluginInstances.settings);
    }

    // ============================= LAYOUT CHANGE =============================

    async onLayoutChange() {
        if (!this.app.internalPlugins.getPluginById("graph")?._loaded) return;
        this.waitingTime = 0;

        try {
            const found = await this.waitForRenderer();
            const leaves = found ? this.getAllGraphLeaves() : [];
            PluginInstances.graphsManager.syncWithLeaves(leaves);
            leaves.forEach(leaf => {
                PluginInstances.graphsManager.onNewLeafOpen(leaf);
            });
        } catch (e) {
            console.error(e);
        }
    }

    private waitForRenderer(): Promise<boolean> {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                this.waitingTime += 200;
                if (this.isGraphOpen()) {
                    this.clearWaitInterval(intervalId, resolve, true);
                }
                else if (this.waitingTime > 500) {
                    this.clearWaitInterval(intervalId, resolve, false);
                }
            }, 100);
        });
    }

    private clearWaitInterval(intervalId: NodeJS.Timeout, resolve: (value: boolean) => void, result: boolean): void {
        clearInterval(intervalId);
        this.waitingTime = 0;
        resolve(result);
    }

    private isGraphOpen(): boolean {
        if (this.app.workspace.getLeavesOfType('graph').find(leaf => this.isGraph(leaf))) return true;
        if (this.app.workspace.getLeavesOfType('localgraph').find(leaf => this.isGraph(leaf))) return true;
        if (getGraphBannerPlugin()?.graphViews.find(v => this.isGraph(v.leaf))) return true;
        return false;
    }

    private getAllGraphLeaves(): WorkspaceLeaf[] {
        let leaves: WorkspaceLeaf[] = [];
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('graph').filter(leaf => this.isGraph(leaf)));
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('localgraph').filter(leaf => this.isGraph(leaf)));
        leaves = leaves.concat(getGraphBannerPlugin()?.graphViews.map(v => v.leaf) || []);
        return [...(new Set(leaves))];
    }

    private isGraph(leaf: WorkspaceLeaf): boolean {
        return leaf.view instanceof View && leaf.view._loaded && hasEngine(leaf);
    }

    private onMarkdownViewOpen(view: MarkdownView): void {
        // Select the node that will be observed for mutations
        const targetNode = view.contentEl;

        // Options for the observer (which mutations to observe)
        const config = { attributes: true, childList: true, subtree: true };

        // Callback function to execute when mutations are observed
        const callback: MutationCallback = (mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === "childList") {
                    if (mutation.addedNodes.length > 0) {
                        if ((mutation.addedNodes[0] as HTMLElement).classList?.contains(getGraphBannerClass())) {
                            this.onLayoutChange();
                            /*const leaf = getGraphBannerPlugin()?.graphViews.find(v => v.node === mutation.addedNodes[0])?.leaf;
                            if (leaf && this.isGraph(leaf)) {
                                PluginInstances.graphsManager.onNewLeafOpen(leaf);
                            }*/
                        }
                    }
                }
            }
        };

        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);

        // Start observing the target node for configured mutations
        observer.observe(targetNode, config);

        // Stop observing after 2 seconds
        setTimeout(() => {
            observer.disconnect();
        }, 2000);
    }
}

