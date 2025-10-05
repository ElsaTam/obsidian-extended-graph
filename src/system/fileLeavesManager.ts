import { Component, MarkdownView, TFile, WorkspaceLeaf } from "obsidian";
import { ExtendedGraphInstances, getGraphBannerClass, getGraphBannerPlugin } from "../internal";
import { LocalGraphView } from "obsidian-typings";

export class FileLeavesManager extends Component {
    openNodes: string[] = [];
    isHandlingMarkdownViewChange: boolean = false;

    override onload(): void {
        this.registerEvents();
    }

    private registerEvents() {
        this.onActiveLeafChange = this.onActiveLeafChange.bind(this);
        this.registerEvent(ExtendedGraphInstances.app.workspace.on('active-leaf-change', (leaf) => {
            if (!ExtendedGraphInstances.graphsManager.isCoreGraphLoaded()) return;
            this.onActiveLeafChange(leaf);
        }));

        this.onFileOpen = this.onFileOpen.bind(this);
        this.registerEvent(ExtendedGraphInstances.app.workspace.on('file-open', (file) => {
            if (!ExtendedGraphInstances.graphsManager.isCoreGraphLoaded()) return;
            this.onFileOpen(file);
        }));
    }

    // ===================== CHANGE CURRENT MARKDOWN FILE ======================

    onActiveLeafChange(leaf: WorkspaceLeaf | null) {
        // Change the number of nodes in the status bar
        ExtendedGraphInstances.graphsManager.updateStatusBarItem(leaf);
    }

    private onFileOpen(file: TFile | null): void {
        if (this.isHandlingMarkdownViewChange) return;
        this.isHandlingMarkdownViewChange = true;

        ExtendedGraphInstances.graphsManager.lifecycleManager.changeLocalGraph();

        if (file) {
            const graphBannerPlugin = getGraphBannerPlugin();
            if (graphBannerPlugin) {
                // If there is a Graph Banner plugin graph, center it on the correct node.
                // It's not working perfectly, I think the Graph Banner plugin does its part after this piece of code,
                // which means that nodes get a new position after the zooming.
                const leaves = ExtendedGraphInstances.app.workspace.getLeavesOfType('markdown').filter(leaf => leaf.view instanceof MarkdownView && (leaf.view as MarkdownView).file === file);
                for (const leaf of leaves) {
                    if (!(leaf.view instanceof MarkdownView)) continue;
                    const view = leaf.view as MarkdownView;
                    const graphBannerView = getGraphBannerPlugin()?.graphViews.find(el => el.node === view.contentEl.querySelector(`.${getGraphBannerClass()}`))?.leaf.view;
                    if (graphBannerView && ExtendedGraphInstances.graphsManager.allInstances.get(graphBannerView.leaf.id)) {
                        const graphBannerViewTyped = graphBannerView as LocalGraphView;
                        ExtendedGraphInstances.graphsManager.zoomOnNode(graphBannerViewTyped, file.path, graphBannerViewTyped.renderer.targetScale);
                    }
                }
            }
        }
        this.isHandlingMarkdownViewChange = false;
    }

    // ================================= FOCUS =================================

    computeOpenNodes(): void {
        // Find out which nodes are opened
        const newOpenNodes: string[] = [];
        ExtendedGraphInstances.app.workspace.iterateAllLeaves((leaf) => {
            if (("state" in leaf.view) && (typeof leaf.view.state === "object") && (leaf.view.state) && ("file" in leaf.view.state) && (typeof leaf.view.state.file === "string")) {
                newOpenNodes.push(leaf.view.state.file);
            }
            else if ("file" in leaf.view && leaf.view.file instanceof TFile) {
                newOpenNodes.push(leaf.view.file.path);
            }
        });

        // Update the nodes accordingly
        const nodesRemoved = this.openNodes.filter(id => !newOpenNodes.contains(id));
        const nodesAdded = newOpenNodes.filter(id => !this.openNodes.contains(id));
        if (nodesRemoved.length > 0 || nodesAdded.length > 0) {
            for (const instances of ExtendedGraphInstances.graphsManager.allInstances.values()) {
                if (!instances.settings.enableFeatures[instances.type].focus || !instances.settings.highlightOpenNodes)
                    continue;
                let hasChanged = false;
                for (const id of nodesRemoved) {
                    const node = instances.nodesSet.extendedElementsMap.get(id);
                    if (node) {
                        node.toggleOpenInTab(false);
                        hasChanged = true;
                    }
                }
                for (const id of nodesAdded) {
                    const node = instances.nodesSet.extendedElementsMap.get(id);
                    if (node) {
                        node.toggleOpenInTab(true);
                        hasChanged = true;
                    }
                }
                if (hasChanged) {
                    instances.renderer.changed();
                }
            }
        }
        this.openNodes = newOpenNodes;
    }
}