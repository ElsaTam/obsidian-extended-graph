import { Modifier } from "obsidian";
import {
    DEFAULT_STATE_ID,
    EngineOptions,
    ExtendedGraphLink,
    Feature,
    FOLDER_KEY,
    GraphInstances,
    GraphStateData,
    GraphType,
    INVALID_KEYS,
    LINK_KEY,
    LinkStat,
    LinkStatFunction,
    linkStatFunctionIsDynamic,
    NodeStat,
    NodeStatFunction,
    nodeStatFunctionIsDynamic,
    PinShapeData,
    PluginInstances,
    QueryData,
    TAG_KEY
} from "src/internal";


type InteractiveSettings = {
    colormap: string;
    colors: { type: string, color: string, recursive?: boolean }[];
    unselected: string[];
    excludeRegex: { regex: string, flags: string };
    noneType: string;
    showOnGraph: boolean;
    enableByDefault: boolean
}

export type ExportSVGOptions = {
    asImage: boolean,
    // Core options
    onlyVisibleArea: boolean,
    showNodeNames: boolean,
    // Extended options
    useCurvedLinks: boolean,
    useModifiedArrows: boolean,
    useNodesShapes: boolean,
    showArcs: boolean,
    showFolders: boolean,
    useModifiedNames: boolean,
    showIcons: boolean,
}

export interface ExtendedGraphSettings {
    // Feature toggles
    enableFeatures: Record<GraphType, Record<Feature, boolean>>;

    // Interactive settings
    interactiveSettings: { [interactive: string]: InteractiveSettings };
    additionalProperties: { [interactive: string]: { graph: boolean, localgraph: boolean } };

    // Graph settings
    backupGraphOptions: EngineOptions;
    states: GraphStateData[];
    startingStateID: string;
    syncDefaultState: boolean;
    openInNewTab: boolean;
    canonicalizePropertiesWithDataview: boolean;

    // Color palettes
    customColorMaps: Record<string, {
        colors: string[], // Hex codes, so it's easier to human read
        stops: number[],
        reverse: boolean,
        interpolate: boolean,
    }>;

    // Image
    imageProperties: string[];
    borderFactor: number;
    allowExternalImages: boolean; // Protocol http: and https:
    allowExternalLocalImages: boolean; // Protocol file: and app:

    // Nodes sizes
    nodesSizeProperties: string[];
    nodesSizeFunction: NodeStatFunction;
    // Nodes colors
    nodesColorColormap: string;
    nodesColorFunction: NodeStatFunction;
    // Node stats orientation
    invertNodeStats: boolean;
    // Links sizes
    linksSizeFunction: LinkStatFunction;
    // Links colors
    linksColorColormap: string;
    linksColorFunction: LinkStatFunction;
    // Other stats settings
    recomputeStatsOnGraphChange: boolean;

    // Zoom on node
    zoomFactor: number;

    // Performances
    maxNodes: number;
    revertAction: boolean;
    delay: number;
    enableCSS: boolean;
    cssSnippetFilename: string;

    // Shapes
    shapeQueries: Record<string, QueryData>;

    // Export SVG
    exportSVGOptions: ExportSVGOptions;

    // Display settings
    fadeOnDisable: boolean;
    focusScaleFactor: number;
    borderUnresolved: number | string;
    spreadArcs: boolean;
    weightArcs: boolean;
    animateDotsOnLinks: boolean;
    animationSpeedForDots: number;
    interactivesBrightness: { light: number, dark: number };
    fadeInElements: boolean;
    colorBasedOnDepth: boolean;
    depthColormap: string;

    // Links
    allowMultipleLinkTypes: boolean;
    disableSource: boolean;
    disableTarget: boolean;
    excludedSourcesFolder: string[];
    excludedTargetsFolder: string[];
    curvedLinks: boolean;
    curvedFactor: number;
    outlineLinks: boolean;
    displayLinkTypeLabel: boolean;
    colorLinkTypeLabel: boolean;
    noLineHighlight: boolean;

    // Folders
    folderShowFullPath: boolean;

    // Arrows
    invertArrows: boolean;
    flatArrows: boolean;
    opaqueArrowsButKeepFading: boolean;
    alwaysOpaqueArrows: boolean,
    arrowScale: number;
    arrowFixedSize: boolean;
    arrowColorBool: boolean;
    arrowColor: string;

