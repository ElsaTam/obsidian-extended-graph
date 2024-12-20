import { Component, setIcon, setTooltip, WorkspaceLeaf } from "obsidian";

export class MenuUI extends Component {
    viewContent: HTMLElement;
    leaf: WorkspaceLeaf;

    button: HTMLDivElement;
    enabled: boolean;

    constructor(leaf: WorkspaceLeaf) {
        super();
        this.leaf = leaf;
        this.viewContent = this.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        let graphControls = this.viewContent.querySelector(".graph-controls") as HTMLDivElement;

        let hr = graphControls.createEl("hr");
        hr.addClass("separator-exended-graph");

        this.button = graphControls.createDiv("clickable-icon graph-controls-button mod-extended-graph-toggle");
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
        setTooltip(this.button, "Enable Extended Graph Plugin", {placement: 'top'});
    }

    disable() {
        this.enabled = false;
        this.button.removeClass("is-active");
        setTooltip(this.button, "Disable Extended Graph Plugin", {placement: 'top'});
    }
}