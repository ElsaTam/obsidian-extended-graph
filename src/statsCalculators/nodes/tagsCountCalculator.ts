import { getFile, getFileInteractives, GraphologyGraph, GraphStatsDirection, NodeStat, NodeStatCalculator, TAG_KEY } from "../../internal";

export class TagsCountCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "tagsCount", graphologyGraph);
    }

    override async getStat(id: string, direction: GraphStatsDirection): Promise<number> {
        const file = getFile(id);
        return file ? getFileInteractives(TAG_KEY, file).size : 0;
    }
}