/**
 * Code from SkepticMystic
 * https://github.com/SkepticMystic/graph-analysis
 * 
 * Released under the GNU General Public License v3.0
 */

import { getNLPPlugin, GraphologyGraph, LinkStat, LinkStatCalculator } from "../../internal";
import { Attributes, EdgeEntry } from "graphology-types";
import similarity from "wink-nlp/utilities/similarity";

export class OtsukaOchiaiCalculator extends LinkStatCalculator {
    cache: { [source: string]: { [target: string]: number } } = {};

    constructor(stat: LinkStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "Otsuka-Ochiai", graphologyGraph);
    }

    protected override async getStat(link: EdgeEntry<Attributes, Attributes>): Promise<number> {
        if (link.source in this.cache) {
            return this.cache[link.source][link.target];
        }

        const nlp = getNLPPlugin();
        if (!nlp) return NaN;

        const graphologyGraph = this.graphologyGraph;
        const g = graphologyGraph?.graphology;
        if (!g) return NaN;

        const { Docs } = nlp;
        const sourceSet = nlp.getNoStopSet(Docs[link.source])

        const results: Record<string, number> = {};
        g.forEachNode((target) => {
            const targetDoc = Docs[target]
            if (!targetDoc) {
                results[target] = 0;
            }
            const targetSet = nlp.getNoStopSet(Docs[target])

            const measure = similarity.set.oo(sourceSet, targetSet)

            results[target] = measure;
        });
        this.cache[link.source] = results;

        return results[link.target]
    }
}