import { Plugin, View, WorkspaceLeaf } from 'obsidian';
import { GraphsManager } from './graphsManager';
import { DEFAULT_SETTINGS, ExtendedGraphSettings } from './settings/settings';
import { WorkspaceLeafExt } from './graph/graphEventsDispatcher';
import { ExtendedGraphSettingTab } from './settings/settingTab';

// https://pixijs.download/v7.4.2/docs/index.html

export default class GraphExtendedPlugin extends Plugin {
    settings: ExtendedGraphSettings;
    graphsManager: GraphsManager;
    waitingTime: number = 0;

    async onload(): Promise<void> {
        await this.loadSettings();
        this.addSettingTab(new ExtendedGraphSettingTab(this.app, this));

        this.graphsManager = new GraphsManager(this, this.app);
        this.addChild(this.graphsManager);
        this.graphsManager.load();

        this.registerEvent(this.app.workspace.on('layout-change', () => {
            this.handleLayoutChange();
        }));

        // @ts-ignore
        this.registerEvent(this.app.workspace.on('extended-graph:settings-colorpalette-changed', (interactive: string) => {
            this.graphsManager.updatePalette(interactive);
        }));
        // @ts-ignore
        this.registerEvent(this.app.workspace.on('extended-graph:settings-tag-color-changed', (type: string) => {
            this.graphsManager.updatePalette("tag");
        }));
        // @ts-ignore
        this.registerEvent(this.app.workspace.on('extended-graph:settings-link-color-changed', (type: string) => {
            this.graphsManager.updatePalette("link");
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
            this.graphsManager.setMenu(leaf as WorkspaceLeafExt);
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
        if (this.app.workspace.getLeavesOfType('graph').find(l => (l.view instanceof View) && this.hasObsidianRenderer((l)))) return true;
        if (this.app.workspace.getLeavesOfType('localgraph').find(l => (l.view instanceof View) && this.hasObsidianRenderer(l))) return true;
        return false;
    }

    getAllGraphLeaves() : WorkspaceLeaf[] {
        let leaves: WorkspaceLeaf[] = [];
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('graph').filter(l => (l.view instanceof View) && this.hasObsidianRenderer(l)));
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('localgraph').filter(l => (l.view instanceof View) && this.hasObsidianRenderer(l)));
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

