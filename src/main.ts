import { FileView, Plugin, View, WorkspaceLeaf } from 'obsidian';
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

        this.graphsManager = new GraphsManager(this);
        this.addChild(this.graphsManager);
        this.graphsManager.load();

        this.registerEvent(this.app.workspace.on('layout-change', () => {
            this.onLayoutChange();
        }));
        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            this.onActiveLeafChange(leaf);
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
    
    async onLayoutChange() {
        // Restart the research
        this.waitingTime = 0;

        // Check if a renderer (a graph) is active
        this.waitForRenderer().then(found => {
            if (found) {
                const leaves = this.getAllGraphLeaves();
                this.graphsManager.syncWithLeaves(leaves);
                leaves.forEach(leaf => {
                    this.graphsManager.onNewLeafOpen(leaf as WorkspaceLeafExt);
                });
            }
            else {
                this.graphsManager.syncWithLeaves([]);
            }
        });
    }

    onActiveLeafChange(leaf: WorkspaceLeaf | null) {
        if (leaf && leaf.view.getViewType() === "markdown" && leaf.view instanceof FileView) {
            this.graphsManager.highlightFile(leaf.view.file);
        }
        else {
            this.graphsManager.highlightFile(null);
        }
    }
    
    waitForRenderer(): Promise<boolean> {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                this.waitingTime += 200;
                if (this.isGraphOpen()) {
                    this.waitingTime = 0;
                    clearInterval(intervalId);
                    resolve(true);
                }
                else if (this.waitingTime > 500) {
                    this.waitingTime = 0;
                    clearInterval(intervalId);
                    resolve(false)
                }
            }, 100);
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

