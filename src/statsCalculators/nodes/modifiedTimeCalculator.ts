import { getFile, GraphologyGraph, GraphStatsDirection, NodeStat, NodeStatCalculator, t } from "../../internal";

export class ModifiedTimeCalculator extends NodeStatCalculator {
    constructor(stat: NodeStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "modifiedTime", graphologyGraph);
    }

    override async getStat(id: string, direction: GraphStatsDirection): Promise<number> {
        return getFile(id)?.stat.mtime || NaN;
    }

    static override getWarning(): string {
        return t("statsFunctions.warningUnreliableOS");
    }
}