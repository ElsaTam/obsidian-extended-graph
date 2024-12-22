import { Component, setIcon, setTooltip, WorkspaceLeaf } from "obsidian";

export class MenuUI extends Component {
    viewContent: HTMLElement;
    leaf: WorkspaceLeaf;

    buttonEnable: HTMLDivElement;
    buttonReset: HTMLDivElement;
    enabled: boolean;

    constructor(leaf: WorkspaceLeaf) {
        super();
        this.leaf = leaf;
        this.viewContent = this.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        let graphControls = this.viewContent.querySelector(".graph-controls") as HTMLDivElement;

        let hr = graphControls.createEl("hr");
        hr.addClass("separator-exended-graph");
        this.createEnableButton(graphControls);
        this.createResetButton(graphControls);
    }

    createEnableButton(graphControls: HTMLDivElement) {
        this.buttonEnable = graphControls.createDiv("clickable-icon graph-controls-button mod-extended-graph-toggle");
        setIcon(this.buttonEnable, "sparkles");
        
        this.buttonEnable.addEventListener('click', (function() {
            if (!this.enabled) {
                this.enable();
                this.leaf.trigger("extended-graph:enable-plugin", this.leaf);
            } else {
                this.disable();
                this.leaf.trigger("extended-graph:disable-plugin", this.leaf);
            }
        }).bind(this));
    }

    createResetButton(graphControls: HTMLDivElement) {
        this.buttonReset = graphControls.createDiv("clickable-icon graph-controls-button mod-extended-graph-reset");
        setIcon(this.buttonReset, "rotate-ccw");
        
        this.buttonReset.addEventListener('click', (function() {
            if (this.enabled) {
                this.leaf.trigger("extended-graph:reset-plugin", this.leaf);
            }
        }).bind(this));
        
        this.buttonReset.style.display = "none";
    }

    enable() {
        this.enabled = true;
        this.buttonEnable.addClass("is-active");
        this.buttonReset.style.display = "";
        setTooltip(this.buttonEnable, "Enable Extended Graph Plugin", {placement: 'top'});
    }

    disable() {
        this.enabled = false;
        this.buttonEnable.removeClass("is-active");
        this.buttonReset.style.display = "none";
        setTooltip(this.buttonEnable, "Disable Extended Graph Plugin", {placement: 'top'});
    }
}