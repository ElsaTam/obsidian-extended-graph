import { Component, Notice } from "obsidian";
import { ExtendedGraphInstances, getNLPPlugin, GraphInstances, LinksStatCalculatorFactory, LinkStat, LinkStatCalculator, linkStatFunctionLabels, linkStatFunctionNeedsNLP, NodeStatCalculator, NodeStatCalculatorFactory, nodeStatFunctionLabels, SettingQuery, t } from "../internal";

export class VaultStatsManager extends Component {

    nodesSizeCalculator: NodeStatCalculator | undefined;
    nodesColorCalculator: NodeStatCalculator | undefined;
    linksSizeCalculator: LinkStatCalculator | undefined;
    linksColorCalculator: LinkStatCalculator | undefined;


    initializeCalculators(instances: GraphInstances) {
        if (ExtendedGraphInstances.settings.enableFeatures[instances.type]["elements-stats"]) {
            if (this.nodesSizeCalculator?.functionKey !== ExtendedGraphInstances.settings.nodesSizeFunction
                && !SettingQuery.needDynamicGraphology(instances, { element: "node", stat: "size" })
            ) {
                this.initializeNodesSizeCalculator();
            }
            if (this.nodesColorCalculator?.functionKey !== ExtendedGraphInstances.settings.nodesColorFunction
                && !SettingQuery.needDynamicGraphology(instances, { element: "node", stat: "color" })
            ) {
                this.initializeNodesColorCalculator();
            }
            if (this.linksSizeCalculator?.functionKey !== ExtendedGraphInstances.settings.linksSizeFunction
                && !SettingQuery.needDynamicGraphology(instances, { element: "link", stat: "size" })
            ) {
                this.initializeLinksSizeCalculator();
            }
            if (this.linksColorCalculator?.functionKey !== ExtendedGraphInstances.settings.linksColorFunction
                && !SettingQuery.needDynamicGraphology(instances, { element: "link", stat: "color" })
            ) {
                this.initializeLinksColorCalculator();
            }
        }
    }


    private canUseLinkStatFunction(stat: LinkStat): boolean {
        const fn = stat === 'color' ? ExtendedGraphInstances.settings.linksColorFunction : ExtendedGraphInstances.settings.linksSizeFunction;

        if (!getNLPPlugin() && linkStatFunctionNeedsNLP[fn]) {
            new Notice(`${t("notices.nlpPluginRequired")} (${fn})`);
            if (stat === 'color') {
                this.linksColorCalculator = undefined;
                ExtendedGraphInstances.settings.linksColorFunction = 'default';
            }
            else {
                this.linksSizeCalculator = undefined;
                ExtendedGraphInstances.settings.linksSizeFunction = 'default';
            }
            ExtendedGraphInstances.plugin.saveSettings();
            return false;
        }
        return true;
    }

    initializeNodesSizeCalculator(): void {
        this.nodesSizeCalculator = NodeStatCalculatorFactory.getCalculator('size');
        this.nodesSizeCalculator?.computeStats(ExtendedGraphInstances.settings.graphStatsDirection).catch((error) => {
            console.error(error);
            new Notice(`${t("notices.nodeStatSizeFailed")} (${nodeStatFunctionLabels[ExtendedGraphInstances.settings.nodesSizeFunction]}). ${t("notices.functionToDefault")}`);
            ExtendedGraphInstances.settings.nodesSizeFunction = 'default';
            ExtendedGraphInstances.plugin.saveSettings();
            this.nodesSizeCalculator = undefined;
        });
    }

    initializeNodesColorCalculator(): void {
        this.nodesColorCalculator = NodeStatCalculatorFactory.getCalculator('color');
        this.nodesColorCalculator?.computeStats(ExtendedGraphInstances.settings.graphStatsDirection).catch((error) => {
            console.error(error);
            new Notice(`${t("notices.nodeStatColorFailed")} (${nodeStatFunctionLabels[ExtendedGraphInstances.settings.nodesColorFunction]}). ${t("notices.functionToDefault")}`);
            ExtendedGraphInstances.settings.nodesColorFunction = 'default';
            ExtendedGraphInstances.plugin.saveSettings();
            this.nodesColorCalculator = undefined;
        });
    }

    initializeLinksSizeCalculator(): void {
        if (this.canUseLinkStatFunction('size')) {
            this.linksSizeCalculator = LinksStatCalculatorFactory.getCalculator('size');
            this.linksSizeCalculator?.computeStats(ExtendedGraphInstances.settings.graphStatsDirection).catch((error) => {
                console.error(error);
                ExtendedGraphInstances.settings.linksSizeFunction = 'default';
                ExtendedGraphInstances.plugin.saveSettings();
                new Notice(`${t("notices.linkStatSizeFailed")} (${linkStatFunctionLabels[ExtendedGraphInstances.settings.linksSizeFunction]}). ${t("notices.functionToDefault")}`);
                this.linksSizeCalculator = undefined;
            });
        }
    }

    initializeLinksColorCalculator(): void {
        if (this.canUseLinkStatFunction('color')) {
            this.linksColorCalculator = LinksStatCalculatorFactory.getCalculator('color');
            this.linksColorCalculator?.computeStats(ExtendedGraphInstances.settings.graphStatsDirection).catch((error) => {
                console.error(error);
                ExtendedGraphInstances.settings.linksColorFunction = 'default';
                ExtendedGraphInstances.plugin.saveSettings();
                new Notice(`${t("notices.linkStatColorFailed")} (${linkStatFunctionLabels[ExtendedGraphInstances.settings.linksColorFunction]}). ${t("notices.functionToDefault")}`);
                this.linksColorCalculator = undefined;
            });
        }
    }

    // ================================= STATS =================================

    updateSizeFunctionForNodesStat(): void {
        for (const [leafID, instances] of ExtendedGraphInstances.graphsManager.allInstances) {
            instances.settings.nodesSizeFunction = ExtendedGraphInstances.settings.nodesSizeFunction;
            instances.renderer.changed();
        }
    }

    updatePaletteForNodesStat(): void {
        for (const [leafID, instances] of ExtendedGraphInstances.graphsManager.allInstances) {
            instances.settings.nodesColorFunction = ExtendedGraphInstances.settings.nodesColorFunction;
            instances.renderer.changed();
        }
    }

    updateSizeFunctionForLinksStat(): void {
        for (const [leafID, instances] of ExtendedGraphInstances.graphsManager.allInstances) {
            if (!instances.settings.curvedLinks) {
                for (const [id, extendedLink] of instances.linksSet.extendedElementsMap) {
                    extendedLink.changeCoreLinkThickness();
                }
            }
            instances.renderer.changed();
        }
    }

    updatePaletteForLinksStat(): void {
        for (const [leafID, instances] of ExtendedGraphInstances.graphsManager.allInstances) {
            for (const [id, extendedLink] of instances.linksSet.extendedElementsMap) {
                extendedLink.graphicsWrapper?.updateGraphics();
            }
            instances.renderer.changed();
        }
    }
}