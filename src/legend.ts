import { Component, WorkspaceLeaf } from "obsidian";
import { Graph } from "./graph";

export class Legend extends Component {
    viewContent: HTMLElement;
    graphicsManager: Graph;
    leaf: WorkspaceLeaf;

    constructor(graphicsManager: Graph, leaf: WorkspaceLeaf) {
        super();
        this.graphicsManager = graphicsManager;
        this.leaf = leaf;
        this.viewContent = this.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        this.createLegendElement();
    }

    onload(): void {
        console.log("Loading Legend");
    }

    onunload(): void {
        console.log("Unload Legend");
    }


    createLegendElement() {
        let legend = this.viewContent.createDiv();
        legend?.addClass("legend-graph");
        let tagsContainer = legend?.createDiv();
        tagsContainer?.addClass("legend-tags-container");
    }

    updateTagLegend(type: string, color: Uint8Array) {
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

    addTagLegend(type: string, color: Uint8Array) {
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

    removeTagLegend(types: string[]) {
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