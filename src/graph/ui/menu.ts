import { Component, setIcon, WorkspaceLeaf } from "obsidian";

export class MenuUI extends Component {
    viewContent: HTMLElement;
    leaf: WorkspaceLeaf;

    button: HTMLButtonElement;
    enabled: boolean;

    constructor(leaf: WorkspaceLeaf) {
        super();
        this.leaf = leaf;
        this.viewContent = this.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        let container = this.viewContent.createDiv();
        container?.addClass("graph-toggle");

        this.button = container.createEl("button");
        setIcon(this.button, "sparkles");
        
        this.button.addEventListener('click', (function() {
            if (!this.enabled) {
                this.enable();
                leaf.trigger("extended-graph:enable-plugin", leaf);
            } else {
                this.disable();
                leaf.trigger("extended-graph:disable-plugin", leaf);
            }
        }).bind(this));
    }

    enable() {
        this.enabled = true;
        this.button.addClass("is-active");
    }

    disable() {
        this.enabled = false;
        this.button.removeClass("is-active");
    }
}