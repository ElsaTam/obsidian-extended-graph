import { evaluateCMap, GraphologyGraph, ExtendedGraphInstances, t, GraphStatsDirection } from "../../internal";
import { Attributes, EdgeEntry } from "graphology-types";
import { reverse } from "graphology-operators";

export type LinkStatFunction = 'default' | 'Ocurences' | 'Adamic Adar' | 'BoW' | 'Clustering Coefficient' | 'Jaccard' | 'Otsuka-Ochiai' | 'Overlap' | 'Co-Citations';

export const linkStatFunctionLabels: Record<LinkStatFunction, string> = {
    'default': t("plugin.default"),
    'Adamic Adar': t("statsFunctions.AdamicAdar"),
    'BoW': t("statsFunctions.BoW"),
    'Co-Citations': t("statsFunctions.coCitations"),
    'Clustering Coefficient': t("statsFunctions.clusteringCoefficient"),
    'Jaccard': t("statsFunctions.Jaccard"),
    'Ocurences': t("statsFunctions.Occurences"),
    'Otsuka-Ochiai': t("statsFunctions.OtsukaOchiai"),
    'Overlap': t("statsFunctions.overlap"),
};

export const linkStatFunctionNeedsNLP: Record<LinkStatFunction, boolean> = {
    'default': false,
    'Adamic Adar': false,
    'BoW': true,
    'Co-Citations': false,
    'Clustering Coefficient': false,
    'Jaccard': false,
    'Ocurences': false,
    'Otsuka-Ochiai': true,
    'Overlap': false,
};

export const linkStatFunctionIsDynamic: Record<LinkStatFunction, boolean> = {
    'default': false,
    'Adamic Adar': true,
    'BoW': false,
    'Co-Citations': true,
    'Clustering Coefficient': true,
    'Jaccard': true,
    'Ocurences': false,
    'Otsuka-Ochiai': false,
    'Overlap': true,
};

export type LinkStat = 'size' | 'color';

export abstract class LinkStatCalculator {
    linksStats: { [source: string]: { [target: string]: { measure: number, value: number } } };
    stat: LinkStat;
    graphologyGraph?: GraphologyGraph;
    readonly functionKey: LinkStatFunction;

    constructor(stat: LinkStat, statFunction: LinkStatFunction, graphologyGraph?: GraphologyGraph) {
        this.stat = stat;
        this.functionKey = statFunction;
        this.graphologyGraph = graphologyGraph;
    }

    async computeStats(direction: GraphStatsDirection): Promise<void> {
        if (!this.graphologyGraph) {
            if (!ExtendedGraphInstances.graphologyGraph) {
                ExtendedGraphInstances.graphologyGraph = new GraphologyGraph();
            }
            this.graphologyGraph = ExtendedGraphInstances.graphologyGraph;
        }
        this.graphologyGraph.registerListener(async (graph) => {
            await this.getStats(direction);
            this.mapStat();
        }, true);
    }

    private async getStats(direction: GraphStatsDirection): Promise<void> {
        if (!this.graphologyGraph?.graphology) return;
        this.linksStats = {};

        const g = direction === "reversed"
            ? reverse(this.graphologyGraph.graphology)
            : direction === "undirected"
                ? GraphologyGraph.toUndirected(this.graphologyGraph.graphology)
                : this.graphologyGraph.graphology;

        const links = g.edgeEntries();
        for (const link of links) {
            if (!this.linksStats[link.source]) {
                this.linksStats[link.source] = {};
            }
            this.linksStats[link.source][link.target] = {
                measure: await this.getStat(link),
                value: 0
            }
        }
    }

    protected abstract getStat(link: EdgeEntry<Attributes, Attributes>): Promise<number>;

    mapStat(): void {
        switch (this.stat) {
            case 'size':
                this.normalizeValues(0.3, 2);
                this.cleanNanAndInfiniteValues(1);
                break;

            case 'color':
                this.normalizeValues(0, 100);
                this.cleanNanAndInfiniteValues(50);
                Object.entries(this.linksStats).forEach(([source, targets]) => {
                    Object.entries(targets).forEach(([target, { measure, value }]) => {
                        this.linksStats[source][target].value = evaluateCMap(value / 100, ExtendedGraphInstances.settings.linksColorColormap, ExtendedGraphInstances.settings);
                    })
                });
                break;

            default:
                break;
        }
    }

    private normalizeValues(from: number, to: number): void {
        const N = this.getMeasures();
        const min = Math.min(...N);
        const max = Math.max(...N);
        Object.entries(this.linksStats).forEach(([source, targets]) => {
            Object.entries(targets).forEach(([target, { measure, value }]) => {
                this.linksStats[source][target].value = (to - from) * (measure - min) / (max - min) + from;
            })
        });
    }

    private getMeasures(): number[] {
        let N: number[] = [];
        Object.entries(this.linksStats).forEach(([source, targets]) => {
            N = N.concat(Object.values(targets).map(({ measure, value }) => measure));
        });
        return N.filter(n => isFinite(n) && !isNaN(n));
    }

    private cleanNanAndInfiniteValues(defaultValue: number) {
        Object.entries(this.linksStats).forEach(([source, targets]) => {
            Object.entries(targets).forEach(([target, { measure, value }]) => {
                if (!isFinite(value) || isNaN(value)) {
                    this.linksStats[source][target].value = defaultValue;
                }
            })
        });
    }

    getWarning(): string { return ""; }
    getLink(): string { return ""; }
}