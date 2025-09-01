/**
 * Code from SkepticMystic
 * https://github.com/SkepticMystic/graph-analysis
 * 
 * Released under the GNU General Public License v3.0
 */

import { getNLPPlugin, GraphologyGraph, GraphStatsDirection, NodeStat, NodeStatCalculator } from "../../internal";

export class SentimentCalculator extends NodeStatCalculator {
    cache: { [source: string]: { [target: string]: number } } = {};

    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "sentiment", graphologyGraph);
    }

    override async getStat(id: string, direction: GraphStatsDirection): Promise<number> {
        const nlp = getNLPPlugin();
        if (!nlp) return NaN;

        const doc = nlp.Docs[id]
        if (!doc) {
            return 0;
        }
        return nlp.getAvgSentimentFromDoc(doc)
    }
}