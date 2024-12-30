import { ColorGroup, GraphPluginOptions } from "src/types/graphPluginInstance";

export class EngineOptions implements GraphPluginOptions {
    colorGroups: ColorGroup[] = [];
    search: string = "";
    // filterOptions
    hideUnresolved: boolean = !1;
    showAttachments: boolean = !1;
    showOrphans: boolean = !0;
    showTags: boolean = !1;
    localBacklinks: boolean = !0;
    localForelinks: boolean = !0;
    localInterlinks: boolean = !1;
    localJumps: number = 1;
    // displayOptions
    lineSizeMultiplier: number = 1;
    nodeSizeMultiplier: number = 1;
    showArrow: boolean = !1;
    textFadeMultiplier: number = 0;
    // forceOptions
    centerStrength: number = 1 + 0.5 * Math.log(0.109);
    linkDistance: number = 250;
    linkStrength: number = 1;
    repelStrength: number = 10;

    constructor(engineOptions?: EngineOptions) {
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

export class GraphViewData {
    id: string = "";
    name: string = "";
    disabledTypes: { [interactive: string] : string[] } = {
        "tag": [],
        "link": [],
    };
    engineOptions: EngineOptions = new EngineOptions();
}