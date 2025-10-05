import { Component, View, WorkspaceLeaf } from "obsidian";
import { ExtendedGraphInstances, isGraphBannerView } from "../internal";
import { LocalGraphView } from "obsidian-typings";

export class LeavesManager extends Component {
    syncWithLeaves(leaves: WorkspaceLeaf[]): void {
        const currentActiveLeavesID = leaves.map(l => l.id);
        const localLeaf = leaves.find(l =>
            l.view.getViewType() === "localgraph"
            && (l.view instanceof View)
            && !l.isDeferred
            && !isGraphBannerView(l.view as LocalGraphView));

        ExtendedGraphInstances.graphsManager.graphLeavesManager.localGraphID = localLeaf ? localLeaf.id : null;

        // Remove dispatchers from closed leaves
        const allInstancesIDs = [...ExtendedGraphInstances.graphsManager.allInstances.keys()];
        for (const leafID of allInstancesIDs) {
            if (!currentActiveLeavesID.includes(leafID)) {
                ExtendedGraphInstances.graphsManager.lifecycleManager.disablePluginFromLeafID(leafID);
            }
        }

        // Remove options backups, but keep one
        const optionsBackupIDs = [...ExtendedGraphInstances.graphsManager.optionsBackup.keys()];
        for (const leafID of optionsBackupIDs) {
            if (!currentActiveLeavesID.includes(leafID) && ExtendedGraphInstances.graphsManager.lastBackup !== leafID) {
                ExtendedGraphInstances.graphsManager.optionsBackup.delete(leafID);
            }
        }

        // Remove UI from closed leaves
        const globalUIsIDs = [...ExtendedGraphInstances.graphsManager.graphLeavesManager.globalUIs.keys()];
        for (const leafID of globalUIsIDs) {
            if (!currentActiveLeavesID.includes(leafID)) {
                ExtendedGraphInstances.graphsManager.graphLeavesManager.globalUIs.delete(leafID);
            }
        }

        // Focus
        ExtendedGraphInstances.graphsManager.fileLeavesManager.computeOpenNodes();
        ExtendedGraphInstances.graphsManager.searchLeavesManager.observeSearchViews();
    }
}