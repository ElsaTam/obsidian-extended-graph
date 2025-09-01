import eccentricity from "graphology-metrics/node/eccentricity";
import { GraphologyGraph, GraphStatsDirection, NodeStat, NodeStatCalculator } from "../../internal";

export class EccentricityCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "eccentricity", graphologyGraph);
    }

    override async getStat(id: string, direction: GraphStatsDirection): Promise<number> {
        if (!this.graphologyGraph) return NaN;
        const connectedGraph = this.graphologyGraph.getConnectedGraphology(id, direction);
        if (!connectedGraph) return NaN;
        return eccentricity(connectedGraph, id);
    }

    static override getLink(): string {
        return "https://reference.wolfram.com/language/ref/EccentricityCentrality.html";
    }
}