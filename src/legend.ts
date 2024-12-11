import { WorkspaceLeaf } from "obsidian";
import { GraphicsManager } from "./graphicsManager";
import { MapAddEvent, MapChangeEvent, MapRemoveEvent } from "./tagsManager";

export class Legend {
    viewContent: HTMLElement;
    graphicsManager: GraphicsManager;

    constructor(graphicsManager: GraphicsManager, leaf: WorkspaceLeaf) {
        this.graphicsManager = graphicsManager;

        // @ts-ignore
        this.viewContent = leaf.containerEl.getElementsByClassName("view-content")[0];
        
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
    }


    createLegendElement() {
        let legend = this.viewContent.createDiv();
        legend?.addClass("legend-graph");
        let tagsContainer = legend?.createDiv();
        tagsContainer?.addClass("legend-tags-container");
    }

    private updateTagLegend(type: string, color: Uint8Array) {
        let tagsContainer = this.viewContent.getElementsByClassName("legend-tags-container")[0];
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
        let tagsContainer = this.viewContent.getElementsByClassName("legend-tags-container")[0];
        if (!tagsContainer) return;

        let className = "legend-tag-" + type;
        const legendTagCollection = tagsContainer.getElementsByClassName(className);
        if (legendTagCollection.length == 0) {
            let tagButton = tagsContainer.createEl("button");
            tagButton.addClass(className);
            tagButton.addClass("legend-tag");
            tagButton.setText(type);
            tagButton.addEventListener('click', event => {
                this.toggleTag(type);
            })
            tagButton.style.setProperty("--tag-color-rgb", `${color[0]}, ${color[1]}, ${color[2]}`);
        }
    }

    private removeTagLegend(types: string[]) {
        let tagsContainer = this.viewContent.getElementsByClassName("legend-tags-container")[0];
        if (!tagsContainer) return;

        types.forEach(type => {
            let className = "legend-tag-" + type;
            let legendTagCollection = tagsContainer.getElementsByClassName(className);
            while(legendTagCollection.length > 0){
                legendTagCollection[0].parentNode?.removeChild(legendTagCollection[0]);
            }
        })
    }



    toggleTag(type: string) {
        const tag = this.graphicsManager.tagsManager.getTag(type);
        if (!tag) return;

        let legendTag = this.viewContent.getElementsByClassName("legend-tag-" + type)[0];

        if (tag.isActive) {
            this.graphicsManager.tagsManager.disable(type);
            legendTag.addClass("is-hidden");
        }
        else {
            this.graphicsManager.tagsManager.enable(type);
            legendTag.removeClass("is-hidden");
        }
    }
}