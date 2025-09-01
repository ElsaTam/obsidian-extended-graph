import {
    AdamicAdarCalculator,
    BoWCalculator,
    ClusteringCoefficientCalculator,
    CoCitationsCalculator,
    GraphInstances,
    JaccardCalculator,
    LinkStat,
    LinkStatCalculator,
    OccurencesLinkCalculator,
    OtsukaOchiaiCalculator,
    OverlapCalculator,
    ExtendedGraphInstances
} from "../../internal";


export class LinksStatCalculatorFactory {
    static getCalculator(stat: LinkStat, instances?: GraphInstances): LinkStatCalculator | undefined {
        const g = instances?.graphologyGraph;
        switch (stat === 'size' ? (instances ?? ExtendedGraphInstances).settings.linksSizeFunction : (instances ?? ExtendedGraphInstances).settings.linksColorFunction) {
            case 'Adamic Adar':
                return new AdamicAdarCalculator(stat, g);
            case 'BoW':
                return new BoWCalculator(stat, g);
            case 'Clustering Coefficient':
                return new ClusteringCoefficientCalculator(stat, g);
            case 'Co-Citations':
                return new CoCitationsCalculator(stat, g);
            case 'Jaccard':
                return new JaccardCalculator(stat, g);
            case 'Ocurences':
                return new OccurencesLinkCalculator(stat, g);
            case 'Otsuka-Ochiai':
                return new OtsukaOchiaiCalculator(stat, g);
            case 'Overlap':
                return new OverlapCalculator(stat, g);
            default:
                return;
        }
    }
}