import { Component, Modal, setIcon, WorkspaceLeaf } from "obsidian";
import { Graph } from "../graph";
import { GraphViewData } from "src/views/viewData";
import { DEFAULT_VIEW_ID, NONE_TYPE } from "src/globalVariables";

export class GraphViewsUI extends Component {
    viewContent: HTMLElement;
    graph: Graph;
    leaf: WorkspaceLeaf;
    currentViewID: string;

    root: HTMLDivElement;
    select: HTMLSelectElement;
    saveButton: HTMLButtonElement;
    addButton: HTMLButtonElement;
    deleteButton: HTMLButtonElement;
    

    constructor(graphicsManager: Graph, leaf: WorkspaceLeaf) {
        super();
        this.graph = graphicsManager;
        this.leaf = leaf;
        this.viewContent = this.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        this.root = this.viewContent.createDiv();
        this.root?.addClass("graph-views-container");

        let title = this.root.createSpan();
        title.innerHTML = "views";
        title.addClass("graph-views-title");

        this.select = this.root.createEl("select");
        this.select.addEventListener('change', event => {
            this.currentViewID = this.select.value;
            this.displaySaveDeleteButton();
            this.leaf.trigger('extended-graph:view-changed', this.select.value);
        });

        this.addButton = this.root.createEl("button");
        setIcon(this.addButton, "plus");
        let addText = this.addButton.createSpan();
        addText.innerText = "Add view";

        this.addButton.addEventListener('click', event => {
            let modal = new Modal(this.leaf.app);
            modal.setTitle("New view name");
            modal.modalEl.addClass("graph-modal-new-view");
            let input = modal.contentEl.createEl("input");
            let btn = modal.contentEl.createEl("button");
            setIcon(btn, "plus");
            btn.addEventListener('click', event => {
                const id = this.graph.newView(input.value);
                this.currentViewID = id;
                modal.close();
            })
            modal.open();
        })

        this.saveButton = this.root.createEl("button");
        setIcon(this.saveButton, "save");
        this.saveButton.addEventListener('click', event => {
            this.graph.saveView(this.select.value);
        });

        this.deleteButton = this.root.createEl("button");
        setIcon(this.deleteButton, "trash-2");
        this.deleteButton.addEventListener('click', event => {
            this.graph.deleteView(this.select.value);
        });

        this.currentViewID = this.select.value;
    }

    
    onunload(): void {
        this.root.parentNode?.removeChild(this.root);
    }

    addOption(key: string, name: string) : void {
        for (let i = 0; i < this.select.length; ++i) {
            if (this.select.options[i].value == key) {
                this.select.options[i].innerText = name;
                return;
            }
        }
        var option = document.createElement("option");
        option.value = key;
        option.text = name;
        this.select.appendChild(option);
    }

    addView(key: string, name: string) {
        this.addOption(key, name);
        this.select.value = key;
    }
    
    updateViewsList(views: GraphViewData[]) : void {
        this.clear();
        views.forEach(view => {
            this.addOption(view.id, view.name);
        });
        if (views.find(v => v.id === this.currentViewID)) {
            this.select.value = this.currentViewID;
        }
        else {
            this.currentViewID = this.select.value;
        }
        this.displaySaveDeleteButton();
    }

    clear() {
        for(let i = this.select.length; i >= 0; i--) {
            this.select.remove(i);
        }
    }

    private displaySaveDeleteButton() {
        this.saveButton.style.display   = this.select.value !== DEFAULT_VIEW_ID ? "" : "none";
        this.deleteButton.style.display = this.select.value !== DEFAULT_VIEW_ID ? "" : "none";
    }
}