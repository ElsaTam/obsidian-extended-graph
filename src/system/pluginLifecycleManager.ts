import { Component, Notice } from "obsidian";
import { GraphView, LocalGraphView, GraphData } from "obsidian-typings";
import { ExtendedGraphInstances, GraphEventsDispatcher, GraphInstances, GraphType, isGraphBannerView, SettingQuery, t } from "../internal";

export class PluginLifecycleManager extends Component {
    isResetting: Map<string, boolean> = new Map();


    isPluginAlreadyEnabled(view: GraphView | LocalGraphView): boolean {
        return ExtendedGraphInstances.graphsManager.allInstances.has(view.leaf.id);
    }

    // ============================= ENABLE PLUGIN =============================

    enablePlugin(view: GraphView | LocalGraphView, stateID?: string, reloadState: boolean = true): void {
        if (!this.isResetting.get(view.leaf.id)) {
            ExtendedGraphInstances.graphsManager.backupOptions(view);
        }

        if (this.isPluginAlreadyEnabled(view)) return;
        if (this.isNodeLimitExceededForView(view)) return;

        const globalUI = ExtendedGraphInstances.graphsManager.graphLeavesManager.setGlobalUI(view);
        globalUI.menu.disableUI();

        const actuallyEnablePlugin = async () => {
            const instances = await this.addGraph(view, stateID ?? ExtendedGraphInstances.settings.startingStateID, reloadState);

            ExtendedGraphInstances.graphsManager.vaultStatsManager.initializeCalculators(instances);

            globalUI.menu.setEnableUIState();
            globalUI.control.onPluginEnabled(instances);
            ExtendedGraphInstances.graphsManager.updateStatusBarItem(view.leaf);
        }


        if (ExtendedGraphInstances.settings.syncDefaultState) {
            ExtendedGraphInstances.statesManager.saveForDefaultState(view).then(() => actuallyEnablePlugin());
        }
        else {
            actuallyEnablePlugin();
        }
    }

    private async addGraph(view: GraphView | LocalGraphView, stateID: string, reloadState: boolean): Promise<GraphInstances> {
        let instances = ExtendedGraphInstances.graphsManager.allInstances.get(view.leaf.id);
        if (instances) return instances;

        instances = new GraphInstances(view);
        ExtendedGraphInstances.graphsManager.allInstances.set(view.leaf.id, instances);
        instances.setState(stateID);
        new GraphEventsDispatcher(instances, reloadState);
        if (stateID) {
            instances.statesUI.setValue(stateID);
        }

        instances.graphEventsDispatcher.load();
        view.addChild(instances.graphEventsDispatcher);

        if (view.getViewType() === "localgraph" && !isGraphBannerView(view)) {
            ExtendedGraphInstances.graphsManager.graphLeavesManager.localGraphID = view.leaf.id;
        }

        return instances;
    }

    isNodeLimitExceededForView(view: GraphView | LocalGraphView): boolean {
        if (view.renderer.nodes.length > ExtendedGraphInstances.settings.maxNodes) {
            new Notice(`${t("notices.nodeLimiteExceeded")} (${view.renderer.nodes.length}). ${t("notices.nodeLimitIs")} ${ExtendedGraphInstances.settings.maxNodes}. ${t("notices.changeInSettings")}.`);
            return true;
        }
        return false;
    }

    isNodeLimitExceededForData(data: GraphData, notice: boolean = true): boolean {
        if (Object.keys(data.nodes).length > ExtendedGraphInstances.settings.maxNodes) {
            if (notice)
                new Notice(`${t("notices.nodeLimiteExceeded")} (${Object.keys(data.nodes).length}). ${t("notices.nodeLimitIs")} ${ExtendedGraphInstances.settings.maxNodes}. ${t("plugin.name")} ${t("notices.disabled")}. ${t("notices.changeInSettings")}.`);
            return true;
        }
        return false;
    }

