import { Component, Modal, setIcon, WorkspaceLeaf } from "obsidian";
import { Graph } from "../graph";
import { GraphViewData } from "src/views/viewData";

export class GraphViewsUI extends Component {
    viewContent: HTMLElement;
    graph: Graph;
    leaf: WorkspaceLeaf;
    select: HTMLSelectElement;

    constructor(graphicsManager: Graph, leaf: WorkspaceLeaf) {
        super();
        this.graph = graphicsManager;
        this.leaf = leaf;
        this.viewContent = this.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        let container = this.viewContent.createDiv();
        container?.addClass("graph-views-container");

        let title = container.createSpan();
        title.innerHTML = "views";
        title.addClass("graph-views-title");

        this.select = container.createEl("select");

        let addButton = container.createEl("button");
        setIcon(addButton, "plus");
        let addText = addButton.createSpan();
        addText.innerText = "Add view";

        addButton.addEventListener('click', event => {
            let modal = new Modal(this.leaf.app);
            modal.setTitle("New view name");
            modal.modalEl.addClass("graph-modal-new-view");
            let input = modal.contentEl.createEl("input");
            let btn = modal.contentEl.createEl("button");
            setIcon(btn, "plus");
            btn.addEventListener('click', event => {
                this.graph.newView(input.value);
                modal.close();
            })
            modal.open();
        })

        this.addView("vault", "vault");
    }

    addView(key: string, name: string) : void {
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
    
    updateViewsList(views: GraphViewData[]) : void {
        this.clear();
        views.forEach(view => {
            this.addView(view.name, view.name);
        });
    }

    clear() {
        for(let i = this.select.length; i >= 0; i--) {
            this.select.remove(i);
        }
        this.addView("vault", "vault");
    }
}