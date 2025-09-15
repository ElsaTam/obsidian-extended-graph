/**
 * Types and interfaces for the Extended Graph benchmarking system
 */

import { App } from "obsidian";
import { Feature, GraphType, NodeStatFunction, LinkStatFunction, ExtendedGraphSettings } from "../internal";

export type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
};

export interface BenchmarkMetrics {
    // Core timing metrics
    initializationTime: number;
    renderTime: number;
    nodeProcessingTime: number;
    linkProcessingTime: number;

    // Memory metrics
    memoryUsage: {
        initial: number;
        peak: number;
        final: number;
        delta: number;
    };

    // Performance metrics
    frameRate: {
        average: number;
        min: number;
        max: number;
        samples: number[];
    };

    // Interaction performance
    interactionTimes: {
        zoom: number;
        pan: number;
        hover: number;
        filter: number;
        nodeSelection: number;
        legendInteraction: number;
    };

    // Feature-specific metrics
    featureMetrics: {
        imageLoadTime?: number;
        statisticsComputeTime?: number;
        shapeRenderTime?: number;
        iconLoadTime?: number;
        nodesInteractives?: number;
        linksInteractives?: number;
    };

    // Custom performance entries
    customMetrics: PerformanceEntry[];
}

export interface TagsConfig {
    showArcs: boolean;
    arcSpread: boolean;
    arcWeight: boolean;
    colorPalette: string;
    tagsCount?: number; // For controlled testing
    enabledTags?: string[]; // Specific tags to enable
}

export interface PropertiesConfig {
    showArcs: boolean;
    arcSpread: boolean;
    arcWeight: boolean;
    colorPalette: string;
    properties: string[];
    propertiesCount?: number;
}

export interface LinksConfig {
    curved: boolean;
    curveFactor?: number;
    showLabels: boolean;
    colorLabels: boolean;
    useBitmapLabels: boolean;
    outline: boolean;
    multipleLinkTypes: boolean;
    excludeSourceFolders: boolean;
    excludeTargetFolders: boolean;
    colorBasedOnSource: boolean;
}

export interface ImagesConfig {
    fromProperty: boolean;
    fromEmbeds: boolean;
    forAttachments: boolean;
    borderFactor: number;
    allowExternal: boolean;
    allowExternalLocal: boolean;
    imageProperties: string[];
}

export interface StatisticsConfig {
    nodeSize: {
        enabled: boolean;
        function: NodeStatFunction;
        range: { min: number; max: number };
        properties?: string[];
    };
    nodeColor: {
        enabled: boolean;
        function: NodeStatFunction;
        colormap: string;
    };
    linkSize: {
        enabled: boolean;
        function: LinkStatFunction;
    };
    linkColor: {
        enabled: boolean;
        function: LinkStatFunction;
        colormap: string;
    };
    recomputeOnChange: boolean;
    graphDirection: 'normal' | 'reversed' | 'undirected';
}

export interface ShapesConfig {
    enabledShapes: string[];
    shapeQueries: Record<string, any>;
}

export interface IconsConfig {
    iconProperties: string[];
    usePluginIcons: boolean;
    usePluginColors: boolean;
    useParentIcon: boolean;
    backgroundOpacity: number;
    useIconColorForBackground: boolean;
    borderWidth: number;
}

export interface ArrowsConfig {
    inverted: boolean;
    triangular: boolean;
    opaque: boolean;
    alwaysOpaque: boolean;
    scale: number;
    fixedSize: boolean;
    customColor: boolean;
    color?: string;
}

export interface NamesConfig {
    characterLimit: number | null;
    filenameOnly: boolean;
    hideExtensions: boolean;
    useProperties: string[];
    addBackground: boolean;
    verticalOffset: number;
    dynamicOffset: boolean;
    showOnNeighborHover: boolean;
}

export interface FoldersConfig {
    showFullPath: boolean;
    colorPalette: string;
    enabledFolders?: string[];
}

export interface FocusConfig {
    scaleFactor: number;
    highlightOpen: boolean;
    highlightSearch: boolean;
}

