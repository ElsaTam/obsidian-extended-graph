import { Component, setIcon } from "obsidian";
import { GraphEventsDispatcher } from "src/graph/graphEventsDispatcher";
import { InteractiveManager } from "src/graph/interactiveManager";
import GraphExtendedPlugin from "src/main";

class LegendRow {
    name: string;
    container: Element;
    cssBGColorVariable: string;
    cssTextColorVariable: string;
    manager: InteractiveManager;

    constructor(name: string, manager: InteractiveManager, root: Element) {
        this.name = name;
        this.manager = manager;
        this.container = root.createDiv();
        this.container.addClass(`graph-legend-row`);
        this.container.addClass(`graph-legend-${name}s-row`);
        this.cssBGColorVariable = "--legend-color-rgb";
        this.cssTextColorVariable = "--legend-text-color";

        
        let title = this.container.createSpan();
        title.innerText = this.name + "s";
        title.addClass("graph-legend-title");
    }

    private getClassName(type: string): string {
        return "graph-legend-" + type.replace(" ", "-");
    }

    addLegend(type: string, color: Uint8Array): void {
        if (!this.container.getElementsByClassName(this.getClassName(type))[0]) {
            let button = this.container.createEl("button");
            button.addClasses([this.getClassName(type), "graph-legend"]);
            button.setText(type);
            button.addEventListener('click', e => {
                this.toggle(type);
            })
            button.style.setProperty(this.cssBGColorVariable, `${color[0]}, ${color[1]}, ${color[2]}`);
            const textColor = (color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114 > 150) ? "black" : "white";
            button.style.setProperty(this.cssTextColorVariable, textColor);
            if (type === this.manager.settings.noneType[this.name]) {
                button.addClass("graph-legend-none");
            }
        }

        const sortByName = function(a: HTMLButtonElement, b: HTMLButtonElement) {
            return b.className.replace("graph-legend", "").toLowerCase().localeCompare(a.className.replace("graph-legend", "").toLowerCase());
        };
    
        let sortedChildren = Array.from(this.container.getElementsByClassName("graph-legend")).sort(sortByName);
        for (let i = sortedChildren.length-1; i >= 0; i--) {
            this.container.appendChild(sortedChildren[i]);
        }
    }

    updateLegend(type: string, color: Uint8Array): void {
        const button = this.container.getElementsByClassName(this.getClassName(type))[0];
        if (!button) {
            this.addLegend(type, color)
        }
        else {
            (button as HTMLElement).style.setProperty(this.cssBGColorVariable, `${color[0]}, ${color[1]}, ${color[2]}`);
        }
    }

    removeLegend(types: string[]) {
        types.forEach(type => {
            let button = this.container.getElementsByClassName(this.getClassName(type))[0];
            button?.parentNode?.removeChild(button);
        })
    }

    toggle(type: string) {
        const interactive = this.manager.interactives.get(type);
        if (!interactive) return;

        if (interactive.isActive) {
            this.disable(type);
            this.manager.disable([type]);
        }
        else {
            this.enable(type);
            this.manager.enable([type]);
        }
    }

    disable(type: string) {
        let button = this.container.getElementsByClassName(this.getClassName(type))[0];
        if (button) button.addClass("is-hidden");
    }

    enable(type: string) {
        let button = this.container.getElementsByClassName(this.getClassName(type))[0];
        if (button) button.removeClass("is-hidden");
    }
}

export class LegendUI extends Component {
    dispatcher: GraphEventsDispatcher;
    plugin: GraphExtendedPlugin;

    viewContent: HTMLElement;
    legendRows: Map<string, LegendRow>;

    isOpen: boolean;
    
    root: HTMLDivElement;
    toggleDiv: HTMLDivElement;

    constructor(dispatcher: GraphEventsDispatcher) {
        super();
        this.dispatcher = dispatcher;
        this.plugin = dispatcher.graphsManager.plugin;
        this.viewContent = dispatcher.leaf.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
    
        // TOGGLE BUTTON
        let graphControls = this.viewContent.querySelector(".graph-controls") as HTMLDivElement;
        this.toggleDiv = graphControls.createDiv("clickable-icon graph-controls-button mod-legend");
        this.toggleDiv.ariaLabel = "Open legend (tags/links)";
        setIcon(this.toggleDiv, "tags");
        this.toggleDiv.onClickEvent(() => {
            if (this.isOpen) {
                this.close();
            }
            else {
                this.open();
            }
        });

        this.legendRows = new Map<string, LegendRow>();
        this.root = this.viewContent.createDiv();
        this.root?.addClass("graph-legend-container");
        for (const [key, manager] of this.dispatcher.graph.interactiveManagers) {
            (manager) && this.legendRows.set(key, new LegendRow(key, manager, this.root));
        }

        if (this.plugin.settings.collapseLegend) {
            this.close();
        }
        else {
            this.open();
        }
    }

    onunload(): void {
        this.root.parentNode?.removeChild(this.root);
        this.toggleDiv.parentNode?.removeChild(this.toggleDiv);
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

    disable(row: string, type: string) {
        this.legendRows.get(row)?.disable(type);
    }

    enable(row: string, type: string) {
        this.legendRows.get(row)?.enable(type);
    }

    enableAll(row: string) {
        this.legendRows.get(row)?.manager.getTypes().forEach(type => {
            this.legendRows.get(row)?.enable(type);
        })
    }

    open() {
        this.root.removeClass("is-closed");
        this.toggleDiv.addClass("is-active");
        this.isOpen = true;
        this.plugin.settings.collapseLegend = false;
        this.plugin.saveSettings();
    }

    close() {
        this.root.addClass("is-closed");
        this.toggleDiv.removeClass("is-active");
        this.isOpen = false;
        this.plugin.settings.collapseLegend = true;
        this.plugin.saveSettings();
    }
}