/**
 * Code from SkepticMystic
 * https://github.com/SkepticMystic/graph-analysis
 * 
 * Released under the GNU General Public License v3.0
 */

import { GraphologyGraph, LinkStat, LinkStatCalculator } from "../../internal";
import { Attributes, EdgeEntry } from "graphology-types";

export class OverlapCalculator extends LinkStatCalculator {
    cache: { [source: string]: { [target: string]: number } } = {};

    constructor(stat: LinkStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "Overlap", graphologyGraph);
    }

    protected override async getStat(link: EdgeEntry<Attributes, Attributes>): Promise<number> {
        if (link.source in this.cache) {
            return this.cache[link.source][link.target];
        }

        const graphologyGraph = this.graphologyGraph;
        const g = graphologyGraph?.graphology;
        if (!g) return NaN;

        const neighborsSource = g.neighbors(link.source);
        const results: Record<string, number> = {};
        g.forEachNode((target) => {
            const neighborsTarget = g.neighbors(target);
            const neighborsCommon = graphologyGraph.intersection(neighborsSource, neighborsTarget);

            let measure =
                neighborsSource.length !== 0 && neighborsTarget.length !== 0
                    ? // The square weights the final result by the number of nodes in the overlap
                    neighborsCommon.length ** 2 / Math.min(neighborsSource.length, neighborsTarget.length)
                    : Infinity;

            results[target] = measure;
        });
        this.cache[link.source] = results;

        return results[link.target]
    }
}