import {
    BacklinkCountCalculator,
    ConstantCalculator,
    CreationTimeCalculator,
    EccentricityCalculator,
    FilenameLengthCalculator,
    ForwardlinkCountCalculator,
    GraphInstances,
    GraphologyGraph,
    ModifiedTimeCalculator,
    NodeStat,
    NodeStatCalculator,
    NodeStatFunction,
    ExtendedGraphInstances,
    SentimentCalculator,
    TagsCountCalculator,
    TopologicalSortCalculator,
    TotallinkCountCalculator
} from "../../internal";
import * as centrality from "./centralityCalculator";


export class NodeStatCalculatorFactory {
    static getCalculator(stat: NodeStat, instances?: GraphInstances): NodeStatCalculator | undefined {
        const settings = (instances ?? ExtendedGraphInstances).settings;
        const g = instances?.graphologyGraph;
        const fn = stat === 'size' ? settings.nodesSizeFunction : settings.nodesColorFunction;
        switch (fn) {
            case 'constant':
                return new ConstantCalculator(stat, g);
            case 'backlinksCount':
                return settings.graphStatsDirection === "reversed" ? new BacklinkCountCalculator(stat, true, g) : new ForwardlinkCountCalculator(stat, true, g);
            case 'backUniquelinksCount':
                return settings.graphStatsDirection === "reversed" ? new BacklinkCountCalculator(stat, false, g) : new ForwardlinkCountCalculator(stat, false, g);
            case 'forwardlinksCount':
                return settings.graphStatsDirection === "reversed" ? new ForwardlinkCountCalculator(stat, true, g) : new BacklinkCountCalculator(stat, true, g);
            case 'forwardUniquelinksCount':
                return settings.graphStatsDirection === "reversed" ? new ForwardlinkCountCalculator(stat, false, g) : new BacklinkCountCalculator(stat, false, g);
            case 'totallinksCount':
                return new TotallinkCountCalculator(stat, true, g);
            case 'totalUniquelinksCount':
                return new TotallinkCountCalculator(stat, false, g);
            case 'filenameLength':
                return new FilenameLengthCalculator(stat, g);
            case 'tagsCount':
                return new TagsCountCalculator(stat, g);
            case 'creationTime':
                return new CreationTimeCalculator(stat, g);
            case 'modifiedTime':
                return new ModifiedTimeCalculator(stat, g);
            case 'eccentricity':
                return new EccentricityCalculator(stat, g);
            case 'closeness':
                return new centrality.ClosenessCentralityCalculator(stat, g);
            case 'betweenness':
                return new centrality.BetweennessCentralityCalculator(stat, g);
            case 'degree':
                return new centrality.DegreeCentralityCalculator(stat, g);
            case 'eigenvector':
                return new centrality.EigenvectorCentralityCalculator(stat, g);
            case 'hub':
                return new centrality.HubsCalculator(stat, g);
            case 'authority':
                return new centrality.AuthoritiesCalculator(stat, g);
            case 'topological':
                return new TopologicalSortCalculator(stat, g);
            case 'sentiment':
                return new SentimentCalculator(stat, g);
            default:
                return;
        }
    }

    static getWarning(fn: NodeStatFunction): string {
        switch (fn) {
            case 'constant':
                return ConstantCalculator.getWarning();
            case 'backlinksCount':
            case 'backUniquelinksCount':
                return BacklinkCountCalculator.getWarning();
            case 'forwardlinksCount':
            case 'forwardUniquelinksCount':
                return ForwardlinkCountCalculator.getWarning();
            case 'totallinksCount':
            case 'totalUniquelinksCount':
                return TotallinkCountCalculator.getWarning();
            case 'filenameLength':
                return FilenameLengthCalculator.getWarning();
            case 'tagsCount':
                return TagsCountCalculator.getWarning();
            case 'creationTime':
                return CreationTimeCalculator.getWarning();
            case 'modifiedTime':
                return ModifiedTimeCalculator.getWarning();
            case 'eccentricity':
                return EccentricityCalculator.getWarning();
            case 'closeness':
                return centrality.ClosenessCentralityCalculator.getWarning();
            case 'betweenness':
                return centrality.BetweennessCentralityCalculator.getWarning();
            case 'degree':
                return centrality.DegreeCentralityCalculator.getWarning();
            case 'eigenvector':
                return centrality.EigenvectorCentralityCalculator.getWarning();
            case 'hub':
                return centrality.HubsCalculator.getWarning();
            case 'authority':
                return centrality.AuthoritiesCalculator.getWarning();
            case 'topological':
                return TopologicalSortCalculator.getWarning();
            case 'sentiment':
                return SentimentCalculator.getWarning();
            default:
                return "";
        }
    }
}