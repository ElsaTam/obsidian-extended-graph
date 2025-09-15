import { TestScenario } from "./benchmarkTypes";
import { ShapeEnum } from "../internal";


export class BenchmarkScenarios {

    /**
     * Get all available test scenarios organized by category
     */
    static getAllScenarios(): Record<string, TestScenario[]> {
        return {
            baseline: this.getBaselineScenarios(),
            tags: this.getTagsScenarios(),
            properties: this.getPropertiesScenarios(),
            links: this.getLinksScenarios(),
            images: this.getImagesScenarios(),
            statistics: this.getStatisticsScenarios(),
            shapes: this.getShapesScenarios(),
            icons: this.getIconsScenarios(),
            arrows: this.getArrowsScenarios(),
            names: this.getNamesScenarios(),
        };
    }

    /**
     * Get specific scenarios by IDs
     */
    static getScenarios(ids: string[]): TestScenario[] {
        const allScenarios = this.getAllScenarios();
        const flatScenarios = Object.values(allScenarios).flat();
        return flatScenarios.filter(scenario => ids.includes(scenario.id));
    }

    /**
     * Baseline scenarios - pure Obsidian graph performance
     */
    private static getBaselineScenarios(): TestScenario[] {
        return [
            {
                id: 'baseline-core',
                name: 'Core Obsidian Graph',
                description: 'Pure Obsidian graph with no Extended Graph features',
                category: 'baseline'
            },
            {
                id: 'baseline-plugin-enabled',
                name: 'Extended Graph Enabled (No Features)',
                description: 'Plugin loaded but no features activated',
                category: 'baseline',
                configuration: {

                }
            }
        ];
    }

