/**
 * Core benchmark runner for Extended Graph Plugin
 * Main orchestrator for performance testing
 */

import { App, normalizePath, Notice } from "obsidian";
import { DEFAULT_SETTINGS, ExtendedGraphInstances, ExtendedGraphSettings, getActiveGraphView } from "../internal";
import { BenchmarkScenarios } from "./benchmarkScenarios";
import { BenchmarkResult, BenchmarkOptions, BenchmarkReport, TestScenario, BenchmarkMetrics, RecursivePartial } from "./benchmarkTypes";
import { BenchmarkAnalyzer } from "./benchmarkAnalyzer";
import { MetricsCollector } from "./benchmarkMetrics";
import { BenchmarkReporter } from "./benchmarkReporter";
import { EnvironmentInfo } from "./benchmarkTestEnvironment";
import { GraphView } from "obsidian-typings";
import ExtendedGraphPlugin from "../main";
import { FederatedEvent, FederatedPointerEvent } from "pixi.js";

export class ExtendedGraphBenchmarkRunner {
    private app: App;
    private plugin: ExtendedGraphPlugin;
    private environment: EnvironmentInfo;
    private analyzer: BenchmarkAnalyzer;
    private reporter: BenchmarkReporter;
    private view?: GraphView;

    private isRunning = false;
    private currentTest: string | null = null;
    private results: BenchmarkResult[] = [];
    private startTime: number = 0;

    constructor(app: App, plugin: ExtendedGraphPlugin) {
        this.app = app;
        this.plugin = plugin;
        this.environment = new EnvironmentInfo(app, plugin);
        this.analyzer = new BenchmarkAnalyzer();
        this.reporter = new BenchmarkReporter(app);

        this.addCommands();
    }

    private addCommands() {
        this.plugin.addCommand({
            id: 'run-comprehensive-benchmark',
            name: 'Run Comprehensive Performance Benchmark',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const graphView = getActiveGraphView(this.plugin);
                if (graphView?.getViewType() === "graph") {
                    this.view = graphView as GraphView;
                    if (!checking) {
                        this.runBenchmarkSuite({
                            scenarios: Object.values(BenchmarkScenarios.getAllScenarios()).flatMap(scenarios => scenarios.map(scenario => scenario.id)),
                            iterations: 5,
                            outputDirectory: normalizePath(this.plugin.manifest.dir + "/benchmarks/"),
                            exportFormats: ['json', 'csv', 'html', 'md']
                        }).then(report => {
                            console.log('Benchmark completed:', report.testSuite);
                        });
                    }
                    return true;
                }

            }
        });

