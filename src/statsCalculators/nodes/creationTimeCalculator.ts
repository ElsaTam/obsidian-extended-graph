import { getFile, GraphologyGraph, GraphStatsDirection, NodeStat, NodeStatCalculator, t } from "../../internal";

export class CreationTimeCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "creationTime", graphologyGraph);
    }

    override async getStat(id: string, direction: GraphStatsDirection): Promise<number> {
        return getFile(id)?.stat.ctime || NaN;
    }

    static override getWarning(): string {
        return t("statsFunctions.warningUnreliableOS");
    }
}