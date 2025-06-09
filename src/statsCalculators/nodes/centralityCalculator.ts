import Graphology from 'graphology';
import { degreeCentrality } from "graphology-metrics/centrality/degree";
import eigenvectorCentrality from "graphology-metrics/centrality/eigenvector";
import closenessCentrality from "graphology-metrics/centrality/closeness";
import betweennessCentrality from "graphology-metrics/centrality/betweenness";
import hits from "graphology-metrics/centrality/hits";
import { GraphologySingleton, NodeStat, NodeStatCalculator } from "src/internal";
import { reverse } from "graphology-operators";

type CentralityMapping = Record<string, number>;

export abstract class CentralityCalculator extends NodeStatCalculator {
    cm: CentralityMapping;
    link: string;

    constructor(stat: NodeStat, link: string = "") {
        super(stat);
        this.link = link;
    }

    override async computeStats(invert: boolean): Promise<void> {
        const graphology = GraphologySingleton.getInstance().graphologyGraph;
        if (!graphology) return;
        this.computeCentralityMap(invert ? reverse(graphology) : graphology);
        return super.computeStats(invert);
    }

    override async getStat(id: string): Promise<number> {
        return this.cm[id];
    }

    protected abstract computeCentralityMap(g: Graphology): void;
    abstract getLink(): string;
}

export class DegreeCentralityCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        this.cm = degreeCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Degree_(graph_theory)";
    }
}

export class EigenvectorCentralityCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        this.cm = eigenvectorCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Eigenvector_centrality";
    }
}

export class ClosenessCentralityCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        this.cm = closenessCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Closeness_centrality";
    }
}

export class BetweennessCentralityCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        this.cm = betweennessCentrality(g);
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/Betweenness_centrality";
    }
}

export class HubsCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        const { hubs, authorities } = hits(g);
        this.cm = hubs;
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/HITS_algorithm";
    }
}

export class AuthoritiesCalculator extends CentralityCalculator {
    override computeCentralityMap(g: Graphology) {
        const { hubs, authorities } = hits(g);
        this.cm = authorities;
    }

    override getLink() {
        return "https://en.wikipedia.org/wiki/HITS_algorithm";
    }
}