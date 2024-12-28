import { EngineOptions, GraphViewData } from "../views/viewData";
import { DEFAULT_VIEW_ID } from "../globalVariables";

export interface ExtendedGraphSettings {
    colormaps: { [interactive: string] : string };
    interactiveColors: {[interactive: string]: {type: string, color: string}[]};
    unselectedInteractives: {[interactive: string]: string[]};
    noneType: { [interactive: string] : string };
    imageProperty: string;
    maxNodes: number;
    globalFilter: string;
    views: GraphViewData[];

    enableTags: boolean;
    enableLinks: boolean;
    enableImages: boolean;
    enableFocusActiveNote: boolean;

    fadeOnDisable: boolean;
    focusScaleFactor: number;
    linkCurves: boolean;
    removeSource: boolean;
    removeTarget: boolean;

    // NOT SET BY THE USER
    collapseView: boolean;
    collapseLegend: boolean;
}

export const DEFAULT_SETTINGS: Partial<ExtendedGraphSettings> = {
    colormaps: {
        "tag": "hsv",
        "link": "rainbow"
    },
    interactiveColors: {
        "tag": [],
        "link": []
    },
    unselectedInteractives: {
        "tag": [],
        "link": []
    },
    noneType: {
        "tag": "none",
        "link": "none"
    },
    imageProperty: "image",
    maxNodes: 20,
    globalFilter: "",

    views: [
        {
            id: DEFAULT_VIEW_ID,
            name: "Vault (default)",
            engineOptions: new EngineOptions(),
            disabledLinks: [],
            disabledTags: []
        }
    ],

    enableTags: true,
    enableLinks: true,
    enableImages: true,
    enableFocusActiveNote: false,

    fadeOnDisable: false,
    focusScaleFactor: 1.8,
    linkCurves: false,
    removeSource: false,
    removeTarget: false,

    collapseView: true,
    collapseLegend: true,
};

