import { GraphologyGraph, GraphStatsDirection, NodeStat, NodeStatCalculator } from "../../internal";

export class ConstantCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "constant", graphologyGraph);
    }

    override async getStat(id: string, direction: GraphStatsDirection): Promise<number> {
        return 1;
    }
}