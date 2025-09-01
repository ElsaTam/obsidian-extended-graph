/**
 * Code from SkepticMystic
 * https://github.com/SkepticMystic/graph-analysis
 * 
 * Released under the GNU General Public License v3.0
 */

import { GraphologyGraph, LinkStat, LinkStatCalculator } from "../../internal";
import { Attributes, EdgeEntry } from "graphology-types";

export class ClusteringCoefficientCalculator extends LinkStatCalculator {
    cache: { [source: string]: { [target: string]: number } } = {};

    constructor(stat: LinkStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "Clustering Coefficient", graphologyGraph);
    }

    protected override async getStat(link: EdgeEntry<Attributes, Attributes>): Promise<number> {
        if (link.source in this.cache) {
            return this.cache[link.source][link.target];
        }

        const graphologyGraph = this.graphologyGraph;
        const g = graphologyGraph?.graphology;
        if (!g) return NaN;

        const results: Record<string, number> = {};
        g.forEachNode((target) => {
            const triangles: [string, string][] = [];
            g.neighbors(target).forEach((v) => {
                g.neighbors(v).forEach((w) => {
                    if (g.hasEdge(target, v) && g.hasEdge(target, w) && g.hasEdge(v, w)) {
                        triangles.push([v, w]);
                    }
                });
            });

            const deg = (g.neighbors(target) as string[]).length;
            const coeff = (deg === 0 || deg === 1) ? 0 : (2 * triangles.length) / (deg * (deg - 1));

            results[target] = coeff;
        });
        this.cache[link.source] = results;

        return results[link.target];
    }
}