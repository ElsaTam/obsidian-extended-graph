/**
 * Code from SkepticMystic
 * https://github.com/SkepticMystic/graph-analysis
 * 
 * Released under the GNU General Public License v3.0
 */

import { GraphologyGraph, LinkStat, LinkStatCalculator } from "../../internal";
import { Attributes, EdgeEntry } from "graphology-types";

export class JaccardCalculator extends LinkStatCalculator {
    cache: { [source: string]: { [target: string]: number } } = {};

    constructor(stat: LinkStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "Jaccard", graphologyGraph);
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
            const denom = neighborsSource.length + neighborsTarget.length - neighborsCommon.length;
            let measure = denom !== 0 ? neighborsCommon.length / denom : Infinity;

            results[target] = measure;
        });
        this.cache[link.source] = results;

        return results[link.target];
    }
}