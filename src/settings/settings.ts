import { EngineOptions, GraphViewData } from "../views/viewData";
import { DEFAULT_VIEW_ID } from "../globalVariables";

export interface ExtendedGraphSettings {
    // Interactive settings
    colormaps: { [interactive: string] : string };
    interactiveColors: {[interactive: string]: {type: string, color: string}[]};
    unselectedInteractives: {[interactive: string]: string[]};
    noneType: { [interactive: string] : string };
    additionalProperties: { [interactive: string] : boolean };

    // Graph settings
    imageProperty: string;
    maxNodes: number;
    globalFilter: string;
    backupGraphOptions: EngineOptions;
    views: GraphViewData[];

    // Feature toggles
    enableTags: boolean;
    enableProperties: boolean;
    enableLinks: boolean;
    enableImages: boolean;
    enableFocusActiveNote: boolean;
    removeSource: boolean;
    removeTarget: boolean;

    // Display settings
    fadeOnDisable: boolean;
    focusScaleFactor: number;

    // Internal settings (not set by the user)
    collapseView: boolean;
    collapseLegend: boolean;
}

export const DEFAULT_SETTINGS: Partial<ExtendedGraphSettings> = {
    // Interactive settings
    colormaps: {
        TAG_KEY: "hsv",
        LINK_KEY: "rainbow"
    },
    interactiveColors: {
        TAG_KEY: [],
        LINK_KEY: []
    },
    unselectedInteractives: {
        TAG_KEY: [],
        LINK_KEY: []
    },
    noneType: {
        TAG_KEY: "none",
        LINK_KEY: "none"
    },
    additionalProperties: {},
    
    // Graph settings
    imageProperty: "image",
    maxNodes: 20,
    globalFilter: "",
    backupGraphOptions: new EngineOptions(),
    views: [
        {
            id: DEFAULT_VIEW_ID,
            name: "Vault (default)",
            engineOptions: new EngineOptions(),
            disabledTypes: {
                TAG_KEY: [],
                LINK_KEY: []
            }
        }
    ],

    // Feature toggles
    enableTags: true,
    enableProperties: false,
    enableLinks: true,
    enableImages: true,
    enableFocusActiveNote: false,
    removeSource: false,
    removeTarget: false,

    // Display settings
    fadeOnDisable: false,
    focusScaleFactor: 1.8,

    // Internal settings (not set by the user)
    collapseView: true,
    collapseLegend: true,
};

