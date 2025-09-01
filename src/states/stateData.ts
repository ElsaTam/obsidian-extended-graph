import { GraphColorGroup, GraphPluginInstanceOptions } from "obsidian-typings";
import { CombinationLogic, FOLDER_KEY, GraphInstances, LINK_KEY, TAG_KEY } from "../internal";

export class EngineOptions implements GraphPluginInstanceOptions {
    colorGroups?: GraphColorGroup[] = [];
    search?: string = "";
    // filterOptions
    hideUnresolved?: boolean = !1;
    showAttachments?: boolean = !1;
    showOrphans?: boolean = !0;
    showTags?: boolean = !1;
    localBacklinks?: boolean = !0;
    localForelinks?: boolean = !0;
    localInterlinks?: boolean = !1;
    localJumps?: number = 1;
    // displayOptions
    lineSizeMultiplier?: number = 1;
    nodeSizeMultiplier?: number = 1;
    showArrow?: boolean = !1;
    textFadeMultiplier?: number = 0;
    // forceOptions
    centerStrength?: number = 1 - Math.log(0.109) / Math.log(0.01);
    linkDistance?: number = 250;
    linkStrength?: number = 1;
    repelStrength?: number = 10;

    constructor(engineOptions?: GraphPluginInstanceOptions) {
        if (engineOptions) {
            this.colorGroups = engineOptions.colorGroups;
            this.search = engineOptions.search;
            this.hideUnresolved = engineOptions.hideUnresolved;
            this.showAttachments = engineOptions.showAttachments;
            this.showOrphans = engineOptions.showOrphans;
            this.showTags = engineOptions.showTags;
            this.localBacklinks = engineOptions.localBacklinks;
            this.localForelinks = engineOptions.localForelinks;
            this.localInterlinks = engineOptions.localInterlinks;
            this.localJumps = engineOptions.localJumps;
            this.lineSizeMultiplier = engineOptions.lineSizeMultiplier;
            this.nodeSizeMultiplier = engineOptions.nodeSizeMultiplier;
            this.showArrow = engineOptions.showArrow;
            this.textFadeMultiplier = engineOptions.textFadeMultiplier;
            this.centerStrength = engineOptions.centerStrength;
            this.linkDistance = engineOptions.linkDistance;
            this.linkStrength = engineOptions.linkStrength;
            this.repelStrength = engineOptions.repelStrength;
        }
    }
}

export class GraphStateData {
    id: string = "";
    name: string = "";
    toggleTypes: { [interactive: string]: string[] };
    logicTypes: { [interactive: string]: CombinationLogic };
    pinNodes?: { [nodeID: string]: { x: number, y: number } };
    engineOptions?: EngineOptions;
    hiddenLegendRows?: string[];
    collapsedLegendRows?: string[];
    enableLayers: boolean = false;
    currentLayerLevel: number = 0;

    constructor() {
        this.toggleTypes = {};
        this.toggleTypes[TAG_KEY] = [];
        this.toggleTypes[LINK_KEY] = [];
        this.toggleTypes[FOLDER_KEY] = [];

        this.logicTypes = {};
        this.logicTypes[TAG_KEY] = "OR";
        this.logicTypes[LINK_KEY] = "OR";
        this.logicTypes[FOLDER_KEY] = "OR";

        this.pinNodes = {};
        this.hiddenLegendRows = [];
        this.collapsedLegendRows = [];

        this.engineOptions = new EngineOptions();
    }
}

export class GraphStateDataQuery {
    static getLogicType(instances: GraphInstances, key: string): CombinationLogic {
        return (instances.stateData && instances.stateData.logicTypes && instances.stateData.logicTypes[key])
            ? instances.stateData.logicTypes[key] : "OR";
    }
}