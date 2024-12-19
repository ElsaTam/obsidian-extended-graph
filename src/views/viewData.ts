export class ColorGroup {
    color: {a: number, rgb: number};
    query: string;
}

export class EngineOptions {
    colorGroups: ColorGroup[] = [];
    search: string = "";
    // filterOptions
    hideUnresolved: boolean = false;
    showAttachments: boolean = false;
    showOrphans: boolean = true;
    showTags: boolean = false;
    localBacklinks: boolean = true;
    localForelinks: boolean = true;
    localInterlinks: boolean = false;
    localJumps: number = 1;
    // displayOptions
    lineSizeMultiplier: number = 1;
    nodeSizeMultiplier: number = 1;
    showArrow: boolean = false;
    textFadeMultiplier: number = 0;
    // forceOptions
    centerStrength: number = 0.5187132489703118;
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
    disabledLinks: string[] = [];
    disabledTags: string[] = [];
    engineOptions: EngineOptions = new EngineOptions();
}