import { Feature } from "../internal";
import { BenchmarkResult, AggregatedResult, PerformanceAnalysis, BenchmarkRecommendation, TestScenario, StatisticalSummary } from "./benchmarkTypes";

export class BenchmarkAnalyzer {

    /**
     * Aggregate benchmark results by scenario and node count
     */
    aggregateResults(results: BenchmarkResult[]): AggregatedResult[] {
        const grouped = new Map<string, BenchmarkResult[]>();

        // Group results by scenario
        results.forEach(result => {
            if (!grouped.has(result.scenarioId)) {
                grouped.set(result.scenarioId, []);
            }
            grouped.get(result.scenarioId)!.push(result);
        });

        return Array.from(grouped.entries()).map(([key, resultGroup]) => {
            const validResults = resultGroup.filter(r => !r.error);
            const firstResult = resultGroup[0];

            return {
                scenarioId: firstResult.scenarioId,
                scenarioName: firstResult.scenarioName,
                category: this.determineCategory(firstResult.scenarioId),
                iterations: validResults.length,
                totalIterations: resultGroup.length,
                errors: resultGroup.filter(r => r.error).length,
                warnings: resultGroup.filter(r => r.warnings && r.warnings.length > 0).length,
                aggregatedMetrics: this.aggregateMetrics(validResults.map(r => r.metrics))
            };
        });
    }

    /**
     * Perform comprehensive performance analysis
     */
    performAnalysis(
        aggregatedResults: AggregatedResult[],
        rawResults: BenchmarkResult[]
    ): PerformanceAnalysis {
        const baselinePerformance = this.calculateBaselinePerformance(aggregatedResults);
        const featureImpact = this.analyzeFeatureImpact(aggregatedResults, rawResults);
        const bottlenecks = this.identifyBottlenecks(aggregatedResults, rawResults);

        return {
            baselinePerformance,
            featureImpact,
            bottlenecks
        };
    }

    /**
     * Generate performance recommendations based on analysis
     */
    generateRecommendations(analysis: PerformanceAnalysis): BenchmarkRecommendation[] {
        const recommendations: BenchmarkRecommendation[] = [];

        // Analyze bottlenecks and create recommendations
        analysis.bottlenecks.forEach(bottleneck => {
            if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
                recommendations.push({
                    type: 'performance',
                    priority: bottleneck.severity === 'critical' ? 'critical' : 'high',
                    title: `Optimize ${bottleneck.feature}`,
                    description: bottleneck.description,
                    suggestedActions: [bottleneck.suggestedAction],
                    affectedFeatures: [bottleneck.feature as Feature],
                    estimatedImpact: this.estimateOptimizationImpact(bottleneck)
                });
            }
        });

        // Analyze feature impact and recommend optimizations
        Object.entries(analysis.featureImpact).forEach(([feature, impact]) => {
            if (impact.initializationOverhead > 2000) { // > 2 seconds overhead
                recommendations.push({
                    type: 'optimization',
                    priority: 'high',
                    title: `Reduce ${feature} initialization time`,
                    description: `Feature ${feature} adds significant initialization overhead (${Math.round(impact.initializationOverhead)}ms)`,
                    suggestedActions: [
                        'Consider lazy loading for this feature',
                        'Optimize data structures used during initialization',
                        'Cache computation results where possible'
                    ],
                    affectedFeatures: [feature as Feature],
                    estimatedImpact: `Could reduce initialization time by ${Math.round(impact.initializationOverhead * 0.3)}ms`
                });
            }

            if (impact.memoryOverhead > 50 * 1024 * 1024) { // > 50MB overhead
                recommendations.push({
                    type: 'optimization',
                    priority: 'medium',
                    title: `Reduce ${feature} memory usage`,
                    description: `Feature ${feature} consumes significant memory (${Math.round(impact.memoryOverhead / 1024 / 1024)}MB)`,
                    suggestedActions: [
                        'Implement object pooling for frequently created objects',
                        'Use more memory-efficient data structures',
                        'Clean up unused resources more aggressively'
                    ],
                    affectedFeatures: [feature as Feature],
                    estimatedImpact: `Could reduce memory usage by ${Math.round(impact.memoryOverhead * 0.2 / 1024 / 1024)}MB`
                });
            }
        });