export interface LayersConfig {
    properties: string[];
    numberOfActiveLayers: number;
    order: 'ASC' | 'DESC';
    displayLabels: boolean;
    nodesWithoutLayerOpacity: number;
    useCustomOpacity: boolean;
    customOpacity: Record<number, number>;
}

export interface LocalGraphConfig {
    colorBasedOnDepth: boolean;
    depthColormap: string;
    currentNodeCustomization: {
        useColor: boolean;
        color: string;
        size: number;
        shape: string;
    };
}

export interface TestScenario {
    id: string;
    name: string;
    description: string;
    category: 'baseline' | 'feature-specific' | 'integration' | 'stress';
    configuration?: RecursivePartial<ExtendedGraphSettings>;
}

export interface BenchmarkResult {
    scenarioId: string;
    scenarioName: string;
    configuration?: RecursivePartial<ExtendedGraphSettings>;
    iteration: number;
    timestamp: number;
    metrics: BenchmarkMetrics;
    systemInfo: SystemInfo;
    error?: string;
    warnings?: string[];
}

export interface AggregatedResult {
    scenarioId: string;
    scenarioName: string;
    category: TestScenario['category'];
    iterations: number;
    totalIterations: number;
    errors: number;
    warnings: number;

    aggregatedMetrics: {
        [K in keyof BenchmarkMetrics]: K extends 'interactionTimes' | 'featureMetrics'
        ? { [T in keyof BenchmarkMetrics[K]]: StatisticalSummary }
        : K extends 'memoryUsage' | 'frameRate'
        ? { [T in keyof BenchmarkMetrics[K]]: StatisticalSummary }
        : StatisticalSummary;
    };
}

export interface StatisticalSummary {
    mean: number;
    median: number;
    min: number;
    max: number;
    std: number;
    q25: number;
    q75: number;
    outliers?: number[];
}

export interface SystemInfo {
    userAgent: string;
    memory?: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
    };
    hardwareConcurrency: number;
    timestamp: number;
    obsidianVersion: string;
    pluginVersion: string;
    vaultInfo: {
        totalFiles: number;
        totalFolders: number;
        totalTags: number;
        averageLinksPerFile: number;
    };
}

export interface BenchmarkReport {
    metadata: {
        timestamp: string;
        duration: number;
        version: string;
        gitCommit?: string;
    };
    system: SystemInfo;
    testSuite: {
        totalScenarios: number;
        totalTests: number;
        successfulTests: number;
        failedTests: number;
        categories: Record<TestScenario['category'], number>;
    };
    results: AggregatedResult[];
    analysis: PerformanceAnalysis;
    recommendations: BenchmarkRecommendation[];
    exports: {
        csv: string;
        charts: ChartData[];
    };
}

export interface PerformanceAnalysis {
    baselinePerformance: Record<string, number>;
    featureImpact: Record<Feature, {
        initializationOverhead: number;
        renderingOverhead: number;
        memoryOverhead: number;
        interactionOverhead: number;
    }>;
    bottlenecks: Array<{
        feature: string;
        metric: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        suggestedAction: string;
    }>;
}

export interface BenchmarkRecommendation {
    type: 'performance' | 'stability' | 'optimization' | 'usage';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    suggestedActions: string[];
    affectedFeatures: Feature[];
    estimatedImpact: string;
}

export interface ChartData {
    type: 'line' | 'bar' | 'scatter' | 'heatmap' | 'box';
    title: string;
    subtitle?: string;
    data: any[];
    xAxis: {
        label: string;
        type: 'numeric' | 'categorical' | 'datetime';
    };
    yAxis: {
        label: string;
        type: 'numeric' | 'categorical';
        unit?: string;
    };
    series?: string[];
    metadata: {
        source: string;
        generated: string;
        description: string;
    };
}

export interface BenchmarkOptions {
    iterations: number;
    scenarios: string[];
    outputDirectory: string;
    includeBaseline: boolean;
    includeStress: boolean;
    warmupRuns: number;
    cooldownTime: number;
    collectGarbageAfterEach: boolean;
    generateCharts: boolean;
    exportFormats: ('json' | 'csv' | 'html' | 'md')[];
}

export interface TestEnvironment {
    app: App;
    plugin: any;
    vaultPath: string;
}