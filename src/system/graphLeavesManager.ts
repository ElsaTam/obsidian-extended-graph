import { Component, WorkspaceLeaf } from "obsidian";
import { GraphView, LocalGraphView } from "obsidian-typings";
import { ExtendedGraphInstances, getGraphView, GraphControlsUI, MenuUI } from "../internal";

export class GraphLeavesManager extends Component {

    globalUIs: Map<string, { menu: MenuUI, control: GraphControlsUI }> = new Map();
    localGraphID: string | null = null;

    // =============================== GLOBAL UI ===============================

    setGlobalUI(view: GraphView | LocalGraphView): { menu: MenuUI, control: GraphControlsUI } {
        let globalUI = this.globalUIs.get(view.leaf.id);

        if (globalUI && globalUI.menu.view === view && globalUI.control.view === view) return globalUI;

        const menuUI = new MenuUI(view);
        view.addChild(menuUI);

        const controlsUI = new GraphControlsUI(view);
        controlsUI.onPluginDisabled();
        view.addChild(controlsUI);

        globalUI = { menu: menuUI, control: controlsUI };
        this.globalUIs.set(view.leaf.id, globalUI);
        return globalUI;
    }

    disableUI(leafID: string) {
        const globalUI = ExtendedGraphInstances.graphsManager.graphLeavesManager.globalUIs.get(leafID);
        if (globalUI) {
            globalUI.menu.disableUI();
            globalUI.menu.setDisableUIState();
            globalUI.control.onPluginDisabled();
        }
    }

    enableUI(leafID: string) {
        this.globalUIs.get(leafID)?.menu.enableUI();
    }

    // ================================ LAYOUT =================================

    initLeaf(leaf: WorkspaceLeaf): void {
        const view = getGraphView(leaf);
        if (!view || view.leaf.isDeferred) return;

        try {
            this.setGlobalUI(view);
        }
        catch (e) {
            // UI not set, probably because the graph is in a closed sidebar
            console.warn("WARNING: could not set global UI.");
            console.warn(e);
        }
        if (ExtendedGraphInstances.graphsManager.lifecycleManager.isPluginAlreadyEnabled(view)) return;

        if (!this.isGlobalGraphAlreadyOpened(view)) {
            ExtendedGraphInstances.graphsManager.backupOptions(view);
        }

        if (ExtendedGraphInstances.settings.enableFeatures[view.getViewType()]['auto-enabled']) {
            ExtendedGraphInstances.graphsManager.lifecycleManager.enablePlugin(view, ExtendedGraphInstances.settings.startingStateID);
        }
    }

    private isGlobalGraphAlreadyOpened(view: GraphView | LocalGraphView): boolean {
        return ExtendedGraphInstances.graphsManager.optionsBackup.has(view.leaf.id) && view.getViewType() === "graph";
    }



}