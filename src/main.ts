import { Plugin, WorkspaceLeaf, CachedMetadata, TFile } from 'obsidian';
import { ObsidianRenderer } from 'src/types';
import { GraphicsManager } from 'src/graphicsManager';
import { MapAddEvent, MapChangeEvent, MapRemoveEvent } from './tagsManager';

// https://pixijs.download/v7.4.2/docs/index.html

export default class GraphExtendedPlugin extends Plugin {
    
    firstRenderer: ObsidianRenderer | null = null;
    firstLeaf: WorkspaceLeaf | null = null;
    animationFrameId: number | null = null;
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
        // Cancel the current animation
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // If we are already waiting for a renderer, don't check a second time
        if (this.waitingTime > 0) return;

        // Check if a renderer (a graph) is active
        await this.waitForRenderer();

        // Get the first renderer
        // TODO: get all renderer and iterate through them
        const newRenderer = this.getFirstRenderer();
        if (!newRenderer) {
            this.firstRenderer = null;
            return;
        }
        this.firstRenderer = newRenderer;

        // Clean the previous Graphics Manager, if any
        if (this.graphicsManager) {
            this.graphicsManager.clear();
            this.graphicsManager = null;
        }

        // Initialize the Graphics Manager
        this.graphicsManager = new GraphicsManager(this.firstRenderer, this.app);

        // Add legend
        this.createLegendElement();
        this.graphicsManager.tagsManager.on('add', (event: MapAddEvent) => {
            this.addTagLegend(event.tagType, event.tagColor);
        });
        this.graphicsManager.tagsManager.on('change', (event: MapChangeEvent) => {
            this.updateTagLegend(event.tagType, event.tagColor);
        });
        this.graphicsManager.tagsManager.on('remove', (event: MapRemoveEvent) => {
            this.removeTagLegend(event.tagTypes);
        });

        // Initialize graphics
        this.graphicsManager.init();

        requestAnimationFrame(this.updateGraphics.bind(this));
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

    updateGraphics(): void {
        if (!this.graphicsManager) return;
        
        if (!this.firstRenderer) {
            this.graphicsManager.clear();
            this.graphicsManager = null;
            return;
        }

        if (this.animationFrameId) {
            this.graphicsManager.updateAll();
        }
        
        this.animationFrameId = requestAnimationFrame(this.updateGraphics.bind(this));
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


    private createLegendElement() {
        let viewContent = this.firstLeaf?.containerEl.getElementsByClassName("view-content")[0];
        let legend = viewContent?.createDiv();
        legend?.addClass("legend-graph");
        let tagsContainer = legend?.createDiv();
        tagsContainer?.addClass("legend-tags-container");
    }

    //private resetTagLegend() {
    //    let tagsContainer = this.firstLeaf?.containerEl.getElementsByClassName("legend-tags-container")[0];
    //    if (!tagsContainer) return;
    //    tagsContainer.innerHTML = '';
    //    this.graphicsManager?.tagsManager.getTags().forEach(tag => {
    //        const color = this.graphicsManager?.tagsManager.getColor(tag);
    //        if (color) this.updateTagLegend(tag, color);
    //    })
    //}



    private updateTagLegend(type: string, color: Uint8Array) {
        let tagsContainer = this.firstLeaf?.containerEl.getElementsByClassName("legend-tags-container")[0];
        if (!tagsContainer) return;

        let className = "legend-tag-" + type;
        const legendTagCollection = tagsContainer.getElementsByClassName(className);
        if (legendTagCollection.length == 0) {
            this.addTagLegend(type, color)
        }
        else {
            Array.from(legendTagCollection as HTMLCollectionOf<HTMLElement>).forEach(tagBox => {
                tagBox.style.setProperty("--tag-color-rgb", `${color[0]}, ${color[1]}, ${color[2]}`);
            });
        }
    }

    private addTagLegend(type: string, color: Uint8Array) {
        let tagsContainer = this.firstLeaf?.containerEl.getElementsByClassName("legend-tags-container")[0];
        if (!tagsContainer) return;

        let className = "legend-tag-" + type;
        const legendTagCollection = tagsContainer.getElementsByClassName(className);
        if (legendTagCollection.length == 0) {
            let tagBox = tagsContainer.createDiv();
            tagBox.addClass(className);
            tagBox.addClass("legend-tag");
            tagBox.setText(type);
            tagBox.style.setProperty("--tag-color-rgb", `${color[0]}, ${color[1]}, ${color[2]}`);
        }
    }

    private removeTagLegend(types: string[]) {
        let tagsContainer = this.firstLeaf?.containerEl.getElementsByClassName("legend-tags-container")[0];
        if (!tagsContainer) return;

        types.forEach(type => {
            let className = "legend-tag-" + type;
            let legendTagCollection = tagsContainer.getElementsByClassName(className);
            while(legendTagCollection.length > 0){
                legendTagCollection[0].parentNode?.removeChild(legendTagCollection[0]);
            }
        })
    }
}