    // Names
    numberOfCharacters: number | null;
    showOnlyFileName: boolean;
    noExtension: boolean;
    usePropertiesForName: string[];
    addBackgroundToName: boolean;
    nameVerticalOffset: number;
    dynamicVerticalOffset: boolean;
    showNamesWhenNeighborHighlighted: boolean;

    // Icons
    iconProperties: string[];
    usePluginForIcon: boolean;
    usePluginForIconColor: boolean;
    useParentIcon: boolean;

    // UI
    horizontalLegend: boolean;

    // Inputs
    useRadialMenu: boolean;
    radialMenuModifier: Modifier;
    pinNodeModifier?: Modifier;

    // Filters
    filterAbstractFiles: { regex: string, flag: string }[];

    // Internal settings (not set by the user)
    collapseState: boolean;
    collapseLegend: boolean;
    resetAfterChanges: boolean;
    collapsedSettings: Record<string, boolean>;

    // Last multiple nodes data
    multipleNodesData: {
        shapeData?: PinShapeData,
        queryData?: QueryData
    };
}

export const DEFAULT_STATE_SETTINGS: GraphStateData = {
    id: DEFAULT_STATE_ID,
    name: "Vault (default)",
    engineOptions: new EngineOptions(),
    toggleTypes: {},
    logicTypes: {}
};

let shapeQueriesIndex = 0;
export const DEFAULT_SETTINGS: ExtendedGraphSettings = {
    // Feature toggles
    enableFeatures: {
        'graph': {
            'auto-enabled': false,
            'tags': false,
            'properties': false,
            'property-key': false,
            'links': false,
            'linksSameColorAsNode': false,
            'folders': false,
            'imagesFromProperty': false,
            'imagesFromEmbeds': false,
            'imagesForAttachments': false,
            'focus': false,
            'shapes': false,
            'elements-stats': false,
            'names': false,
            'icons': false,
            'arrows': false,
        },
        'localgraph': {
            'auto-enabled': false,
            'tags': false,
            'properties': false,
            'property-key': false,
            'links': false,
            'linksSameColorAsNode': false,
            'folders': false,
            'imagesFromProperty': false,
            'imagesFromEmbeds': false,
            'imagesForAttachments': false,
            'focus': false,
            'shapes': false,
            'elements-stats': false,
            'names': false,
            'icons': false,
            'arrows': false,
        }
    },

    // Interactive settings
    interactiveSettings: {},
    additionalProperties: {},

    // Graph settings
    backupGraphOptions: new EngineOptions(),
    states: [DEFAULT_STATE_SETTINGS],
    startingStateID: DEFAULT_STATE_ID,
    syncDefaultState: false,
    openInNewTab: false,
    canonicalizePropertiesWithDataview: true,

    // Color palettes
    customColorMaps: {},

    // Images
    imageProperties: ["image"],
    borderFactor: 0.06,
    allowExternalImages: false,
    allowExternalLocalImages: false,

    // Nodes sizes
    nodesSizeProperties: [""],
    nodesSizeFunction: 'default',
    // Nodes colors
    nodesColorColormap: 'YlOrRd',
    nodesColorFunction: 'default',
    // Node stats orientation
    invertNodeStats: false,
    // Links sizes
    linksSizeFunction: 'default',
    // Links colors
    linksColorColormap: 'YlOrRd',
    linksColorFunction: 'default',
    // Other stats settings
    recomputeStatsOnGraphChange: false,

    // Zoom on node
    zoomFactor: 2,

    // Performances
    maxNodes: 20,
    delay: 500,
    revertAction: false,
    enableCSS: false,
    cssSnippetFilename: "",

    // Shapes
    shapeQueries: {
        'circle': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'square': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'triangle': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'diamond': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'pentagon': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'hexagon': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'octagon': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'decagon': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'star4': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'star5': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'star6': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'star8': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
        'star10': { combinationLogic: 'AND', index: shapeQueriesIndex++, rules: [] },
    },

    // Display settings
    fadeOnDisable: false,
    focusScaleFactor: 1.8,
    borderUnresolved: '',
    spreadArcs: false,
    weightArcs: false,
    animateDotsOnLinks: false,
    animationSpeedForDots: 1,
    interactivesBrightness: { light: 1, dark: 1 },
    fadeInElements: false,
    colorBasedOnDepth: false,
    depthColormap: "rainbow",

    // Links
    allowMultipleLinkTypes: false,
    disableSource: false,
    disableTarget: false,
    excludedSourcesFolder: [],
    excludedTargetsFolder: [],
    curvedLinks: false,
    curvedFactor: 1,
    outlineLinks: false,
    displayLinkTypeLabel: false,
    colorLinkTypeLabel: false,
    noLineHighlight: false,

    // Folders
    folderShowFullPath: true,

    // Arrows
    invertArrows: false,
    flatArrows: false,
    opaqueArrowsButKeepFading: false,
    alwaysOpaqueArrows: false,
    arrowScale: 1,
    arrowFixedSize: false,
    arrowColorBool: false,
    arrowColor: "",

    // Names
    numberOfCharacters: null,
    showOnlyFileName: false,
    noExtension: false,
    usePropertiesForName: [],
    addBackgroundToName: false,
    nameVerticalOffset: 0,
    dynamicVerticalOffset: false,
    showNamesWhenNeighborHighlighted: false,

    // Icons
    iconProperties: [""],
    usePluginForIcon: true,
    usePluginForIconColor: true,
    useParentIcon: false,

    // UI
    horizontalLegend: false,

    // Inputs
    useRadialMenu: false,
    radialMenuModifier: 'Shift',
    pinNodeModifier: 'Alt',

    // Filters
    filterAbstractFiles: [],

    // Internal settings (not set by the user)
    collapseState: true,
    collapseLegend: true,
    resetAfterChanges: false,
    collapsedSettings: {},

    // Export SVG
    exportSVGOptions: {
        asImage: true,
        // Core options
        onlyVisibleArea: false,
        showNodeNames: true,
        // Extended options
        useCurvedLinks: false,
        useModifiedArrows: true,
        useNodesShapes: false,
        showArcs: false,
        showFolders: true,
        useModifiedNames: true,
        showIcons: false,
    },

    // Last multiple nodes data
    multipleNodesData: {},
};

