import { Component, setIcon } from "obsidian";
import { GraphView, LocalGraphView } from "obsidian-typings";
import { GraphInstances } from "../../internal";

export abstract class GCSection extends Component {
    instances: GraphInstances | undefined;
    view: GraphView | LocalGraphView;

    graphControls: HTMLElement;

    isCollapsed: boolean;

    root: HTMLDivElement;
    treeItemChildren: HTMLDivElement;
    collapseIcon: HTMLDivElement;

    constructor(view: GraphView | LocalGraphView, sectionID: string, title: string) {
        super();
        this.view = view;
        this.graphControls = view.contentEl.querySelector(".graph-controls") as HTMLElement;

        this.root = this.graphControls.createDiv(`tree-item graph-control-section mod-extended-graph-${sectionID}`);

        const collapsible = this.root.createDiv("tree-item-self mod-collapsible");
        this.collapseIcon = collapsible.createDiv("tree-item-icon collapse-icon is-collapsed");
        setIcon(this.collapseIcon, "right-triangle");
        const icon = collapsible.createDiv("tree-item-header-icon");
        setIcon(icon, "git-fork-sparkles");
        const inner = collapsible.createDiv("tree-item-inner");
        const header = inner.createEl("header", {
            cls: "graph-control-section-header",
            text: title,
        });

        collapsible.onClickEvent(() => {
            if (this.isCollapsed) {
                this.openGraphControlSection();
            }
            else {
                this.collapseGraphControlSection();
            }
        })
    }

    abstract display(enabled: boolean): void;

    onPluginEnabled(instances: GraphInstances): void {
        this.instances = instances;
        this.display(true);
    }

    onPluginDisabled(): void {
        this.instances = undefined;
        this.display(false);
    }

    onunload(): void {
        this.root.parentNode?.removeChild(this.root);
    }

    openGraphControlSection() {
        this.root.removeClass("is-collapsed");
        this.root.appendChild(this.treeItemChildren);
        this.collapseIcon.removeClass("is-collapsed");
        this.isCollapsed = false;
    }

    collapseGraphControlSection() {
        this.root.addClass("is-collapsed");
        if (this.treeItemChildren) this.root.removeChild(this.treeItemChildren);
        this.collapseIcon.addClass("is-collapsed");

        this.isCollapsed = true;
    }
}