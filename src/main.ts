import { FileView, Plugin, View, WorkspaceLeaf } from 'obsidian';
import { GraphsManager } from './graphsManager';
import { DEFAULT_SETTINGS, ExtendedGraphSettings } from './settings/settings';
import { WorkspaceLeafExt } from './graph/graphEventsDispatcher';
import { ExtendedGraphSettingTab } from './settings/settingTab';

// https://pixijs.download/v7.4.2/docs/index.html

export default class GraphExtendedPlugin extends Plugin {
    settings: ExtendedGraphSettings;
    graphsManager: GraphsManager;
    waitingTime: number = 0;

    async onload(): Promise<void> {
        await this.loadSettings();

        this.addSettingTab(new ExtendedGraphSettingTab(this.app, this));

        this.graphsManager = new GraphsManager(this);
        this.addChild(this.graphsManager);
        this.graphsManager.load();

        this.registerEvent(this.app.workspace.on('layout-change', () => {
            this.onLayoutChange();
        }));
        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            this.graphsManager.onActiveLeafChange(leaf);
        }));


        // @ts-ignore
        this.registerEvent(this.app.workspace.on('extended-graph:settings-colorpalette-changed', (interactive: string) => {
            this.graphsManager.updatePalette(interactive);
        }));
        // @ts-ignore
        this.registerEvent(this.app.workspace.on('extended-graph:settings-tag-color-changed', (type: string) => {
            this.graphsManager.updatePalette("tag");
        }));
        // @ts-ignore
        this.registerEvent(this.app.workspace.on('extended-graph:settings-link-color-changed', (type: string) => {
            this.graphsManager.updatePalette("link");
        }));
    }

    /*
    private test() {
        const viewData = this.settings.views.find(v => v.id === "ae37347a-ab54-4c73-8dd6-0b1eec0e5f92");
        let graph = this.app.internalPlugins.getPluginById("graph")?.instance;
        if (viewData && graph) {
            graph.options.colorGroups = viewData.engineOptions.colorGroups;
            graph.options.search = viewData.engineOptions.search;
            graph.options.hideUnresolved = viewData.engineOptions.hideUnresolved;
            graph.options.showAttachments = viewData.engineOptions.showAttachments;
            graph.options.showOrphans = viewData.engineOptions.showOrphans;
            graph.options.showTags = viewData.engineOptions.showTags;
            graph.options.localBacklinks = viewData.engineOptions.localBacklinks;
            graph.options.localForelinks = viewData.engineOptions.localForelinks;
            graph.options.localInterlinks = viewData.engineOptions.localInterlinks;
            graph.options.localJumps = viewData.engineOptions.localJumps;
            graph.options.lineSizeMultiplier = viewData.engineOptions.lineSizeMultiplier;
            graph.options.nodeSizeMultiplier = viewData.engineOptions.nodeSizeMultiplier;
            graph.options.showArrow = viewData.engineOptions.showArrow;
            graph.options.textFadeMultiplier = viewData.engineOptions.textFadeMultiplier;
            graph.options.centerStrength = viewData.engineOptions.centerStrength;
            graph.options.linkDistance = viewData.engineOptions.linkDistance;
            graph.options.linkStrength = viewData.engineOptions.linkStrength;
            graph.options.repelStrength = viewData.engineOptions.repelStrength;

            setTimeout(() => {
                // Compute links and nodes to show
                let links = [
                    ["Lewis Hunter.md", "Ruth Shaw.md"],
                    ["Lewis Hunter.md", "Subfolder/Jensen Cole.md"]
                ];
                let nodes = {
                    "Lewis Hunter.md": [-40, -40],
                    "Ruth Shaw.md": [40, 40],
                    "Subfolder/Jensen Cole.md": [40, -40]
                }

                // Open the graph, which will create the engine
                const split = false;
                graph.openGraphView(split);

                // Get the engine
                let view = this.app.workspace.getLeavesOfType("graph")[0].view;
                let engine = view.dataEngine;
                let renderer = view.renderer;

                // Hijack the search.getValue() function
                //engine.filterOptions.search.getValue = (function() {
                //    let append = "";
                //    for (const node in nodes) {
                //        append += ` path:"${node}"`;
                //    }
                //    return engine.filterOptions.search.inputEl.value + append;
                //});

                // Remove nodes graphics
                let nodesToRemove = renderer.nodes.filter(node => !Object.keys(nodes).includes(node.id));
                for (let node of nodesToRemove) {
                    node.clearGraphics();
                    renderer.nodes.remove(node);
                }

                // Remove links graphics
                let linksToRemove = renderer.links.filter(link => !(links.filter(l => (l[0] === link.source.id) && l[1] === link.target.id).length > 0));
                for (let link of linksToRemove) {
                    link.clearGraphics();
                    renderer.links.remove(link);
                    (link.source) && delete link.source.forward[link.target.id];
                    (link.target) && delete link.target.reverse[link.source.id];
                }

                // call postMessage on worker to also send the filtered links
                renderer.worker.postMessage({
                    nodes: nodes,
                    links: links,
                    alpha: .3,
                    run: !0
                });

                // Add back in Marley Mills
                let node = nodesToRemove.find(node => node.id === "Subfolder/Marley Mills.md");
                node.initGraphics();
                renderer.nodes.push(node);
                nodes["Subfolder/Marley Mills.md"] = [-40, 40];

                // call postMessage on worker to also send the filtered links
                renderer.worker.postMessage({
                    nodes: nodes,
                    links: links,
                    alpha: .3,
                    run: !0
                });
            }, 1000)
        }
    }
    */

    onunload() {
        //let view = this.app.workspace.getLeavesOfType("graph")[0].view;
        //let engine = view.dataEngine;
        //engine.filterOptions.search.getValue = (function() {
        //    return this.filterOptions.search.inputEl.value;
        //}).bind(this.engine);
        //console.log("unloaded");
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
    
    async onLayoutChange() {
        // Restart the research
        this.waitingTime = 0;

        // Check if a renderer (a graph) is active
        this.waitForRenderer().then(found => {
            if (found) {
                const leaves = this.getAllGraphLeaves();
                this.graphsManager.syncWithLeaves(leaves);
                leaves.forEach(leaf => {
                    this.graphsManager.onNewLeafOpen(leaf as WorkspaceLeafExt);
                });
            }
            else {
                this.graphsManager.syncWithLeaves([]);
            }
        }).catch(e => {
            console.error(e);
        });
    }
    
    waitForRenderer(): Promise<boolean> {
        return new Promise((resolve) => {
            const intervalId = setInterval(() => {
                this.waitingTime += 200;
                if (this.isGraphOpen()) {
                    this.waitingTime = 0;
                    clearInterval(intervalId);
                    resolve(true);
                }
                else if (this.waitingTime > 500) {
                    this.waitingTime = 0;
                    clearInterval(intervalId);
                    resolve(false)
                }
            }, 100);
        });
    }

    isGraphOpen() : boolean {
        if (this.app.workspace.getLeavesOfType('graph').find(l => (l.view instanceof View) && this.hasObsidianRenderer((l)))) return true;
        if (this.app.workspace.getLeavesOfType('localgraph').find(l => (l.view instanceof View) && this.hasObsidianRenderer(l))) return true;
        return false;
    }

    getAllGraphLeaves() : WorkspaceLeaf[] {
        let leaves: WorkspaceLeaf[] = [];
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('graph').filter(l => (l.view instanceof View) && this.hasObsidianRenderer(l)));
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('localgraph').filter(l => (l.view instanceof View) && this.hasObsidianRenderer(l)));
        return leaves;
    }

    private hasObsidianRenderer(leaf: WorkspaceLeaf) : boolean {
        const renderer = (leaf as WorkspaceLeafExt).view.renderer;
        return renderer 
            && renderer.px 
            && renderer.px.stage 
            && (renderer.panX !== undefined)
            && (renderer.panY !== undefined)
            && typeof renderer.px.stage.addChild === 'function' 
            && typeof renderer.px.stage.removeChild === 'function'
            && Array.isArray(renderer.links);
    }
}