export class SettingQuery {
    static excludeType(settings: ExtendedGraphSettings, key: string, type: string) {
        if (INVALID_KEYS.hasOwnProperty(key) && INVALID_KEYS[key].includes(type)) return true;
        if (!settings.interactiveSettings[key].unselected || settings.interactiveSettings[key].unselected.includes(type)) return true;
        if ("excludeRegex" in settings.interactiveSettings[key]) {
            for (const reg of settings.interactiveSettings[key].excludeRegex.regex.split("\n")) {
                if (reg !== "" && new RegExp(reg, settings.interactiveSettings[key].excludeRegex.flags).test(type)) {
                    return true;
                }
            }
        }
        return false;
    }

    static needToChangeLinkColor(instances: GraphInstances): boolean {
        if (instances.settings.enableFeatures[instances.type]['links']
            && instances.settings.interactiveSettings[LINK_KEY].showOnGraph
        ) return true;

        if (instances.settings.enableFeatures[instances.type]['elements-stats']
            && instances.settings.linksColorFunction !== "default"
        ) return true;

        if (instances.settings.enableFeatures[instances.type]['linksSameColorAsNode'])
            return true;

        return false;
    }

    static needToChangeArrowColor(instances: GraphInstances, extendedLink: ExtendedGraphLink): boolean {
        if (instances.settings.enableFeatures[instances.type]['arrows']
            && instances.settings.arrowColorBool
            && instances.settings.arrowColor != ""
        ) return true;

        if (instances.settings.enableFeatures[instances.type]['links']
            && instances.settings.interactiveSettings[LINK_KEY].showOnGraph
            && !extendedLink.hasType(LINK_KEY, instances.settings.interactiveSettings[LINK_KEY].noneType)
        ) return true;

        if (instances.settings.enableFeatures[instances.type]['elements-stats']
            && instances.settings.linksColorFunction !== "default"
        ) return true;

        if (instances.settings.enableFeatures[instances.type]['linksSameColorAsNode'])
            return true;

        return false;
    }

    static needToChangeArrowScale(instances: GraphInstances): boolean {
        if (instances.settings.enableFeatures[instances.type]['arrows']
            && (instances.settings.arrowScale !== 1 || instances.settings.arrowFixedSize)
        ) return true;

        return false;
    }

    static needToChangeArrowAlpha(instances: GraphInstances): boolean {
        if (instances.settings.enableFeatures[instances.type]['arrows']
            && instances.settings.alwaysOpaqueArrows
        ) return true;

        return false;
    }