        // General performance recommendations
        const overallInitTime = analysis.baselinePerformance['initialization'];
        if (overallInitTime > 5000) {
            recommendations.push({
                type: 'performance',
                priority: 'critical',
                title: 'Overall initialization time is too high',
                description: `Average initialization time is ${Math.round(overallInitTime)}ms, which may cause user experience issues`,
                suggestedActions: [
                    'Review initialization sequence for optimization opportunities',
                    'Implement progressive loading of features',
                    'Consider deferring non-critical feature initialization'
                ],
                affectedFeatures: [],
                estimatedImpact: 'Could improve user experience significantly'
            });
        }

        // Sort recommendations by priority
        return this.sortRecommendationsByPriority(recommendations);
    }

    /**
     * Categorize results by test scenario type
     */
    categorizeResults(results: BenchmarkResult[]): Record<TestScenario['category'], number> {
        const categories: Record<TestScenario['category'], number> = {
            'baseline': 0,
            'feature-specific': 0,
            'integration': 0,
            'stress': 0
        };

        results.forEach(result => {
            const category = this.determineCategory(result.scenarioId);
            categories[category]++;
        });

        return categories;
    }

    /**
     * Aggregate metrics from multiple test runs
     */
    private aggregateMetrics(metricsArray: any[]): AggregatedResult['aggregatedMetrics'] {
        if (metricsArray.length === 0) {
            throw new Error('Cannot aggregate empty metrics array');
        }

        const result: any = {};

        // Define metric keys to aggregate
        const simpleMetrics = ['initializationTime', 'renderTime', 'nodeProcessingTime', 'linkProcessingTime'];
        const nestedMetrics = ['memoryUsage', 'frameRate', 'interactionTimes', 'featureMetrics'];

        // Aggregate simple metrics
        simpleMetrics.forEach(metric => {
            const values = metricsArray
                .map(m => m[metric])
                .filter(v => typeof v === 'number' && !isNaN(v));

            if (values.length > 0) {
                result[metric] = this.calculateStatistics(values);
            } else {
                result[metric] = this.createEmptyStatistics();
            }
        });

        // Aggregate nested metrics
        nestedMetrics.forEach(metric => {
            result[metric] = {};

            // Get all possible keys for this nested metric
            const allKeys = new Set<string>();
            metricsArray.forEach(m => {
                if (m[metric] && typeof m[metric] === 'object') {
                    Object.keys(m[metric]).forEach(key => allKeys.add(key));
                }
            });

            // Aggregate each key
            allKeys.forEach(key => {
                const values = metricsArray
                    .map(m => m[metric]?.[key])
                    .filter(v => typeof v === 'number' && !isNaN(v));

                if (values.length > 0) {
                    result[metric][key] = this.calculateStatistics(values);
                } else {
                    result[metric][key] = this.createEmptyStatistics();
                }
            });
        });

        return result as AggregatedResult['aggregatedMetrics'];
    }

    /**
     * Calculate statistical summary from array of values
     */
    private calculateStatistics(values: number[]): StatisticalSummary {
        if (values.length === 0) {
            return this.createEmptyStatistics();
        }

        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

        // Calculate percentiles
        const q25Index = Math.floor(sorted.length * 0.25);
        const q75Index = Math.floor(sorted.length * 0.75);
        const medianIndex = Math.floor(sorted.length * 0.5);

        // Identify outliers using IQR method
        const q25 = sorted[q25Index];
        const q75 = sorted[q75Index];
        const iqr = q75 - q25;
        const lowerBound = q25 - 1.5 * iqr;
        const upperBound = q75 + 1.5 * iqr;
        const outliers = values.filter(v => v < lowerBound || v > upperBound);

        return {
            mean,
            median: sorted.length % 2 === 0
                ? (sorted[medianIndex - 1] + sorted[medianIndex]) / 2
                : sorted[medianIndex],
            min: sorted[0],
            max: sorted[sorted.length - 1],
            std: Math.sqrt(variance),
            q25,
            q75,
            outliers: outliers.length > 0 ? outliers : undefined
        };
    }

    /**
     * Create empty statistical summary
     */
    private createEmptyStatistics(): StatisticalSummary {
        return {
            mean: 0,
            median: 0,
            min: 0,
            max: 0,
            std: 0,
            q25: 0,
            q75: 0
        };
    }

    /**
     * Calculate baseline performance metrics
     */
    private calculateBaselinePerformance(results: AggregatedResult[]): Record<string, number> {
        const baselineResults = results.filter(r =>
            r.scenarioId.includes('baseline') || r.category === 'baseline'
        );

        if (baselineResults.length === 0) {
            console.warn('No baseline results found for performance calculation');
            return {};
        }

        // Average baseline metrics across different node counts
        const baselineMetrics: Record<string, number> = {};

        baselineResults.forEach(result => {
            Object.entries(result.aggregatedMetrics).forEach(([metric, stats]) => {
                if (typeof stats === 'object' && 'mean' in stats) {
                    if (!baselineMetrics[metric]) {
                        baselineMetrics[metric] = 0;
                    }
                    baselineMetrics[metric] += stats.mean;
                }
            });
        });

        // Calculate averages
        Object.keys(baselineMetrics).forEach(metric => {
            baselineMetrics[metric] /= baselineResults.length;
        });

        return baselineMetrics;
    }

    /**
     * Analyze impact of individual features on performance
     */
    private analyzeFeatureImpact(
        aggregatedResults: AggregatedResult[],
        rawResults: BenchmarkResult[]
    ): Record<Feature, any> {
        const featureImpact: Record<string, any> = {};

        // Group results by features used
        const featureGroups = new Map<string, AggregatedResult[]>();

        aggregatedResults.forEach(result => {
            const features = this.extractFeaturesFromScenario(result.scenarioId);
            features.forEach(feature => {
                if (!featureGroups.has(feature)) {
                    featureGroups.set(feature, []);
                }
                featureGroups.get(feature)!.push(result);
            });
        });

        // Calculate impact for each feature
        featureGroups.forEach((results, feature) => {
            const baselineResults = aggregatedResults.filter(r => r.category === 'baseline');

            if (baselineResults.length === 0) {
                return;
            }

            const avgBaseline = this.calculateAverageMetrics(baselineResults);
            const avgFeature = this.calculateAverageMetrics(results);

            featureImpact[feature] = {
                initializationOverhead: avgFeature.initializationTime - avgBaseline.initializationTime,
                renderingOverhead: avgFeature.renderTime - avgBaseline.renderTime,
                memoryOverhead: avgFeature.memoryDelta - avgBaseline.memoryDelta,
                interactionOverhead: avgFeature.avgInteractionTime - avgBaseline.avgInteractionTime
            };
        });

        return featureImpact as Record<Feature, any>;
    }

    /**
     * Identify performance bottlenecks
     */
    private identifyBottlenecks(
        aggregatedResults: AggregatedResult[],
        rawResults: BenchmarkResult[]
    ): PerformanceAnalysis['bottlenecks'] {
        const bottlenecks: PerformanceAnalysis['bottlenecks'] = [];

        // Analyze each result for potential bottlenecks
        aggregatedResults.forEach(result => {
            const metrics = result.aggregatedMetrics;

            // Check initialization time
            if (metrics.initializationTime.mean > 5000) { // > 5 seconds
                bottlenecks.push({
                    feature: result.scenarioId,
                    metric: 'initializationTime',
                    severity: 'critical',
                    description: `Initialization takes ${Math.round(metrics.initializationTime.mean)}ms, which is unacceptable for user experience`,
                    suggestedAction: 'Implement progressive loading or optimize initialization sequence'
                });
            } else if (metrics.initializationTime.mean > 2000) { // > 2 seconds
                bottlenecks.push({
                    feature: result.scenarioId,
                    metric: 'initializationTime',
                    severity: 'high',
                    description: `Initialization takes ${Math.round(metrics.initializationTime.mean)}ms, which may impact user experience`,
                    suggestedAction: 'Consider optimizing initialization or adding loading indicators'
                });
            }

            // Check memory usage
            if (metrics.memoryUsage.delta.mean > 100 * 1024 * 1024) { // > 100MB
                bottlenecks.push({
                    feature: result.scenarioId,
                    metric: 'memoryUsage',
                    severity: 'high',
                    description: `Memory usage increases by ${Math.round(metrics.memoryUsage.delta.mean / 1024 / 1024)}MB`,
                    suggestedAction: 'Optimize data structures and implement memory cleanup'
                });
            }

            // Check frame rate
            if (metrics.frameRate.average.mean < 30) { // < 30 FPS
                bottlenecks.push({
                    feature: result.scenarioId,
                    metric: 'frameRate',
                    severity: 'high',
                    description: `Average frame rate is ${Math.round(metrics.frameRate.average.mean)} FPS, below acceptable threshold`,
                    suggestedAction: 'Optimize rendering pipeline or reduce visual complexity'
                });
            } else if (metrics.frameRate.average.mean < 45) { // < 45 FPS
                bottlenecks.push({
                    feature: result.scenarioId,
                    metric: 'frameRate',
                    severity: 'medium',
                    description: `Average frame rate is ${Math.round(metrics.frameRate.average.mean)} FPS, could be improved`,
                    suggestedAction: 'Consider minor rendering optimizations'
                });
            }

            // Check interaction times
            Object.entries(metrics.interactionTimes).forEach(([interaction, stats]) => {
                if (typeof stats === 'object' && 'mean' in stats && stats.mean > 500) { // > 500ms
                    bottlenecks.push({
                        feature: result.scenarioId,
                        metric: `interaction_${interaction}`,
                        severity: 'medium',
                        description: `${interaction} interaction takes ${Math.round(stats.mean)}ms, which feels sluggish`,
                        suggestedAction: `Optimize ${interaction} interaction handling`
                    });
                }
            });
        });

        return bottlenecks;
    }

    // Helper methods
    private determineCategory(scenarioId: string): TestScenario['category'] {
        if (scenarioId.includes('baseline')) return 'baseline';
        if (scenarioId.includes('stress')) return 'stress';
        if (scenarioId.includes('integration')) return 'integration';
        return 'feature-specific';
    }

    private extractFeaturesFromScenario(scenarioId: string): string[] {
        // Extract feature names from scenario ID
        const features: string[] = [];

        if (scenarioId.includes('tags')) features.push('tags');
        if (scenarioId.includes('links')) features.push('links');
        if (scenarioId.includes('images')) features.push('images');
        if (scenarioId.includes('stats')) features.push('statistics');
        if (scenarioId.includes('shapes')) features.push('shapes');
        if (scenarioId.includes('icons')) features.push('icons');
        if (scenarioId.includes('arrows')) features.push('arrows');
        if (scenarioId.includes('names')) features.push('names');
        if (scenarioId.includes('folders')) features.push('folders');
        if (scenarioId.includes('focus')) features.push('focus');
        if (scenarioId.includes('layers')) features.push('layers');

        return features;
    }

    private calculateAverageMetrics(results: AggregatedResult[]): any {
        const avg: any = {
            initializationTime: 0,
            renderTime: 0,
            memoryDelta: 0,
            avgInteractionTime: 0
        };

        results.forEach(result => {
            avg.initializationTime += result.aggregatedMetrics.initializationTime.mean;
            avg.renderTime += result.aggregatedMetrics.renderTime.mean;
            avg.memoryDelta += result.aggregatedMetrics.memoryUsage.delta.mean;

            // Calculate average interaction time
            const interactionTimes = Object.values(result.aggregatedMetrics.interactionTimes)
                .map((stats: any) => stats.mean || 0);
            avg.avgInteractionTime += interactionTimes.reduce((sum, time) => sum + time, 0) / interactionTimes.length;
        });

        Object.keys(avg).forEach(key => {
            avg[key] /= results.length;
        });

        return avg;
    }

    private calculateCorrelation(x: number[], y: number[]): number {
        const n = x.length;
        if (n === 0) return 0;

        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    private estimateOptimizationImpact(bottleneck: any): string {
        switch (bottleneck.severity) {
            case 'critical':
                return 'High impact - could improve performance by 50-80%';
            case 'high':
                return 'Medium impact - could improve performance by 25-50%';
            case 'medium':
                return 'Low-medium impact - could improve performance by 10-25%';
            default:
                return 'Low impact - could improve performance by 5-10%';
        }
    }

    private sortRecommendationsByPriority(recommendations: BenchmarkRecommendation[]): BenchmarkRecommendation[] {
        const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };

        return recommendations.sort((a, b) => {
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Secondary sort by type
            const typeOrder = { 'performance': 0, 'optimization': 1, 'usage': 2, 'stability': 3 };
            return typeOrder[a.type] - typeOrder[b.type];
        });
    }
}