/**
 * Code from SkepticMystic
 * https://github.com/SkepticMystic/graph-analysis
 * 
 * Released under the GNU General Public License v3.0
 */

import { getNLPPlugin, GraphologyGraph, LinkStat, LinkStatCalculator } from "../../internal";
import { Attributes, EdgeEntry } from "graphology-types";
import similarity from "wink-nlp/utilities/similarity";

export class BoWCalculator extends LinkStatCalculator {
    cache: { [source: string]: { [target: string]: number } } = {};

    constructor(stat: LinkStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "BoW", graphologyGraph);
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
        const sourceBoW = nlp.getNoStopBoW(Docs[link.source]);

        const results: Record<string, number> = {};
        g.forEachNode((target) => {
            const targetDoc = Docs[target]
            if (!targetDoc) {
                results[target] = 0;
            }
            const targetBoW = nlp.getNoStopBoW(Docs[target])

            const measure = similarity.bow.cosine(sourceBoW, targetBoW)

            results[target] = measure;
        });
        this.cache[link.source] = results;

        return results[link.target]
    }
}