    static needToChangeArrowRotation(instances: GraphInstances): boolean {
        if (instances.settings.enableFeatures[instances.type]['arrows']
            && instances.settings.invertArrows
        ) return true;

        return false;
    }

    static needToChangeArrowShape(instances: GraphInstances): boolean {
        if (instances.settings.enableFeatures[instances.type]['arrows']
            && instances.settings.flatArrows
        ) return true;

        return false;
    }

    static needToChangeArrow(instances: GraphInstances): boolean {
        return instances.settings.enableFeatures[instances.type]['arrows'] && (
            instances.settings.invertArrows
            || instances.settings.arrowScale !== 1
            || instances.settings.arrowFixedSize
            || (instances.settings.arrowColorBool
                && instances.settings.arrowColor != "")
            || instances.settings.alwaysOpaqueArrows
            || instances.settings.flatArrows
        )
            || SettingQuery.needToChangeLinkColor(instances);
    }

    static needDynamicGraphology(instances: GraphInstances, specific?: { element: 'node' | 'link', stat: LinkStat | NodeStat }): boolean {
        if (!specific) {
            return (instances.type === "localgraph" && instances.settings.colorBasedOnDepth)
                || (instances.settings.enableFeatures[instances.type]["elements-stats"]
                    && instances.settings.recomputeStatsOnGraphChange
                    && (linkStatFunctionIsDynamic[instances.settings.linksSizeFunction]
                        || linkStatFunctionIsDynamic[instances.settings.linksColorFunction]
                        || nodeStatFunctionIsDynamic[instances.settings.nodesSizeFunction]
                        || nodeStatFunctionIsDynamic[instances.settings.nodesColorFunction]
                    ));
        }
        else {
            if (!instances.settings.enableFeatures[instances.type]["elements-stats"] || !instances.settings.recomputeStatsOnGraphChange) return false;
            switch (specific.element) {
                case "node":
                    return nodeStatFunctionIsDynamic[specific.stat === "size" ? instances.settings.nodesSizeFunction : instances.settings.nodesColorFunction];

                case "link":
                    return linkStatFunctionIsDynamic[specific.stat === "size" ? instances.settings.linksSizeFunction : instances.settings.linksColorFunction];
            }
        }
    }

