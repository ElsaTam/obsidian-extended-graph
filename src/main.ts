import { Plugin, WorkspaceLeaf } from 'obsidian';
import { GraphsManager } from './graphsManager';
import { WorkspaceLeafExt } from './graphEventsDispatcher';
import { DEFAULT_SETTINGS, ExtendedGraphSettings, ExtendedGraphSettingTab } from './settings';

// https://pixijs.download/v7.4.2/docs/index.html

export default class GraphExtendedPlugin extends Plugin {
    settings: ExtendedGraphSettings;
    graphsManager: GraphsManager;
    waitingTime: number = 0;

    async onload(): Promise<void> {
        await this.loadSettings();
        this.addSettingTab(new ExtendedGraphSettingTab(this.app, this));

        this.graphsManager = new GraphsManager(this.app);
        this.addChild(this.graphsManager);
        this.graphsManager.load();

        this.registerEvent(this.app.workspace.on('layout-change', () => {
            this.handleLayoutChange();
        }));

        // @ts-ignore
        this.registerEvent(this.app.workspace.on('extended-graph:settings-colorpalette-changed', (interactive: string) => {
            this.graphsManager.updatePalette(interactive);
        }));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
    
    async handleLayoutChange() {
        // If we are already waiting for a renderer, don't check a second time
        if (this.waitingTime > 0) return;

        // Check if a renderer (a graph) is active
        await this.waitForRenderer();

        const leaves = this.getAllGraphLeaves();
        leaves.forEach(leaf => {
            this.graphsManager.addGraph(leaf, this.settings);
        });
    }
    
    waitForRenderer(): Promise<void> {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                this.waitingTime += 500;
                if (this.isGraphOpen() || this.waitingTime > 5000) {
                    this.waitingTime = 0;
                    clearInterval(intervalId);
                    resolve();
                }
            }, 500);
        });
    }

    isGraphOpen() : boolean {
        if (this.app.workspace.getLeavesOfType('graph').find(l => this.hasObsidianRenderer((l)))) return true;
        if (this.app.workspace.getLeavesOfType('localgraph').find(l => this.hasObsidianRenderer(l))) return true;
        return false;
    }

    getAllGraphLeaves() : WorkspaceLeaf[] {
        let leaves: WorkspaceLeaf[] = [];
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('graph').filter(l => this.hasObsidianRenderer(l)));
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('localgraph').filter(l => this.hasObsidianRenderer(l)));
        return leaves;
    }

    private hasObsidianRenderer(leaf: WorkspaceLeaf) : boolean {
        const renderer = (leaf as WorkspaceLeafExt).view.renderer;
        return renderer 
            && renderer.px 
            && renderer.px.stage 
            && (renderer.panX !== undefined)
            && (renderer.panY !== undefined)
            && typeof renderer.px.stage.addChild === 'function' 
            && typeof renderer.px.stage.removeChild === 'function'
            && Array.isArray(renderer.links);
    }
}