        // Test rapide
        this.plugin.addCommand({
            id: 'quick-performance-check',
            name: 'Quick Performance Check',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const graphView = getActiveGraphView(this.plugin);
                if (graphView?.getViewType() === "graph") {
                    this.view = graphView as GraphView;
                    if (!checking) {
                        this.runQuickCheck().then(result => {
                            new Notice(`Performance: ${result.performance} (${result.details.avgInitTime}ms avg)`);
                        });
                    }
                    return true;
                }
            }
        });
    }

    /**
     * Run the complete benchmark suite
     */
    async runBenchmarkSuite(options: Partial<BenchmarkOptions> = {}): Promise<BenchmarkReport> {
        if (this.isRunning) {
            throw new Error('Benchmark suite is already running');
        }

        const fullOptions = this.validateAndCompleteOptions(options);

        this.isRunning = true;
        this.startTime = Date.now();
        this.results = [];

        new Notice('🧪 Extended Graph Benchmark Suite Starting...');
        console.log('🧪 Extended Graph Benchmark Suite Started', fullOptions);

        try {
            await this.initializeBenchmark(fullOptions);

            const scenarios = this.getScenarios(fullOptions);
            console.log(`📋 Running ${scenarios.length} scenarios`);

            // Run baseline first if requested
            if (fullOptions.includeBaseline) {
                await this.runBaselineTests(fullOptions);
            }

            // Run main scenarios
            for (const scenario of scenarios) {
                await this.runScenario(scenario, fullOptions);

                // Garbage collection between scenarios if requested
                if (fullOptions.collectGarbageAfterEach) {
                    await this.performGarbageCollection();
                }

                // Cooldown between scenarios
                if (fullOptions.cooldownTime > 0) {
                    await this.wait(fullOptions.cooldownTime);
                }
            }

            const report = await this.generateReport(fullOptions);

            new Notice('✅ Benchmark suite completed successfully!');
            console.log('✅ Benchmark suite completed', {
                totalTests: this.results.length,
                duration: Date.now() - this.startTime
            });

            return report;

        } catch (error) {
            console.error('❌ Benchmark suite failed:', error);
            new Notice(`❌ Benchmark failed: ${error.message}`);
            throw error;
        } finally {
            this.isRunning = false;
            this.currentTest = null;
        }
    }

    /**
     * Run a single test scenario
     */
    async runScenario(scenario: TestScenario, options: BenchmarkOptions): Promise<BenchmarkResult[]> {
        console.log(`📊 Running scenario: ${scenario.name}`);
        const scenarioResults: BenchmarkResult[] = [];

        // Run warmup iterations
        for (let w = 0; w < options.warmupRuns; w++) {
            try {
                await this.runSingleTest(scenario, w + 1, options, true);
            } catch (error) {
                console.warn(`Warmup iteration ${w + 1} failed:`, error.message);
            }
            await this.wait(500);
        }

        // Run actual test iterations
        for (let i = 0; i < options.iterations; i++) {
            try {
                const result = await this.runSingleTest(scenario, i + 1, options, false);
                scenarioResults.push(result);
                this.results.push(result);

                console.log(`    ✅ Iteration ${i + 1}/${options.iterations} completed`);
            } catch (error) {
                console.error(`    ❌ Iteration ${i + 1}/${options.iterations} failed:`, error);

                const errorResult: BenchmarkResult = {
                    scenarioId: scenario.id,
                    scenarioName: scenario.name,
                    configuration: scenario.configuration,
                    iteration: i + 1,
                    timestamp: Date.now(),
                    metrics: {} as BenchmarkMetrics,
                    systemInfo: this.environment.getSystemInfo(),
                    error: error.message
                };

                scenarioResults.push(errorResult);
                this.results.push(errorResult);
            }

            // Brief pause between iterations
            await this.wait(1000);
        }

        return scenarioResults;
    }

    /**
     * Run a single test iteration
     */
    private async runSingleTest(
        scenario: TestScenario,
        iteration: number,
        options: BenchmarkOptions,
        isWarmup: boolean = false
    ): Promise<BenchmarkResult> {
        const testId = `${scenario.id}-${iteration}`;
        this.currentTest = testId;

        const metricsCollector = new MetricsCollector();

        try {
            // Mark test phases
            performance.mark(`test-${testId}-start`);
            metricsCollector.start();

            // Configure plugin features
            await this.configurePlugin(scenario.configuration);

            // 1. Initialize and measure startup
            metricsCollector.markPhase('plugin-initialization');
            await this.initializePlugin();

            // 2. Measure interaction performance
            metricsCollector.markPhase('eg-interaction-testing');
            await this.measureInteractions(metricsCollector);

            // 4. Measure feature-specific performance
            //if (scenario.configuration) {
            //    metricsCollector.markPhase('feature-testing');
            //    await this.measureFeaturePerformance(scenario.configuration, metricsCollector);
            //}

            //performance.mark(`test-${testId}-end`);
            //performance.measure(`test-${testId}`, `test-${testId}-start`, `test-${testId}-end`);

            const metrics = metricsCollector.end();

            return {
                scenarioId: scenario.id,
                scenarioName: scenario.name,
                configuration: scenario.configuration,
                iteration,
                timestamp: Date.now(),
                metrics,
                systemInfo: this.environment.getSystemInfo()
            };

        } catch (error) {
            console.error(error);
            performance.mark(`test-${testId}-error`);
            throw error;
        } finally {
            await this.disablePlugin();
            this.currentTest = null;
        }
    }

    /**
     * Configure plugin for specific test scenario
     */
    private async configurePlugin(settings?: RecursivePartial<ExtendedGraphSettings>): Promise<void> {
        if (settings) {
            this.plugin.loadSettingsRec(DEFAULT_SETTINGS, settings);
        }
        else {
            settings = DEFAULT_SETTINGS;
        }
        settings.maxNodes = 1000;

        // @ts-ignore
        ExtendedGraphInstances.settings = settings;
        await this.plugin.saveSettings();
    }

    /**
     * Measure interaction performance
     */
    private async measureInteractions(collector: MetricsCollector): Promise<void> {
        // Zoom interaction
        /*await collector.measureInteraction('zoom', async () => {
            await this.simulateZoom(4, 1);
            await this.simulateZoom(4, -1);
        });

        // Pan interaction
        await collector.measureInteraction('pan', async () => {
            await this.simulatePan(0.8, 0);
            await this.simulatePan(-0.7, 0.6);
        });
        */

        // Hover interaction
        await collector.measureInteraction('hover', async () => {
            await this.simulateNodeHover();
        });

        /*
        // Filter interaction (if applicable)
        await collector.measureInteraction('filter', async () => {
            await this.simulateFilterToggle();
        });

        // Node selection
        await collector.measureInteraction('nodeSelection', async () => {
            await this.simulateNodeSelection();
        });

        // Legend interaction
        await collector.measureInteraction('legendInteraction', async () => {
            await this.simulateLegendInteraction();
        });
        */
    }

    /**
     * Measure feature-specific performance
     */
    private async measureFeaturePerformance(
        configuration: RecursivePartial<ExtendedGraphSettings>,
        collector: MetricsCollector
    ): Promise<void> {
        if (configuration.enableFeatures?.graph?.imagesFromProperty ||
            configuration.enableFeatures?.graph?.imagesFromEmbeds ||
            configuration.enableFeatures?.graph?.imagesForAttachments) {

            const startTime = performance.now();
            // Wait for images to load
            await this.waitForImagesLoaded();
            collector.recordFeatureMetric('imageLoadTime', performance.now() - startTime);
        }

        if (configuration.enableFeatures?.graph?.["elements-stats"]) {
            const startTime = performance.now();
            // Trigger statistics computation
            await this.triggerStatisticsComputation();
            collector.recordFeatureMetric('statisticsComputeTime', performance.now() - startTime);
        }

        if (configuration.enableFeatures?.graph?.shapes) {
            const startTime = performance.now();
            // Measure shape rendering
            await this.measureShapeRendering();
            collector.recordFeatureMetric('shapeRenderTime', performance.now() - startTime);
        }

        if (configuration.enableFeatures?.graph?.icons) {
            const startTime = performance.now();
            // Wait for icons to load
            await this.waitForIconsLoaded();
            collector.recordFeatureMetric('iconLoadTime', performance.now() - startTime);
        }

        if (configuration.enableFeatures?.graph?.tags || configuration.enableFeatures?.graph?.properties) {
            const startTime = performance.now();
            // Measure arc rendering
            await this.measureArcRendering();
            collector.recordFeatureMetric('nodesInteractives', performance.now() - startTime);
        }

        if (configuration.enableFeatures?.graph?.links) {
            const startTime = performance.now();
            // Measure folder rendering
            await this.measureFolderRendering();
            collector.recordFeatureMetric('linksInteractives', performance.now() - startTime);
        }
    }

    /**
     * Generate comprehensive benchmark report
     */
    private async generateReport(options: BenchmarkOptions): Promise<BenchmarkReport> {
        console.log('📈 Generating benchmark report...');

        const aggregatedResults = this.analyzer.aggregateResults(this.results);
        const analysis = this.analyzer.performAnalysis(aggregatedResults, this.results);
        const recommendations = this.analyzer.generateRecommendations(analysis);

        const report: BenchmarkReport = {
            metadata: {
                timestamp: new Date().toISOString(),
                duration: Date.now() - this.startTime,
                version: this.plugin.manifest.version,
                gitCommit: process.env.GIT_COMMIT
            },
            system: this.environment.getSystemInfo(),
            testSuite: {
                totalScenarios: new Set(this.results.map(r => r.scenarioId)).size,
                totalTests: this.results.length,
                successfulTests: this.results.filter(r => !r.error).length,
                failedTests: this.results.filter(r => r.error).length,
                categories: this.analyzer.categorizeResults(this.results)
            },
            results: aggregatedResults,
            analysis,
            recommendations,
            exports: {
                csv: this.reporter.generateCSV(aggregatedResults),
                charts: options.generateCharts ? this.reporter.generateChartData(aggregatedResults) : []
            }
        };

        // Save report in requested formats
        if (options.exportFormats.includes('json')) {
            await this.reporter.saveJSON(report, options.outputDirectory);
        }
        if (options.exportFormats.includes('csv')) {
            await this.reporter.saveCSV(report.exports.csv, options.outputDirectory);
        }
        if (options.exportFormats.includes('html')) {
            await this.reporter.saveHTML(report, options.outputDirectory);
        }
        if (options.exportFormats.includes('md')) {
            await this.reporter.saveMarkdown(report, options.outputDirectory);
        }

        return report;
    }

    // Simulation methods
    private async simulateZoom(count: number, direction: number): Promise<void> {
        if (!this.view) return;
        const renderer = this.view.renderer;
        const wheelEvent = new WheelEvent('wheel', {
            deltaY: 100 * direction,
            bubbles: true,
            cancelable: true,
            clientX: renderer.interactiveEl.clientLeft + renderer.interactiveEl.clientWidth * 0.5,
            clientY: renderer.interactiveEl.clientTop + renderer.interactiveEl.clientHeight * 0.5,
        });

        // Fire wheel events sequentially, awaiting 200ms between each
        for (let i = 0; i < count; ++i) {
            renderer.interactiveEl.dispatchEvent(wheelEvent);
            await this.wait(200);
        }

        // Start listening to setScale only after all wheel events have been fired
        await new Promise<void>(resolve => {
            ExtendedGraphInstances.proxysManager.registerProxy<typeof renderer.setScale>(renderer, "setScale", {
                apply(target, thisArg, argArray) {
                    const oldScale = renderer.scale;
                    const res = Reflect.apply(target, thisArg, argArray);
                    const newScale = renderer.scale;
                    if (oldScale === newScale) {
                        ExtendedGraphInstances.proxysManager.unregisterProxy(renderer.setScale);
                        resolve();
                    }
                    return res;
                },
            });
        });
    }

    private async simulatePan(factorX: number, factorY: number): Promise<void> {
        console.log("simulatePan");
        if (!this.view) return;
        const renderer = this.view.renderer;
        const middle = {
            x: renderer.interactiveEl.clientLeft + renderer.interactiveEl.clientWidth * 0.5,
            y: renderer.interactiveEl.clientTop + renderer.interactiveEl.clientHeight * 0.5,
        }

        renderer.interactiveEl.dispatchEvent(new PointerEvent('pointerdown', {
            clientX: middle.x,
            clientY: middle.y,
            button: 0
        }));

        const count = 40;
        for (let i = 0; i < count; ++i) {
            renderer.interactiveEl.dispatchEvent(new PointerEvent('pointermove', {
                clientX: middle.x + (factorX !== 0 ? (factorX * renderer.interactiveEl.clientWidth) * (i + 1) / count : 0),
                clientY: middle.y + (factorY !== 0 ? (factorY * renderer.interactiveEl.clientHeight) * (i + 1) / count : 0),
                button: 0
            }));
            await this.wait(50);
        }

        await new Promise<void>(resolve => {
            ExtendedGraphInstances.proxysManager.registerProxy<typeof renderer.setPan>(renderer, "setPan", {
                apply(target, thisArg, argArray) {
                    const oldPanX = renderer.panX;
                    const oldPanY = renderer.panY;
                    const res = Reflect.apply(target, thisArg, argArray);
                    const newPanX = renderer.panX;
                    const newPanY = renderer.panY;
                    if (oldPanX === newPanX && oldPanY === newPanY) {
                        ExtendedGraphInstances.proxysManager.unregisterProxy(renderer.setPan);
                        resolve();
                    }
                    return res;
                },
            });
        });

        renderer.interactiveEl.dispatchEvent(new PointerEvent('pointerup', {
            clientX: middle.x,
            clientY: middle.y,
            button: 0
        }));
    }

    private async simulateNodeHover(): Promise<void> {
        // TODO: Simulate hovering over nodes
        await this.wait(50);
    }

    private async simulateFilterToggle(): Promise<void> {
        // TODO: Simulate toggling filters in legend
        await this.wait(200);
    }

    private async simulateNodeSelection(): Promise<void> {
        // TODO: Simulate selecting nodes
        await this.wait(100);
    }

    private async simulateLegendInteraction(): Promise<void> {
        // TODO: Simulate interacting with legend
        await this.wait(150);
    }

    // Measurement methods
    private async waitForRenderComplete(): Promise<void> {
        // TODO: Wait for initial rendering to complete
        await this.wait(1000);
    }

    private async waitForImagesLoaded(): Promise<void> {
        // TODO: Wait for images to finish loading
        await this.wait(2000);
    }

    private async waitForIconsLoaded(): Promise<void> {
        // TODO: Wait for icons to finish loading
        await this.wait(1000);
    }

    private async triggerStatisticsComputation(): Promise<void> {
        // TODO: Trigger statistics recalculation
        await this.wait(500);
    }

    private async measureShapeRendering(): Promise<void> {
        // TODO: Measure shape rendering performance
        await this.wait(300);
    }

    private async measureArcRendering(): Promise<void> {
        // TODO: Measure arc rendering performance
        await this.wait(400);
    }

    private async measureFolderRendering(): Promise<void> {
        // TODO: Measure folder rendering performance
        await this.wait(300);
    }

    // Utility methods
    private validateAndCompleteOptions(options: Partial<BenchmarkOptions>): BenchmarkOptions {
        return {
            iterations: options.iterations || 3,
            scenarios: options.scenarios || [],
            outputDirectory: options.outputDirectory || normalizePath(this.plugin.manifest.dir + "/benchmarks/"),
            includeBaseline: options.includeBaseline !== false,
            includeStress: options.includeStress || false,
            warmupRuns: options.warmupRuns || 1,
            cooldownTime: options.cooldownTime || 1000,
            collectGarbageAfterEach: options.collectGarbageAfterEach || true,
            generateCharts: options.generateCharts !== false,
            exportFormats: options.exportFormats || ['json', 'csv', 'html', 'md']
        };
    }

    private getScenarios(options: BenchmarkOptions): TestScenario[] {
        let scenarios = BenchmarkScenarios.getScenarios(options.scenarios);

        // Add stress scenarios if requested
        if (options.includeStress) {
            const stressScenarios = BenchmarkScenarios.getScenariosByCategory('stress');
            scenarios = scenarios.concat(stressScenarios);
        }

        return scenarios;
    }

    private async runBaselineTests(options: BenchmarkOptions): Promise<void> {
        console.log('📏 Running baseline tests...');
        const baselineScenarios = BenchmarkScenarios.getScenariosByCategory('baseline');

        for (const scenario of baselineScenarios) {
            await this.runScenario(scenario, options);
        }
    }

    private async initializeBenchmark(options: BenchmarkOptions): Promise<void> {
        // Setup output directory
        const outputPath = options.outputDirectory;
        if (!(await this.app.vault.adapter.exists(outputPath))) {
            await this.app.vault.adapter.mkdir(outputPath);
        }
    }

    private async initializePlugin(): Promise<void> {
        if (!this.view) return;
        ExtendedGraphInstances.graphsManager.enablePlugin(this.view);
        await new Promise<void>(resolve => {
            ExtendedGraphInstances.app.workspace.on('extended-graph:enabled-in-view', (view) => {
                console.log("Plugin enabled");
                resolve();
            });
        });
    }

    private async disablePlugin(): Promise<void> {
        if (!this.view) return;
        ExtendedGraphInstances.graphsManager.disablePlugin(this.view);
        await new Promise<void>(resolve => {
            ExtendedGraphInstances.app.workspace.on('extended-graph:disabled-in-view', (view) => {
                console.log("Plugin enabled");
                resolve();
            });
        });
    }

    private async performGarbageCollection(): Promise<void> {
        // Force garbage collection if possible
        if ((window as any).gc) {
            (window as any).gc();
        }
        await this.wait(1000);
    }

    private wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public utility methods
    public isCurrentlyRunning(): boolean {
        return this.isRunning;
    }

    public getCurrentTest(): string | null {
        return this.currentTest;
    }

    public getProgress(): { completed: number; total: number } {
        // Calculate progress based on completed tests
        return {
            completed: this.results.length,
            total: 0 // Would be calculated based on selected scenarios
        };
    }

    /**
     * Run quick performance check
     */
    async runQuickCheck(): Promise<{ performance: 'good' | 'fair' | 'poor'; details: any }> {
        const quickScenarios = ['baseline-core', 'tags-basic', 'links-basic'];
        const results = await this.runBenchmarkSuite({
            scenarios: quickScenarios,
            iterations: 1,
            warmupRuns: 0,
            exportFormats: ["json"]
        });

        const avgInitTime = results.results
            .map(r => r.aggregatedMetrics.initializationTime.mean)
            .reduce((a, b) => a + b, 0) / results.results.length;

        let performance: 'good' | 'fair' | 'poor';
        if (avgInitTime < 1000) {
            performance = 'good';
        } else if (avgInitTime < 3000) {
            performance = 'fair';
        } else {
            performance = 'poor';
        }

        return {
            performance,
            details: {
                avgInitTime,
                recommendedMaxNodes: performance === 'good' ? 1000 : performance === 'fair' ? 400 : 200
            }
        };
    }
}