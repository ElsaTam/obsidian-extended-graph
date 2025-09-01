import { Attributes } from "graphology-types";
import { getFile, GraphologyGraph, NodeStat, NodeStatCalculator, ExtendedGraphInstances, GraphStatsDirection } from "../../internal";

export class BacklinkCountCalculator extends NodeStatCalculator {
    countDuplicates: boolean;

    constructor(stat: NodeStat, countDuplicates: boolean, graphologyGraph?: GraphologyGraph) {
        super(stat, "backlinksCount", graphologyGraph);
        this.countDuplicates = countDuplicates;
    }

    override async getStat(id: string, direction: GraphStatsDirection): Promise<number> {
        if (this.graphologyGraph?.graphology) {
            if (this.countDuplicates) {
                return this.graphologyGraph.graphology.reduceInEdges(id, (acc: number, edge: string, attr: Attributes) => {
                    return acc + (attr["count"] ?? 0);
                }, 0);
            }
            else {
                return this.graphologyGraph.graphology.inDegree(id);
            }
        }

        const resolvedCounts = Object.values(ExtendedGraphInstances.app.metadataCache.resolvedLinks).reduce(
            (acc: number[], value: Record<string, number>) => {
                if (id in value) {
                    acc.push(value[id]);
                }
                return acc;
            },
            []
        );
        const unresolvedCounts = Object.values(ExtendedGraphInstances.app.metadataCache.unresolvedLinks).reduce(
            (acc: number[], value: Record<string, number>) => {
                if (id in value) {
                    acc.push(value[id]);
                }
                return acc;
            },
            []
        );
        const links = resolvedCounts.concat(unresolvedCounts);
        if (!links) {
            return 0;
        }
        if (this.countDuplicates) {
            return links.reduce((a: number, b: number) => a + b, 0);
        }
        return links.length;
    }
}

export class ForwardlinkCountCalculator extends NodeStatCalculator {
    countDuplicates: boolean;

    constructor(stat: NodeStat, countDuplicates: boolean, graphologyGraph?: GraphologyGraph) {
        super(stat, countDuplicates ? "forwardlinksCount" : "forwardUniquelinksCount", graphologyGraph);
        this.countDuplicates = countDuplicates;
    }

    override async getStat(id: string): Promise<number> {
        if (this.graphologyGraph?.graphology) {
            if (this.countDuplicates) {
                return this.graphologyGraph.graphology.reduceOutEdges(id, (acc: number, edge: string, attr: Attributes) => {
                    return acc + (attr["count"] ?? 0);
                }, 0);
            }
            else {
                return this.graphologyGraph.graphology.outDegree(id);
            }
        }

        const links = Object.fromEntries(
            (id in ExtendedGraphInstances.app.metadataCache.resolvedLinks ? Object.entries(ExtendedGraphInstances.app.metadataCache.resolvedLinks[id]) : [])
                .concat(
                    (id in ExtendedGraphInstances.app.metadataCache.unresolvedLinks ? Object.entries(ExtendedGraphInstances.app.metadataCache.unresolvedLinks[id]) : [])
                )
        );
        if (!links) {
            return 0;
        }
        if (this.countDuplicates) {
            return Object.values(links).reduce((a: number, b: number, i: number, arr: number[]) => a + b, 0);
        }
        return Object.keys(links).length;
    }
}

export class TotallinkCountCalculator extends NodeStatCalculator {
    countDuplicates: boolean;

    constructor(stat: NodeStat, countDuplicates: boolean, graphologyGraph?: GraphologyGraph) {
        super(stat, countDuplicates ? "totallinksCount" : "totalUniquelinksCount", graphologyGraph);
        this.countDuplicates = countDuplicates;
    }

    override async getStat(id: string): Promise<number> {
        if (this.graphologyGraph?.graphology) {
            if (this.countDuplicates) {
                return this.graphologyGraph.graphology.reduceEdges(id, (acc: number, edge: string, attr: Attributes) => {
                    return acc + (attr["count"] ?? 0);
                }, 0);
            }
            else {
                return this.graphologyGraph.graphology.degree(id);
            }
        }

        const resolvedCounts = Object.entries(ExtendedGraphInstances.app.metadataCache.resolvedLinks).reduce(
            (acc: number[], value: [string, Record<string, number>]) => {
                if (id === value[0]) {
                    acc = acc.concat(Object.values(value[1]));
                }
                else if (id in value[1]) {
                    acc.push(value[1][id]);
                }
                return acc;
            },
            []
        );
        const unresolvedCounts = Object.entries(ExtendedGraphInstances.app.metadataCache.unresolvedLinks).reduce(
            (acc: number[], value: [string, Record<string, number>]) => {
                if (id === value[0]) {
                    acc = acc.concat(Object.values(value[1]));
                }
                else if (id in value[1]) {
                    acc.push(value[1][id]);
                }
                return acc;
            },
            []
        );
        const links = resolvedCounts.concat(unresolvedCounts);
        if (!links) {
            return 0;
        }
        if (this.countDuplicates) {
            return links.reduce((a: number, b: number) => a + b, 0);
        }
        return links.length;
    }
}