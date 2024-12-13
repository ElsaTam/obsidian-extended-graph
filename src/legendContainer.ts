import { Component, WorkspaceLeaf } from "obsidian";
import { Graph } from "./graph";
import { InteractiveManager } from "./interactiveManager";

class LegendContainer {
    name: string;
    container: Element;
    cssColorVariable: string;
    manager: InteractiveManager;

    constructor(name: string, manager: InteractiveManager, root: Element) {
        this.name = name;
        this.manager = manager;
        this.container = root.createDiv();
        this.container.addClass(`legend-container`);
        this.container.addClass(`legend-${name}s-container`);
        this.cssColorVariable = "--legend-color-rgb";

        
        let title = this.container.createSpan();
        title.innerText = this.name + "s";
        title.addClass("legend-title");
    }

    private getClassName(type: string) : string {
        return "legend-" + type;
    }

    addLegend(type: string, color: Uint8Array) : void {
        if (!this.container.getElementsByClassName(this.getClassName(type))[0]) {
            let button = this.container.createEl("button");
            button.addClasses([this.getClassName(type), "legend"]);
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
            this.manager.disable(type);
            button.addClass("is-hidden");
        }
        else {
            this.manager.enable(type);
            button.removeClass("is-hidden");
        }
    }
}

export class Legend extends Component {
    viewContent: HTMLElement;
    graph: Graph;
    leaf: WorkspaceLeaf;
    legendContainers: Map<string, LegendContainer>;

    constructor(graphicsManager: Graph, leaf: WorkspaceLeaf) {
        super();
        this.graph = graphicsManager;
        this.leaf = leaf;
        this.legendContainers = new Map<string, LegendContainer>();
        this.viewContent = this.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        this.createLegendElement();
    }

    onload(): void {
        
    }

    onunload(): void {
        
    }


    createLegendElement() {
        let legend = this.viewContent.createDiv();
        legend?.addClass("legend-graph");
        for (const name of ["tag", "relationship"]) {
            const manager = this.graph.interactiveManagers.get(name);
            (manager) && this.legendContainers.set(name, new LegendContainer(name, manager, legend));
        }
    }

    updateLegend(name: string, type: string, color: Uint8Array) {
        this.legendContainers.get(name)?.updateLegend(type, color);
    }

    addLegend(name: string, type: string, color: Uint8Array) {
        this.legendContainers.get(name)?.addLegend(type, color);
    }

    removeLegend(name: string, types: string[]) {
        this.legendContainers.get(name)?.removeLegend(types);
    }

    toggle(name: string, type: string) {
        this.legendContainers.get(name)?.toggle(type);
    }
}