    onPluginLoaded(view: GraphView | LocalGraphView): void {
        this.isResetting.set(view.leaf.id, false);
        ExtendedGraphInstances.graphsManager.graphLeavesManager.globalUIs.get(view.leaf.id)?.menu.enableUI();

        ExtendedGraphInstances.app.workspace.trigger('extended-graph:enabled-in-view', view);
    }


    // ============================ DISABLE PLUGIN =============================

    disablePlugin(view: GraphView | LocalGraphView): void {
        this.disablePluginFromLeafID(view.leaf.id);
        if (!this.isResetting.get(view.leaf.id)) {
            view.renderer.changed();
        }
    }

    disablePluginFromLeafID(leafID: string) {
        ExtendedGraphInstances.graphsManager.graphLeavesManager.disableUI(leafID);
        this.unloadDispatcher(leafID);
    }

    private unloadDispatcher(leafID: string) {
        const instances = ExtendedGraphInstances.graphsManager.allInstances.get(leafID);
        if (instances) {
            instances.graphEventsDispatcher.unload();
        }
        else {
            ExtendedGraphInstances.graphsManager.graphLeavesManager.enableUI(leafID);
        }
    }

    onPluginUnloaded(view: GraphView | LocalGraphView): void {
        ExtendedGraphInstances.graphsManager.allInstances.delete(view.leaf.id);

        if (ExtendedGraphInstances.graphsManager.graphLeavesManager.localGraphID === view.leaf.id) ExtendedGraphInstances.graphsManager.graphLeavesManager.localGraphID = null;

        if (!this.isResetting.get(view.leaf.id)) {
            if (view._loaded) {
                ExtendedGraphInstances.graphsManager.applyNormalState(view);
            }
            ExtendedGraphInstances.graphsManager.restoreBackupInGraphJson();
            ExtendedGraphInstances.graphsManager.graphLeavesManager.enableUI(view.leaf.id);
        }

        ExtendedGraphInstances.graphsManager.updateStatusBarItem(view.leaf);

        ExtendedGraphInstances.app.workspace.trigger('extended-graph:disabled-in-view', view);
    }

    // ============================= RESET PLUGIN ==============================

    resetAllPlugins(graphtype: GraphType) {
        const views = [...ExtendedGraphInstances.graphsManager.allInstances.values()].filter(i => i.type === graphtype).map(i => i.view);
        for (const view of views) {
            this.resetPlugin(view);
        }
    }

    resetPlugin(view: GraphView | LocalGraphView, reloadState: boolean = true, stateID?: string): void {
        this.isResetting.set(view.leaf.id, true);
        const instances = ExtendedGraphInstances.graphsManager.allInstances.get(view.leaf.id);
        stateID = stateID ?? instances?.stateData?.id;
        const scale = instances?.renderer.targetScale ?? false;
        this.disablePlugin(view);
        this.enablePlugin(view, stateID, reloadState);
        const newDispatcher = ExtendedGraphInstances.graphsManager.allInstances.get(view.leaf.id);
        if (newDispatcher && scale) {
            newDispatcher.renderer.targetScale = scale;
        }
    }

    // ============================== LOCAL GRAPH ==============================

    changeLocalGraph() {
        if (ExtendedGraphInstances.graphsManager.graphLeavesManager.localGraphID) {
            const localInstances = ExtendedGraphInstances.graphsManager.allInstances.get(ExtendedGraphInstances.graphsManager.graphLeavesManager.localGraphID);
            if (localInstances) {
                const instances = ExtendedGraphInstances.graphsManager.allInstances.get(localInstances.view.leaf.id);
                if (instances) {
                    ExtendedGraphInstances.graphsManager.lifecycleManager.isResetting.set(ExtendedGraphInstances.graphsManager.graphLeavesManager.localGraphID, true);
                    instances.graphEventsDispatcher.reloadLocalDispatcher();
                }
            }
        }
    }
}