    static needReload(oldSettings: ExtendedGraphSettings, graphtype: GraphType): boolean {
        const newSettings = PluginInstances.settings;
        const oldFeatures = oldSettings.enableFeatures[graphtype];
        const newFeatures = newSettings.enableFeatures[graphtype];

        const equals = (key: any): boolean => {
            return JSON.stringify(oldSettings[key as keyof ExtendedGraphSettings])
                === JSON.stringify(newSettings[key as keyof ExtendedGraphSettings]);
        }

        // Check if interactive setting are the same
        if (oldFeatures['tags'] !== newFeatures['tags']) return true;
        if (newFeatures['tags'] && !deepEquals(oldSettings.interactiveSettings[TAG_KEY], newSettings.interactiveSettings[TAG_KEY]))
            return true;
        if (oldFeatures['links'] !== newFeatures['links']) return true;
        if (newFeatures['links'] && !deepEquals(oldSettings.interactiveSettings[LINK_KEY], newSettings.interactiveSettings[LINK_KEY]))
            return true;
        if (oldFeatures['folders'] !== newFeatures['folders']) return true;
        if (newFeatures['folders'] && !deepEquals(oldSettings.interactiveSettings[FOLDER_KEY], newSettings.interactiveSettings[FOLDER_KEY]))
            return true;

        if (oldFeatures['properties'] !== newFeatures['properties']) return true;
        const oldProperties = Object.keys(Object.fromEntries(Object.entries(oldSettings.additionalProperties).filter(p => p[1][graphtype])));
        const newProperties = Object.keys(Object.fromEntries(Object.entries(newSettings.additionalProperties).filter(p => p[1][graphtype])));
        if (!deepEquals(oldProperties, newProperties)) return true;
        const oldPropertiesSettings = oldProperties.map(p => oldSettings.interactiveSettings[p]);
        const newPropertiesSettings = newProperties.map(p => newSettings.interactiveSettings[p]);
        if (!deepEquals(oldPropertiesSettings, newPropertiesSettings)) return true;

        // Links
        if (newFeatures['links']) {
            if (['excludedSourcesFolder', 'excludedTargetsFolder', 'curvedLinks', 'curvedFactor',
                'disableSource', 'disableTarget', 'outlineLinks', 'displayLinkTypeLabel',
                'colorLinkTypeLabel'].some(key => !equals(key)))
                return true;
        }

        // Image settings
        const imageFeatures: Feature[] = ['imagesForAttachments', 'imagesFromEmbeds', 'imagesFromProperty'];
        if (imageFeatures.some(f => oldFeatures[f] !== newFeatures[f]))
            return true;
        if (newFeatures['imagesFromProperty'] && !equals('imageProperties'))
            return true;
        if (imageFeatures.some(feature => newFeatures[feature])) {
            if (['borderFactor', 'allowExternalImages', 'allowExternalLocalImages'].some(key => !equals(key)))
                return true;
        }

        // Stats
        if (newFeatures['elements-stats'] !== oldFeatures['elements-stats'])
            return true;
        if (newFeatures['elements-stats']) {
            if (['nodesSizeProperties', 'nodesSizeFunction', 'linksSizeFunction'].some(key => !equals(key)))
                return true;
            if (oldSettings.nodesColorFunction === "default" && newSettings.nodesColorFunction !== "default")
                return true;
            if (oldSettings.linksColorFunction === "default" && newSettings.linksColorFunction !== "default")
                return true;
            if (!equals('invertNodeStats') && (['nodesSizeFunction', 'nodesColorFunction', 'linksSizeFunction', 'linksColorFunction', 'recomputeStatsOnGraphChange'].some(key => newSettings[key as keyof ExtendedGraphSettings] !== "default")))
                return true;
        }

        // Shapes
        if (newFeatures['shapes'] !== oldFeatures['shapes'])
            return true;
        if (newFeatures['shapes']) {
            if (!equals('shapeQueries'))
                return true;
        }


        // Arrows
        if (newFeatures['arrows'] !== oldFeatures['arrows'])
            return true;
        if (newFeatures['arrows']) {
            if (['invertArrows', 'flatArrows', 'opaqueArrowsButKeepFading', 'alwaysOpaqueArrows', 'arrowScale',
                'arrowColorBool', 'arrowColor', 'arrowFixedSize'].some(k => !equals(k)))
                return true;
        }

        // Names
        if (newFeatures['names'] !== oldFeatures['names'])
            return true;
        if (newFeatures['names']) {
            if (['numberOfCharacters', 'showOnlyFileName', 'noExtension', 'usePropertiesForName',
                'addBackgroundToName', 'dynamicVerticalOffset', 'showNamesWhenNeighborHighlighted'].some(k => !equals(k)))
                return true;
            if (!oldSettings.dynamicVerticalOffset && !newSettings.dynamicVerticalOffset) {
                if (!equals('nameVerticalOffset'))
                    return true;
            }
        }

        // Icons
        if (newFeatures['icons'] !== oldFeatures['icons'])
            return true;
        if (newFeatures['arrows']) {
            if (['iconProperties', 'usePluginForIcon'].some(k => !equals(k)))
                return true;
            if (oldSettings.usePluginForIcon && newSettings.usePluginForIcon) {
                if (['usePluginForIconColor', 'useParentIcon'].some(k => !equals(k)))
                    return true;
            }
        }

        // Display settings
        if (oldFeatures['linksSameColorAsNode'] !== newFeatures['linksSameColorAsNode'])
            return true;
        if (['fadeOnDisable', 'borderUnresolved', 'spreadArcs', 'weightArcs',
            'animateDotsOnLinks', 'animationSpeedForDots', 'interactivesBrightness',
            'fadeInElements', 'colorBasedOnDepth'].some(key => !equals(key)))
            return true;
        if (newSettings.colorBasedOnDepth && !equals('depthColormap')) {
            return true;
        }

        // Automation
        if (['openInNewTab'].some(key => !equals(key)))
            return true;

        // Color palettes
        if (['customColorMaps'].some(key => !equals(key)))
            return true;

        // FIlters
        if (['filterAbstractFiles'].some(key => !equals(key)))
            return true;

        // Other
        if (['enableCSS', 'useRadialMenu', 'noLineHighlight', 'canonicalizePropertiesWithDataview'].some(key => !equals(key)))
            return true;

        return false;
    }
}

function deepEquals(x: any, y: any): boolean {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === 'object' && tx === ty ? (
        ok(x).length === ok(y).length &&
        ok(x).every(key => deepEquals(x[key], y[key]))
    ) : (x === y);
}