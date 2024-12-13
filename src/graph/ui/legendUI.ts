import { Component, WorkspaceLeaf } from "obsidian";
import { Graph } from "../graph";
import { InteractiveManager } from "../interactiveManager";

class LegendRow {
    name: string;
    container: Element;
    cssColorVariable: string;
    manager: InteractiveManager;

    constructor(name: string, manager: InteractiveManager, root: Element) {
        this.name = name;
        this.manager = manager;
        this.container = root.createDiv();
        this.container.addClass(`graph-legend-row`);
        this.container.addClass(`graph-legend-${name}s-row`);
        this.cssColorVariable = "--legend-color-rgb";

        
        let title = this.container.createSpan();
        title.innerText = this.name + "s";
        title.addClass("graph-legend-title");
    }

    private getClassName(type: string) : string {
        return "graph-legend-" + type;
    }

    addLegend(type: string, color: Uint8Array) : void {
        if (!this.container.getElementsByClassName(this.getClassName(type))[0]) {
            let button = this.container.createEl("button");
            button.addClasses([this.getClassName(type), "graph-legend"]);
            button.setText(type);
            button.addEventListener('click', event => {
                this.toggle(type);
            })
            button.style.setProperty(this.cssColorVariable, `${color[0]}, ${color[1]}, ${color[2]}`);
        }
    }

    updateLegend(type: string, color: Uint8Array) : void {
        const button = this.container.getElementsByClassName(this.getClassName(type))[0];
        if (!button) {
            this.addLegend(type, color)
        }
        else {
            (button as HTMLElement).style.setProperty(this.cssColorVariable, `${color[0]}, ${color[1]}, ${color[2]}`);
        }
    }

    removeLegend(types: string[]) {
        types.forEach(type => {
            let button = this.container.getElementsByClassName(this.getClassName(type))[0];
            button.parentNode?.removeChild(button);
        })
    }

    toggle(type: string) {
        const interactive = this.manager.getInteractive(type);
        if (!interactive) return;

        let button = this.container.getElementsByClassName(this.getClassName(type))[0];

        if (interactive.isActive) {
            this.manager.disable([type]);
            button.addClass("is-hidden");
        }
        else {
            this.manager.enable(type);
            button.removeClass("is-hidden");
        }
    }
}

export class LegendUI extends Component {
    viewContent: HTMLElement;
    graph: Graph;
    leaf: WorkspaceLeaf;
    legendRows: Map<string, LegendRow>;

    constructor(graphicsManager: Graph, leaf: WorkspaceLeaf) {
        super();
        this.graph = graphicsManager;
        this.leaf = leaf;
        this.viewContent = this.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
    }

    onload(): void {
        this.legendRows = new Map<string, LegendRow>();
        let legend = this.viewContent.createDiv();
        legend?.addClass("graph-legend-container");
        for (const name of ["tag", "relationship"]) {
            const manager = this.graph.interactiveManagers.get(name);
            (manager) && this.legendRows.set(name, new LegendRow(name, manager, legend));
        }
    }

    onunload(): void {
        
    }

    updateLegend(row: string, type: string, color: Uint8Array) {
        this.legendRows.get(row)?.updateLegend(type, color);
    }

    addLegend(row: string, type: string, color: Uint8Array) {
        this.legendRows.get(row)?.addLegend(type, color);
    }

    removeLegend(row: string, types: string[]) {
        this.legendRows.get(row)?.removeLegend(types);
    }

    toggle(row: string, type: string) {
        this.legendRows.get(row)?.toggle(type);
    }
}