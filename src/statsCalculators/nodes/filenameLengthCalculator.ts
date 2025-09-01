import { getFile, GraphologyGraph, GraphStatsDirection, NodeStat, NodeStatCalculator } from "../../internal";

export class FilenameLengthCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "filenameLength", graphologyGraph);
    }

    override async getStat(id: string, direction: GraphStatsDirection): Promise<number> {
        return getFile(id)?.basename.length || id.length;
    }
}