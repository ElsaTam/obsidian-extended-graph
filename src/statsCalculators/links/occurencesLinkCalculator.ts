import { GraphologyGraph, LinkStat, LinkStatCalculator } from "../../internal";
import { Attributes, EdgeEntry } from "graphology-types";

export class OccurencesLinkCalculator extends LinkStatCalculator {
    constructor(stat: LinkStat, graphologyGraph?: GraphologyGraph) {
        super(stat, "Ocurences", graphologyGraph);
    }

    protected override async getStat(link: EdgeEntry<Attributes, Attributes>): Promise<number> {
        if (this.functionKey === 'default') return 1;

        return link.attributes['count'];
    }
}