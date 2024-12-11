import { Plugin, WorkspaceLeaf, CachedMetadata, TFile } from 'obsidian';
import { ObsidianRenderer } from 'src/types';
import { GraphicsManager } from 'src/graphicsManager';
import { MapAddEvent, MapChangeEvent, MapRemoveEvent } from './tagsManager';
import { Legend } from './legend';

// https://pixijs.download/v7.4.2/docs/index.html

export default class GraphExtendedPlugin extends Plugin {
    
    firstRenderer: ObsidianRenderer | null = null;
    firstLeaf: WorkspaceLeaf | null = null;
    legend: Legend | null = null;
    graphicsManager: GraphicsManager | null = null;
    waitingTime: number = 0;

    async onload(): Promise<void> {
        this.registerEvent(this.app.workspace.on('layout-change', () => {
            this.handleLayoutChange();
        }));
        this.registerEvent(this.app.metadataCache.on('changed', (file: TFile, data: string, cache: CachedMetadata) => {
            this.handleMetadataCacheChange(file, data, cache);
        }));
    }
    
    async handleLayoutChange() {
        // If we are already waiting for a renderer, don't check a second time
        if (this.waitingTime > 0) return;

        // Check if a renderer (a graph) is active
        await this.waitForRenderer();

        // Get the first renderer
        // TODO: get all renderer and iterate through them
        const newRenderer = this.getFirstRenderer();
        if (!newRenderer || !this.firstLeaf) {
            this.firstRenderer = null;
            this.firstLeaf = null;
            return;
        }
        this.firstRenderer = newRenderer;

        // Clean the previous Graphics Manager, if any
        if (this.graphicsManager) {
            this.graphicsManager.clear();
            this.graphicsManager = null;
        }

        // Initialize the Graphics Manager
        const canvas: Element = this.firstLeaf.containerEl.getElementsByTagName("canvas")[0];
        this.graphicsManager = new GraphicsManager(this.firstRenderer, this.app, canvas);

        // Add legend
        this.legend = new Legend(this.graphicsManager, this.firstLeaf);

        // Initialize graphics
        this.graphicsManager.init();
    }

    async handleMetadataCacheChange(file: TFile, data: string, cache: CachedMetadata) {
        if (!(this.graphicsManager && this.firstRenderer && this.firstLeaf && this.waitingTime == 0)) return;

        const container = this.graphicsManager?.getGraphNodeContainerFromFile(file);
        if (!container) return;

        let newTypes: string[] = [];
        cache?.tags?.forEach(tagCache => {
            const type = tagCache.tag.replace('#', '');
            newTypes.push(type);
        });

        const needsUpdate = !container.matchesTypes(newTypes);

        if (needsUpdate) {
            this.graphicsManager.tagsManager.update(this.graphicsManager.getAllTagTypesFromCache());
        }
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
        for (const leaf of this.app.workspace.getLeavesOfType('graph')) {
            // @ts-ignore
            if (this.isObsidianRenderer(leaf.view.renderer)) {
                return true;
            }
        }
        for (const leaf of this.app.workspace.getLeavesOfType('localgraph')) {
            // @ts-ignore
            if (this.isObsidianRenderer(leaf.view.renderer)) {
                return true;
            }
        }
        return false;
    }

    getFirstRenderer(): ObsidianRenderer | null {
        let graphLeaves: WorkspaceLeaf[] = this.app.workspace.getLeavesOfType('graph');
        for (const leaf of graphLeaves) {
            // @ts-ignore
            const renderer = leaf.view.renderer;
            if (this.isObsidianRenderer(renderer)) {
                this.firstLeaf = leaf;
                return renderer;
            }
        }

        graphLeaves = this.app.workspace.getLeavesOfType('localgraph');
        for (const leaf of graphLeaves) {
            // @ts-ignore
            const renderer = leaf.view.renderer;
            if (this.isObsidianRenderer(renderer)) {
                this.firstLeaf = leaf;
                return renderer;
            }
        }
        this.firstLeaf = null;
        return null;
    }

    private isObsidianRenderer(renderer: any): renderer is ObsidianRenderer {
        return renderer 
            && renderer.px 
            && renderer.px.stage 
            && renderer.panX
            && renderer.panY
            && typeof renderer.px.stage.addChild === 'function' 
            && typeof renderer.px.stage.removeChild === 'function'
            && Array.isArray(renderer.links);
    }
}

