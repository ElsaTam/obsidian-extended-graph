import { Plugin, View, WorkspaceLeaf } from 'obsidian';
import { GraphsManager } from './graphsManager';
import { DEFAULT_SETTINGS, ExtendedGraphSettings } from './settings/settings';
import { ExtendedGraphSettingTab } from './settings/settingTab';
import { INVALID_KEYS } from './globalVariables';
import { WorkspaceLeafExt } from './types/leaf';
import { WorkspaceExt } from './types/workspace';
import { GraphViewData } from './views/viewData';

// https://pixijs.download/v7.4.2/docs/index.html

export default class GraphExtendedPlugin extends Plugin {
    settings: ExtendedGraphSettings;
    graphsManager: GraphsManager;
    waitingTime: number = 0;

    // ================================ LOADING ================================

    async onload(): Promise<void> {
        await this.loadSettings();

        this.initializeInvalidKeys();
        this.addSettingTab(new ExtendedGraphSettingTab(this.app, this));
        this.loadGraphsManager();
        this.registerEvents();
    }

    private initializeInvalidKeys(): void {
        for (const key of Object.keys(this.settings.additionalProperties)) {
            INVALID_KEYS[key] = [];
        }
    }

    private loadGraphsManager() {
        this.graphsManager = new GraphsManager(this);
        this.addChild(this.graphsManager);
        this.graphsManager.load();
    }

    private registerEvents() {
        this.registerEvent(this.app.workspace.on('layout-change', () => {
            if (!this.isCoreGraphLoaded()) return;
            this.onLayoutChange();
        }));
        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            if (!this.isCoreGraphLoaded()) return;
            this.graphsManager.onActiveLeafChange(leaf);
        }));


        this.registerEvent((this.app.workspace as WorkspaceExt).on('extended-graph:settings-colorpalette-changed', (key: string) => {
            if (!this.isCoreGraphLoaded()) return;
            this.graphsManager.updatePalette(key);
        }));
        this.registerEvent((this.app.workspace as WorkspaceExt).on('extended-graph:settings-interactive-color-changed', (key: string, type: string) => {
            if (!this.isCoreGraphLoaded()) return;
            this.graphsManager.updateColor(key, type);
        }));
    }

    private isCoreGraphLoaded(): boolean {
        return !!this.app.internalPlugins.getPluginById("graph")?._loaded;
    }

    // =============================== UNLOADING ===============================

    onunload() {
    }

    // ================================ SETTINGS ===============================

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // ============================= LAYOUT CHANGE =============================
    
    async onLayoutChange() {
        if (!this.app.internalPlugins.getPluginById("graph")?._loaded) return;
        this.waitingTime = 0;

        try {
            const found = await this.waitForRenderer();
            const leaves = found ? this.getAllGraphLeaves(): [];
            this.graphsManager.syncWithLeaves(leaves);
            leaves.forEach(leaf => {
                this.graphsManager.onNewLeafOpen(leaf as WorkspaceLeafExt);
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

    private clearWaitInterval(intervalId: NodeJS.Timer, resolve: (value: boolean) => void, result: boolean): void {
        clearInterval(intervalId);
        this.waitingTime = 0;
        resolve(result);
    }

    private isGraphOpen(): boolean {
        if (this.app.workspace.getLeavesOfType('graph').find(leaf => leaf.view instanceof View && leaf.view._loaded)) return true;
        if (this.app.workspace.getLeavesOfType('localgraph').find(leaf => leaf.view instanceof View && leaf.view._loaded)) return true;
        return false;
    }

    private getAllGraphLeaves(): WorkspaceLeaf[] {
        let leaves: WorkspaceLeaf[] = [];
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('graph').filter(leaf => leaf.view._loaded));
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('localgraph').filter(leaf => leaf.view._loaded));
        return leaves;
    }

    // ================================= VIEWS =================================

    getViewDataById(id: string): GraphViewData | undefined {
        return this.settings.views.find(v => v.id === id);
    }
}

