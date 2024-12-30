import { GraphPluginInstance } from "obsidian-typings";

export interface GraphCorePluginInstance extends GraphPluginInstance {
    options: GraphPluginOptions;
}

export interface GraphPluginOptions {
    colorGroups: ColorGroup[];
    search: string;
    // filterOptions
    hideUnresolved: boolean;
    showAttachments: boolean;
    showOrphans: boolean;
    showTags: boolean;
    localBacklinks: boolean;
    localForelinks: boolean;
    localInterlinks: boolean;
    localJumps: number;
    // displayOptions
    lineSizeMultiplier: number;
    nodeSizeMultiplier: number;
    showArrow: boolean;
    textFadeMultiplier: number;
    // forceOptions
    centerStrength: number;
    linkDistance: number;
    linkStrength: number;
    repelStrength: number;
}

export class ColorGroup {
    color: {a: number, rgb: number};
    query: string;
}