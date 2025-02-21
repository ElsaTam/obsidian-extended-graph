import { Component, WorkspaceLeaf } from "obsidian";
import { GraphView, LocalGraphView } from "obsidian-typings";
import { GCOptions, GraphInstances } from "src/internal";

export class GraphControlsUI extends Component {
    instances: GraphInstances | null;
    view: GraphView | LocalGraphView;

    graphControls: HTMLElement;

    // Sections
    sectionSettings: GCOptions;
    
    constructor(view: GraphView | LocalGraphView) {
        super();
        this.view = view;
        this.graphControls = view.containerEl.querySelector(".graph-controls") as HTMLElement;
        this.sectionSettings = new GCOptions(view);
    }

    onPluginEnabled(instances: GraphInstances): void {
        this.instances = instances;
        this.sectionSettings.onPluginEnabled(instances);
    }

    onPluginDisabled(): void {
        this.sectionSettings.onPluginDisabled();
    }
}