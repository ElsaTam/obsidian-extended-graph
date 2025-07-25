import { evaluateCMap, GraphologyGraph, PluginInstances, t } from "src/internal";

export type NodeStatFunction = 'default' | 'constant' | 'backlinksCount' | 'forwardlinksCount' | 'forwardUniquelinksCount' | 'filenameLength' | 'tagsCount' | 'creationTime' | 'modifiedTime' | 'betweenness' | 'closeness' | 'eccentricity' | 'degree' | 'eigenvector' | 'hub' | 'sentiment' | 'authority' | 'topological';

export const nodeStatFunctionLabels: Record<NodeStatFunction, string> = {
    'default': t("plugin.default"),
    'constant': t("statsFunctions.constant"),
    'backlinksCount': t("statsFunctions.backlinksCount"),
    'forwardlinksCount': t("statsFunctions.forwardlinksCount"),
    'forwardUniquelinksCount': t("statsFunctions.forwardUniquelinksCount"),
    'filenameLength': t("statsFunctions.filenameLength"),
    'tagsCount': t("statsFunctions.tagsCount"),
    'creationTime': t("statsFunctions.creationTime"),
    'modifiedTime': t("statsFunctions.modifiedTime"),
    'eccentricity': t("statsFunctions.eccentricity"),
    'betweenness': t("statsFunctions.betweenness"),
    'closeness': t("statsFunctions.closeness"),
    'degree': t("statsFunctions.degree"),
    'eigenvector': t("statsFunctions.eigenvector"),
    'hub': t("statsFunctions.hub"),
    'authority': t("statsFunctions.authority"),
    'topological': t("statsFunctions.topological"),
    'sentiment': t("statsFunctions.sentiment"),
}

export const nodeStatFunctionNeedsNLP: Record<NodeStatFunction, boolean> = {
    'default': false,
    'constant': false,
    'backlinksCount': false,
    'forwardlinksCount': false,
    'forwardUniquelinksCount': false,
    'filenameLength': false,
    'tagsCount': false,
    'creationTime': false,
    'modifiedTime': false,
    'eccentricity': false,
    'betweenness': false,
    'closeness': false,
    'degree': false,
    'eigenvector': false,
    'hub': false,
    'authority': false,
    'topological': false,
    'sentiment': true,
}

export const nodeStatFunctionIsDynamic: Record<NodeStatFunction, boolean> = {
    'default': false,
    'constant': false,
    'backlinksCount': true,
    'forwardlinksCount': true,
    'forwardUniquelinksCount': true,
    'filenameLength': false,
    'tagsCount': false,
    'creationTime': false,
    'modifiedTime': false,
    'eccentricity': true,
    'betweenness': true,
    'closeness': true,
    'degree': true,
    'eigenvector': true,
    'hub': true,
    'authority': true,
    'topological': true,
    'sentiment': false,
}

export type NodeStat = 'size' | 'color';

export abstract class NodeStatCalculator {
    readonly functionKey: NodeStatFunction;
    filesStats: Map<string, { measure: number, value: number }>;
    stat: NodeStat;
    graphologyGraph?: GraphologyGraph;

    constructor(stat: NodeStat, functionKey: NodeStatFunction, graphologyGraph?: GraphologyGraph) {
        this.stat = stat;
        this.functionKey = functionKey;
        this.graphologyGraph = graphologyGraph;
    }

    async computeStats(invert: boolean): Promise<void> {
        if (!this.graphologyGraph) {
            if (!PluginInstances.graphologyGraph) {
                PluginInstances.graphologyGraph = new GraphologyGraph();
            }
            this.graphologyGraph = PluginInstances.graphologyGraph;
        }
        this.graphologyGraph.registerListener(async (graph) => {
            await this.getStats(invert);
            this.mapStat();
        }, true);
    }

    protected async getStats(invert: boolean): Promise<void> {
        if (!this.graphologyGraph) return;
        this.filesStats = new Map<string, { measure: number, value: number }>();
        const ids = this.graphologyGraph.graphology?.nodes();
        if (!ids) return;
        for (const id of ids) {
            this.getStat(id, invert).then(size => this.filesStats.set(id, { measure: size, value: 0 }));
        }
    }

    mapStat(): void {
        switch (this.stat) {
            case 'size':
                this.normalizeValues(0.5, 1.5);
                this.cleanNanAndInfiniteValues(1);
                break;

            case 'color':
                this.normalizeValues(0, 100);
                this.cleanNanAndInfiniteValues(50);
                this.filesStats.forEach(({ measure, value }, path) => {
                    this.filesStats.set(path, { measure: measure, value: evaluateCMap(value / 100, PluginInstances.settings.nodesColorColormap, PluginInstances.settings) });
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
        this.filesStats.forEach(({ measure, value }, path) => {
            this.filesStats.set(path, { measure: measure, value: (to - from) * (measure - min) / (max - min) + from });
        });
    }

    private getMeasures(): number[] {
        return [...this.filesStats.values()].map(({ measure, value }) => measure).filter(n => isFinite(n) && !isNaN(n));
    }

    private cleanNanAndInfiniteValues(defaultValue: number) {
        this.filesStats.forEach(({ measure, value }, path) => {
            if (!isFinite(value) || isNaN(value)) {
                this.filesStats.set(path, { measure: measure, value: defaultValue });
            }
        });
    }

    abstract getStat(id: string, invert: boolean): Promise<number>;

    getWarning(): string { return ""; }
    getLink(): string { return ""; }
}