    /**
     * Tags feature scenarios
     */
    private static getTagsScenarios(): TestScenario[] {
        return [
            {
                id: 'tags-basic',
                name: 'Tags - Basic Filtering',
                description: 'Tags enabled for filtering only, no visual arcs',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { tags: true } },
                    interactiveSettings: { tags: { showOnGraph: false } },
                    spreadArcs: false,
                    weightArcs: false
                }
            },
            {
                id: 'tags-arcs-simple',
                name: 'Tags - Visual Arcs',
                description: 'Tags with visual arcs, no spreading or weighting',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { tags: true } },
                    interactiveSettings: { tags: { showOnGraph: true } },
                    spreadArcs: false,
                    weightArcs: false
                }
            },
            {
                id: 'tags-arcs-spread',
                name: 'Tags - Spread Arcs',
                description: 'Tags with spread arcs around nodes',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { tags: true } },
                    interactiveSettings: { tags: { showOnGraph: true } },
                    spreadArcs: true,
                    weightArcs: false
                }
            },
            {
                id: 'tags-arcs-weighted',
                name: 'Tags - Weighted Arcs',
                description: 'Tags with arc length based on frequency',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { tags: true } },
                    interactiveSettings: { tags: { showOnGraph: false } },
                    spreadArcs: true,
                    weightArcs: true
                }
            }
        ];
    }

    /**
     * Properties feature scenarios
     */
    private static getPropertiesScenarios(): TestScenario[] {
        return [
            {
                id: 'properties-basic',
                name: 'Properties - Basic Filtering',
                description: 'Properties enabled for filtering only, no visual arcs',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { properties: true } },
                    additionalProperties: { type: { graph: true }, tags: { graph: true }, title: { graph: true } },
                    interactiveSettings: { type: { showOnGraph: false }, tags: { showOnGraph: false }, title: { showOnGraph: false } },
                }
            },
            {
                id: 'properties-arcs-simple',
                name: 'Properties - Visual Arcs',
                description: 'Properties with visual arcs, no spreading or weighting',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { properties: true } },
                    additionalProperties: { type: { graph: true }, tags: { graph: true }, title: { graph: true } },
                    interactiveSettings: { type: { showOnGraph: true }, tags: { showOnGraph: true }, title: { showOnGraph: true } },
                    spreadArcs: false,
                    weightArcs: false
                }
            },
            {
                id: 'properties-arcs-spread',
                name: 'Properties - Spread Arcs',
                description: 'Properties with spread arcs around nodes',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { properties: true } },
                    additionalProperties: { type: { graph: true }, tags: { graph: true }, title: { graph: true } },
                    interactiveSettings: { type: { showOnGraph: true }, tags: { showOnGraph: true }, title: { showOnGraph: true } },
                    spreadArcs: true,
                    weightArcs: false
                }
            },
            {
                id: 'properties-arcs-weighted',
                name: 'Properties - Weighted Arcs',
                description: 'Properties with arc length based on frequency',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { properties: true } },
                    additionalProperties: { type: { graph: true }, tags: { graph: true }, title: { graph: true } },
                    interactiveSettings: { type: { showOnGraph: true }, tags: { showOnGraph: true }, title: { showOnGraph: true } },
                    spreadArcs: true,
                    weightArcs: true
                }
            }
        ];
    }

    /**
     * Links feature scenarios
     */
    private static getLinksScenarios(): TestScenario[] {
        return [
            {
                id: 'links-basic',
                name: 'Links - Basic Types',
                description: 'Link types without visual enhancements',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { links: true } },
                    interactiveSettings: { links: { showOnGraph: false } },
                    curvedLinks: false,
                    displayLinkTypeLabel: false,
                    colorLinkTypeLabel: false,
                    useBitmapsForLinkLabels: false,
                    outlineLinks: false,
                    allowMultipleLinkTypes: false
                }
            },
            {
                id: 'links-curved',
                name: 'Links - Curved',
                description: 'Curved links with default curvature',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { links: true } },
                    interactiveSettings: { links: { showOnGraph: true } },
                    curvedLinks: true,
                    displayLinkTypeLabel: false,
                    colorLinkTypeLabel: false,
                    useBitmapsForLinkLabels: false,
                    outlineLinks: false,
                    allowMultipleLinkTypes: false
                }
            },
            {
                id: 'links-labels-text',
                name: 'Links - Text Labels',
                description: 'Link type labels as text',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { links: true } },
                    interactiveSettings: { links: { showOnGraph: true } },
                    curvedLinks: false,
                    displayLinkTypeLabel: true,
                    colorLinkTypeLabel: true,
                    useBitmapsForLinkLabels: false,
                    outlineLinks: false,
                    allowMultipleLinkTypes: false
                }
            },
            {
                id: 'links-labels-bitmap',
                name: 'Links - Bitmap Labels',
                description: 'Link type labels as bitmaps',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { links: true } },
                    interactiveSettings: { links: { showOnGraph: false } },
                    curvedLinks: false,
                    displayLinkTypeLabel: true,
                    colorLinkTypeLabel: true,
                    useBitmapsForLinkLabels: true,
                    outlineLinks: false,
                    allowMultipleLinkTypes: false
                }
            },
            {
                id: 'links-outline',
                name: 'Links - Outlined',
                description: 'Links with outline effect',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { links: true } },
                    interactiveSettings: { links: { showOnGraph: false } },
                    curvedLinks: false,
                    displayLinkTypeLabel: false,
                    colorLinkTypeLabel: false,
                    useBitmapsForLinkLabels: false,
                    outlineLinks: false,
                    allowMultipleLinkTypes: true
                }
            },
            {
                id: 'links-multiple-types',
                name: 'Links - Multiple Types per Link',
                description: 'Multiple link types on single connections',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { links: true } },
                    interactiveSettings: { links: { showOnGraph: false } },
                    curvedLinks: false,
                    displayLinkTypeLabel: false,
                    colorLinkTypeLabel: false,
                    useBitmapsForLinkLabels: false,
                    outlineLinks: false,
                    allowMultipleLinkTypes: true
                }
            },
            {
                id: 'links-multiple-types-curved',
                name: 'Links - Multiple Types per Curved Link',
                description: 'Multiple link types on single connections with curved links',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { links: true } },
                    interactiveSettings: { links: { showOnGraph: false } },
                    curvedLinks: true,
                    displayLinkTypeLabel: false,
                    colorLinkTypeLabel: false,
                    useBitmapsForLinkLabels: false,
                    outlineLinks: false,
                    allowMultipleLinkTypes: true
                }
            },
            {
                id: 'links-multiple-types-curved-labels',
                name: 'Links - Multiple Labels per Curved Link',
                description: 'Multiple link types on single connections with curved links while showing labels',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { links: true } },
                    interactiveSettings: { links: { showOnGraph: false } },
                    curvedLinks: true,
                    displayLinkTypeLabel: true,
                    colorLinkTypeLabel: true,
                    useBitmapsForLinkLabels: false,
                    outlineLinks: false,
                    allowMultipleLinkTypes: true
                }
            }
        ];
    }

    /**
     * Images feature scenarios
     */
    private static getImagesScenarios(): TestScenario[] {
        return [
            {
                id: 'images-property-only',
                name: 'Images - From Properties Only',
                description: 'Images loaded from note properties',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { imagesFromProperty: true } },
                    imageProperties: ['image', 'thumbnail']
                }
            },
            {
                id: 'images-embeds',
                name: 'Images - From Embeds',
                description: 'First embedded image in notes',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { imagesFromEmbeds: true } }
                }
            },
            {
                id: 'images-attachments',
                name: 'Images - For Attachments',
                description: 'Images for attachment nodes',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { imagesForAttachments: true } }
                }
            }
        ];
    }

    /**
     * Statistics feature scenarios
     */
    private static getStatisticsScenarios(): TestScenario[] {
        return [
            {
                id: 'stats-node-size-simple',
                name: 'Statistics - Node Size (Filename length)',
                description: 'Node sizes based on filename length',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { "elements-stats": true } },
                    nodesSizeFunction: "filenameLength",
                    graphStatsDirection: 'normal',
                    recomputeStatsOnGraphChange: true
                }
            },
            {
                id: 'stats-node-size-complex',
                name: 'Statistics - Node Size (Topological)',
                description: 'Node sizes based on topological propagation',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { "elements-stats": true } },
                    nodesSizeFunction: "topological",
                    graphStatsDirection: 'normal',
                    recomputeStatsOnGraphChange: true
                }
            },
            {
                id: 'stats-node-color',
                name: 'Statistics - Node Color (Closeness)',
                description: 'Node colors based on closeness centrality',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { "elements-stats": true } },
                    nodesColorFunction: "closeness",
                    graphStatsDirection: 'normal',
                    recomputeStatsOnGraphChange: true
                }
            },
            {
                id: 'stats-link-jaccard',
                name: 'Statistics - Link Color (Jaccard)',
                description: 'Link colors based on Jaccard similarity',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { "elements-stats": true } },
                    linksColorFunction: "Jaccard",
                    graphStatsDirection: 'normal',
                    recomputeStatsOnGraphChange: true
                }
            },
            {
                id: 'stats-combined',
                name: 'Statistics - Combined (Size + Color)',
                description: 'Both node size and color statistics',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { "elements-stats": true } },
                    nodesColorFunction: "betweenness",
                    nodesSizeFunction: "degree",
                    graphStatsDirection: 'normal',
                    recomputeStatsOnGraphChange: true
                }
            },
            {
                id: 'stats-betweenness-normal',
                name: 'Statistics - Node size (Betweenness)',
                description: 'Node sizes based on topological propagation',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { "elements-stats": true } },
                    nodesSizeFunction: "betweenness",
                    graphStatsDirection: 'normal',
                    recomputeStatsOnGraphChange: true
                }
            },
            {
                id: 'stats-betweenness-inverted',
                name: 'Statistics - Node size (Inverted Betweenness)',
                description: 'Node sizes based on topological propagation with inverted graph',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { "elements-stats": true } },
                    nodesSizeFunction: "betweenness",
                    graphStatsDirection: 'reversed',
                    recomputeStatsOnGraphChange: true
                }
            },
            {
                id: 'stats-betweenness-undirected',
                name: 'Statistics - Node size (Undirected Betweenness)',
                description: 'Node sizes based on topological propagation with undirected graph',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { "elements-stats": true } },
                    nodesSizeFunction: "betweenness",
                    graphStatsDirection: 'undirected',
                    recomputeStatsOnGraphChange: true
                }
            }
        ];
    }

    /**
     * Shapes feature scenarios
     */
    private static getShapesScenarios(): TestScenario[] {
        const specificShapeScenario: TestScenario[] = [];
        for (const shape of Object.values(ShapeEnum)) {
            const scenario: TestScenario =
            {
                id: `shapes-${shape}`,
                name: `Shapes - ${shape}`,
                description: `Single shapes (${shape})`,
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { shapes: true } },
                    shapeQueries: {}
                }
            };

            // @ts-ignore
            scenario.configuration.shapeQueries[shape] = {
                combinationLogic: "OR",
                index: 1,
                rules: [
                    { source: "property", property: "type", logic: "is", value: "type1" },
                    { source: "property", property: "type", logic: "is", value: "type2" },
                    { source: "property", property: "type", logic: "is", value: "type3" },
                    { source: "property", property: "type", logic: "is", value: "type4" },
                    { source: "property", property: "type", logic: "is", value: "type5" },
                    { source: "property", property: "type", logic: "is", value: "type6" },
                    { source: "property", property: "type", logic: "is", value: "type7" },
                    { source: "property", property: "type", logic: "is", value: "type8" },
                    { source: "property", property: "type", logic: "is", value: "type9" },
                    { source: "property", property: "type", logic: "is", value: "type10" }
                ]
            };
            specificShapeScenario.push()
        }
        return [
            {
                id: 'shapes-all',
                name: 'Shapes - All Available',
                description: 'All shape types enabled',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { shapes: true } },
                    shapeQueries: {
                        square: {
                            combinationLogic: "OR",
                            index: 1,
                            rules: [
                                { source: "property", property: "type", logic: "is", value: "type1" }
                            ]
                        },
                        decagon: {
                            combinationLogic: "OR",
                            index: 1,
                            rules: [
                                { source: "property", property: "type", logic: "is", value: "type2" }
                            ]
                        },
                        diamond: {
                            combinationLogic: "OR",
                            index: 1,
                            rules: [
                                { source: "property", property: "type", logic: "is", value: "type3" }
                            ]
                        },
                        hexagon: {
                            combinationLogic: "OR",
                            index: 1,
                            rules: [
                                { source: "property", property: "type", logic: "is", value: "type4" }
                            ]
                        },
                        octagon: {
                            combinationLogic: "OR",
                            index: 1,
                            rules: [
                                { source: "property", property: "type", logic: "is", value: "type5" }
                            ]
                        },
                        pentagon: {
                            combinationLogic: "OR",
                            index: 1,
                            rules: [
                                { source: "property", property: "type", logic: "is", value: "type6" }
                            ]
                        },
                        star4: {
                            combinationLogic: "OR",
                            index: 1,
                            rules: [
                                { source: "property", property: "type", logic: "is", value: "type7" }
                            ]
                        },
                        star5: {
                            combinationLogic: "OR",
                            index: 1,
                            rules: [
                                { source: "property", property: "type", logic: "is", value: "type8" }
                            ]
                        },
                        star6: {
                            combinationLogic: "OR",
                            index: 1,
                            rules: [
                                { source: "property", property: "type", logic: "is", value: "type9" }
                            ]
                        },
                        star10: {
                            combinationLogic: "OR",
                            index: 1,
                            rules: [
                                { source: "property", property: "type", logic: "is", value: "type10" }
                            ]
                        },
                    }
                }
            }
        ];
    }

    /**
     * Icons feature scenarios
     */
    private static getIconsScenarios(): TestScenario[] {
        return [
            {
                id: 'icons-only',
                name: 'Icons - From Properties',
                description: 'Icons loaded from note properties',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { icons: true } },
                    iconProperties: ['icon'],
                    usePluginForIcon: false,
                    usePluginForIconColor: false,
                    useParentIcon: false,
                    backgroundOpacityWithIcon: 0,
                    useIconColorForBackgroud: false,
                    borderWidthWithIcon: 0
                }
            },
            {
                id: 'icons-emoji-only',
                name: 'Icons - From Properties (emoji)',
                description: 'Emojis loaded from note properties',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { icons: true } },
                    iconProperties: ['emoji'],
                    usePluginForIcon: false,
                    usePluginForIconColor: false,
                    useParentIcon: false,
                    backgroundOpacityWithIcon: 0,
                    useIconColorForBackgroud: false,
                    borderWidthWithIcon: 0
                }
            },
            {
                id: 'icons-with-background',
                name: 'Icons - With Backgrounds',
                description: 'Icons with colored backgrounds and borders',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { icons: true } },
                    iconProperties: ['icon', 'emoji'],
                    usePluginForIcon: false,
                    usePluginForIconColor: false,
                    useParentIcon: false,
                    backgroundOpacityWithIcon: 0.3,
                    useIconColorForBackgroud: true,
                    borderWidthWithIcon: 0
                }
            },
            {
                id: 'icons-with-background',
                name: 'Icons - With Borders',
                description: 'Icons with colored backgrounds and borders',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { icons: true } },
                    iconProperties: ['icon', 'emoji'],
                    usePluginForIcon: false,
                    usePluginForIconColor: false,
                    useParentIcon: false,
                    backgroundOpacityWithIcon: 0,
                    useIconColorForBackgroud: false,
                    borderWidthWithIcon: 8
                }
            }
        ];
    }

    /**
     * Arrows feature scenarios
     */
    private static getArrowsScenarios(): TestScenario[] {
        return [
            {
                id: 'arrows-basic-modifications',
                name: 'Arrows - Basic Modifications',
                description: 'Basic arrow modifications (scale, opacity)',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { arrows: true } },
                }
            },
            {
                id: 'arrows-triangular',
                name: 'Arrows - Triangular Shape',
                description: 'Triangle-shaped arrows',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { arrows: true } },
                    flatArrows: true
                }
            },
            {
                id: 'arrows-custom-color',
                name: 'Arrows - Custom Color',
                description: 'Arrows with custom color override',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { arrows: true } },
                    arrowColorBool: true,
                    arrowColor: '#ff6b35'
                }
            },
            {
                id: 'arrows-fixed-size',
                name: 'Arrows - Fixed Size',
                description: 'Arrows that don\'t scale with zoom',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { arrows: true } },
                    arrowFixedSize: true,
                }
            },
            {
                id: 'arrows-always-opaquer',
                name: 'Arrows - Always opaque',
                description: 'Arrows will never fade out',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { arrows: true } },
                    alwaysOpaqueArrows: true,
                }
            },
            {
                id: 'arrows-scale-up',
                name: 'Arrows - Scale up',
                description: 'Arrows scaled up twice their original size',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { arrows: true } },
                    arrowScale: 2,
                }
            }
        ];
    }

    /**
     * Names feature scenarios
     */
    private static getNamesScenarios(): TestScenario[] {
        return [
            {
                id: 'names-basic-modifications',
                name: 'Names - Basic Modifications',
                description: 'Filename only, no extensions',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { names: true } },
                    showOnlyFileName: true,
                    noExtension: true,
                }
            },
            {
                id: 'names-from-properties',
                name: 'Names - From Properties',
                description: 'Display names from note properties instead of filenames',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { names: true } },
                    usePropertiesForName: ['title'],
                }
            },
            {
                id: 'names-dynamic-positioning',
                name: 'Names - Dynamic Positioning',
                description: 'Dynamic vertical positioning to avoid overlaps',
                category: 'feature-specific',
                configuration: {
                    enableFeatures: { graph: { names: true } },
                    dynamicVerticalOffset: true,
                }
            }
        ];
    }

    /**
     * Get scenarios by category
     */
    static getScenariosByCategory(category: TestScenario['category']): TestScenario[] {
        const allScenarios = this.getAllScenarios();
        return Object.values(allScenarios).flat().filter(scenario => scenario.category === category);
    }
}