/**
 * Benchmark reporter for Extended Graph Plugin
 * Handles export of benchmark results in various formats
 */

import { App, Notice } from "obsidian";
import { AggregatedResult, ChartData, BenchmarkReport, PerformanceAnalysis } from "./benchmarkTypes";


export class BenchmarkReporter {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Generate CSV export from aggregated results
     */
    generateCSV(results: AggregatedResult[]): string {
        const headers = [
            'Scenario', 'Category', 'Iterations', 'Errors',
            'InitTime_Mean', 'InitTime_Std', 'InitTime_Min', 'InitTime_Max',
            'RenderTime_Mean', 'RenderTime_Std',
            'Memory_Delta_Mean', 'Memory_Delta_Std', 'Memory_Peak_Mean',
            'FrameRate_Mean', 'FrameRate_Min', 'FrameRate_Max',
            'Zoom_Time_Mean', 'Pan_Time_Mean', 'Hover_Time_Mean',
            'Filter_Time_Mean', 'Selection_Time_Mean', 'Legend_Time_Mean',
            'Image_Load_Time', 'Stats_Compute_Time', 'Shape_Render_Time',
            'Icon_Load_Time', 'Arc_Render_Time', 'Folder_Render_Time'
        ];

        const rows = results.map(result => [
            `"${result.scenarioName}"`,
            result.category,
            result.iterations,
            result.errors,

            // Initialization metrics
            result.aggregatedMetrics.initializationTime.mean?.toFixed(2) || '',
            result.aggregatedMetrics.initializationTime.std?.toFixed(2) || '',
            result.aggregatedMetrics.initializationTime.min?.toFixed(2) || '',
            result.aggregatedMetrics.initializationTime.max?.toFixed(2) || '',

            // Render metrics
            result.aggregatedMetrics.renderTime.mean?.toFixed(2) || '',
            result.aggregatedMetrics.renderTime.std?.toFixed(2) || '',

            // Memory metrics
            result.aggregatedMetrics.memoryUsage.delta?.mean?.toFixed(0) || '',
            result.aggregatedMetrics.memoryUsage.delta?.std?.toFixed(0) || '',
            result.aggregatedMetrics.memoryUsage.peak?.mean?.toFixed(0) || '',

            // Frame rate metrics
            result.aggregatedMetrics.frameRate.average?.mean?.toFixed(1) || '',
            result.aggregatedMetrics.frameRate.min?.mean?.toFixed(1) || '',
            result.aggregatedMetrics.frameRate.max?.mean?.toFixed(1) || '',

            // Interaction metrics
            result.aggregatedMetrics.interactionTimes.zoom?.mean?.toFixed(2) || '',
            result.aggregatedMetrics.interactionTimes.pan?.mean?.toFixed(2) || '',
            result.aggregatedMetrics.interactionTimes.hover?.mean?.toFixed(2) || '',
            result.aggregatedMetrics.interactionTimes.filter?.mean?.toFixed(2) || '',
            result.aggregatedMetrics.interactionTimes.nodeSelection?.mean?.toFixed(2) || '',
            result.aggregatedMetrics.interactionTimes.legendInteraction?.mean?.toFixed(2) || '',

            // Feature metrics
            result.aggregatedMetrics.featureMetrics.imageLoadTime?.mean?.toFixed(2) || '',
            result.aggregatedMetrics.featureMetrics.statisticsComputeTime?.mean?.toFixed(2) || '',
            result.aggregatedMetrics.featureMetrics.shapeRenderTime?.mean?.toFixed(2) || '',
            result.aggregatedMetrics.featureMetrics.iconLoadTime?.mean?.toFixed(2) || '',
            result.aggregatedMetrics.featureMetrics.nodesInteractives?.mean?.toFixed(2) || '',
            result.aggregatedMetrics.featureMetrics.linksInteractives?.mean?.toFixed(2) || ''
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    /**
     * Generate chart data for visualization
     */
    generateChartData(results: AggregatedResult[]): ChartData[] {
        const charts: ChartData[] = [];

        // Memory Usage by Feature
        const memoryData = results
            .filter(r => r.aggregatedMetrics.memoryUsage.delta.mean > 0)
            .map(r => ({
                scenario: r.scenarioName,
                memoryDelta: r.aggregatedMetrics.memoryUsage.delta.mean / (1024 * 1024), // Convert to MB
            }))
            .sort((a, b) => b.memoryDelta - a.memoryDelta);

        charts.push({
            type: 'bar',
            title: 'Memory Usage by Feature',
            subtitle: 'Memory overhead for different features (MB)',
            data: memoryData,
            xAxis: { label: 'Feature', type: 'categorical' },
            yAxis: { label: 'Memory Delta', type: 'numeric', unit: 'MB' },
            metadata: {
                source: 'Extended Graph Benchmark',
                generated: new Date().toISOString(),
                description: 'Memory overhead caused by different features'
            }
        });

        // Interaction Performance Heatmap
        const interactionData = results.map(r => {
            const interactions = r.aggregatedMetrics.interactionTimes;
            return {
                scenario: r.scenarioName.substring(0, 20) + '...', // Truncate for display
                zoom: interactions.zoom?.mean || 0,
                pan: interactions.pan?.mean || 0,
                hover: interactions.hover?.mean || 0,
                filter: interactions.filter?.mean || 0,
                selection: interactions.nodeSelection?.mean || 0
            };
        });

        charts.push({
            type: 'heatmap',
            title: 'Interaction Performance Heatmap',
            subtitle: 'Response times for different interactions (ms)',
            data: interactionData,
            xAxis: { label: 'Interaction Type', type: 'categorical' },
            yAxis: { label: 'Scenario', type: 'categorical' },
            metadata: {
                source: 'Extended Graph Benchmark',
                generated: new Date().toISOString(),
                description: 'Heatmap showing interaction response times across scenarios'
            }
        });

        // 5. Feature Impact Comparison
        const featureComparison = this.calculateFeatureImpact(results);
        charts.push({
            type: 'bar',
            title: 'Feature Performance Impact',
            subtitle: 'Relative performance overhead by feature',
            data: featureComparison,
            xAxis: { label: 'Feature', type: 'categorical' },
            yAxis: { label: 'Performance Impact', type: 'numeric', unit: '%' },
            metadata: {
                source: 'Extended Graph Benchmark',
                generated: new Date().toISOString(),
                description: 'Comparison of performance impact for each feature relative to baseline'
            }
        });

        return charts;
    }

    /**
     * Save benchmark report as JSON
     */
    async saveJSON(report: BenchmarkReport, outputDirectory: string): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${outputDirectory}/benchmark-report-${timestamp}.json`;

        try {
            const content = JSON.stringify(report, null, 2);
            await this.app.vault.adapter.write(filename, content);
            new Notice(`📄 JSON report saved: ${filename}`);
        } catch (error) {
            console.error('Failed to save JSON report:', error);
            throw error;
        }
    }

    /**
     * Save CSV data
     */
    async saveCSV(csvData: string, outputDirectory: string): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${outputDirectory}/benchmark-results-${timestamp}.csv`;

        try {
            await this.app.vault.adapter.write(filename, csvData);
            new Notice(`📊 CSV report saved: ${filename}`);
        } catch (error) {
            console.error('Failed to save CSV report:', error);
            throw error;
        }
    }

    /**
     * Generate and save HTML report
     */
    async saveHTML(report: BenchmarkReport, outputDirectory: string): Promise<void> {
        const htmlContent = this.generateHTMLReport(report);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${outputDirectory}/benchmark-report-${timestamp}.html`;

        try {
            await this.app.vault.adapter.write(filename, htmlContent);
            new Notice(`🌐 HTML report saved: ${filename}`);
        } catch (error) {
            console.error('Failed to save HTML report:', error);
            throw error;
        }
    }

    /**
     * Generate and save Markdown report
     */
    async saveMarkdown(report: BenchmarkReport, outputDirectory: string): Promise<void> {
        const markdownContent = this.generateMarkdownReport(report);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${outputDirectory}/benchmark-report-${timestamp}.md`;

        try {
            await this.app.vault.adapter.write(filename, markdownContent);
            new Notice(`📝 Markdown report saved: ${filename}`);
        } catch (error) {
            console.error('Failed to save Markdown report:', error);
            throw error;
        }
    }

    /**
     * Generate HTML report
     */
    private generateHTMLReport(report: BenchmarkReport): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Extended Graph Benchmark Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        h1 { border-bottom: 3px solid #007acc; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-top: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007acc; }
        .summary-card h3 { margin: 0 0 10px 0; color: #007acc; }
        .summary-card .value { font-size: 24px; font-weight: bold; color: #333; }
        .summary-card .label { color: #666; font-size: 12px; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; color: #333; }
        .metric-good { color: #28a745; }
        .metric-warning { color: #ffc107; }
        .metric-danger { color: #dc3545; }
        .recommendation { margin: 10px 0; padding: 15px; border-radius: 4px; }
        .rec-critical { background: #f8d7da; border-left: 4px solid #dc3545; }
        .rec-high { background: #fff3cd; border-left: 4px solid #ffc107; }
        .rec-medium { background: #d1ecf1; border-left: 4px solid #17a2b8; }
        .rec-low { background: #d4edda; border-left: 4px solid #28a745; }
        .chart-placeholder { background: #f8f9fa; padding: 40px; text-align: center; border: 2px dashed #ddd; margin: 20px 0; border-radius: 4px; }
        .system-info { background: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Extended Graph Performance Benchmark Report</h1>
        
        <div class="system-info">
            <strong>Generated:</strong> ${report.metadata.timestamp}<br>
            <strong>Duration:</strong> ${Math.round(report.metadata.duration / 1000)}s<br>
            <strong>Plugin Version:</strong> ${report.metadata.version}<br>
            <strong>System:</strong> ${report.system.userAgent}<br>
            <strong>Memory:</strong> ${report.system.memory ? `${Math.round(report.system.memory.jsHeapSizeLimit / 1024 / 1024)}MB limit` : 'N/A'}<br>
            <strong>CPU Cores:</strong> ${report.system.hardwareConcurrency}
        </div>

        <h2>Test Suite Summary</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${report.testSuite.totalTests}</div>
                <div class="label">Executed</div>
            </div>
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="value">${Math.round((report.testSuite.successfulTests / report.testSuite.totalTests) * 100)}%</div>
                <div class="label">${report.testSuite.successfulTests}/${report.testSuite.totalTests} passed</div>
            </div>
            <div class="summary-card">
                <h3>Scenarios</h3>
                <div class="value">${report.testSuite.totalScenarios}</div>
                <div class="label">Tested</div>
            </div>
            <div class="summary-card">
                <h3>Avg Init Time</h3>
                <div class="value">${this.getAverageInitTime(report.results).toFixed(0)}ms</div>
                <div class="label">Across all tests</div>
            </div>
        </div>

        <h2>Performance Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Scenario</th>
                    <th>Init Time (ms)</th>
                    <th>Memory (MB)</th>
                    <th>Frame Rate</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${report.results.map(result => `
                    <tr>
                        <td>${result.scenarioName}</td>
                        <td class="${this.getMetricClass(result.aggregatedMetrics.initializationTime.mean, 'initTime')}">${result.aggregatedMetrics.initializationTime.mean.toFixed(0)}</td>
                        <td>${Math.round(result.aggregatedMetrics.memoryUsage.delta.mean / 1024 / 1024)}</td>
                        <td class="${this.getMetricClass(result.aggregatedMetrics.frameRate.average.mean, 'frameRate')}">${result.aggregatedMetrics.frameRate.average.mean.toFixed(1)} fps</td>
                        <td>${result.errors > 0 ? '❌' : '✅'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>Key Insights</h2>
        ${this.generateInsightsHTML(report.analysis)}

        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation rec-${rec.priority}">
                <h4>${rec.title}</h4>
                <p>${rec.description}</p>
                <ul>
                    ${rec.suggestedActions.map(action => `<li>${action}</li>`).join('')}
                </ul>
                <small><strong>Estimated Impact:</strong> ${rec.estimatedImpact}</small>
            </div>
        `).join('')}

        <h2>Charts</h2>
        ${report.exports.charts.map(chart => `
            <div class="chart-placeholder">
                <h3>${chart.title}</h3>
                <p>${chart.subtitle}</p>
                <p><em>Chart data available in JSON export. Use tools like Chart.js, D3.js, or Excel to visualize.</em></p>
            </div>
        `).join('')}

        <h2>Bottlenecks Analysis</h2>
        <table>
            <thead>
                <tr>
                    <th>Feature</th>
                    <th>Metric</th>
                    <th>Severity</th>
                    <th>Description</th>
                    <th>Suggested Action</th>
                </tr>
            </thead>
            <tbody>
                ${report.analysis.bottlenecks.map(bottleneck => `
                    <tr>
                        <td>${bottleneck.feature}</td>
                        <td>${bottleneck.metric}</td>
                        <td><span class="metric-${bottleneck.severity === 'critical' ? 'danger' : bottleneck.severity === 'high' ? 'warning' : 'good'}">${bottleneck.severity.toUpperCase()}</span></td>
                        <td>${bottleneck.description}</td>
                        <td>${bottleneck.suggestedAction}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            Generated by Extended Graph Plugin Benchmark Suite
        </footer>
    </div>
</body>
</html>`;
    }

    /**
     * Generate Markdown report
     */
    private generateMarkdownReport(report: BenchmarkReport): string {
        return `# Extended Graph Performance Benchmark Report

**Generated:** ${report.metadata.timestamp}  
**Duration:** ${Math.round(report.metadata.duration / 1000)}s  
**Plugin Version:** ${report.metadata.version}  

## System Information

- **User Agent:** ${report.system.userAgent}
- **Memory Limit:** ${report.system.memory ? `${Math.round(report.system.memory.jsHeapSizeLimit / 1024 / 1024)}MB` : 'N/A'}
- **CPU Cores:** ${report.system.hardwareConcurrency}
- **Obsidian Version:** ${report.system.obsidianVersion}

## Test Suite Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${report.testSuite.totalTests} |
| Successful Tests | ${report.testSuite.successfulTests} |
| Failed Tests | ${report.testSuite.failedTests} |
| Success Rate | ${Math.round((report.testSuite.successfulTests / report.testSuite.totalTests) * 100)}% |
| Total Scenarios | ${report.testSuite.totalScenarios} |

## Performance Results

| Scenario | Init Time (ms) | Memory (MB) | Frame Rate (fps) | Status |
|----------|----------------|-------------|------------------|--------|
${report.results.map(result =>
            `| ${result.scenarioName} | ${result.aggregatedMetrics.initializationTime.mean.toFixed(0)} | ${Math.round(result.aggregatedMetrics.memoryUsage.delta.mean / 1024 / 1024)} | ${result.aggregatedMetrics.frameRate.average.mean.toFixed(1)} | ${result.errors > 0 ? '❌' : '✅'} |`
        ).join('\n')}

## Key Insights

${this.generateInsightsMarkdown(report.analysis)}

## Recommendations

${report.recommendations.map((rec, index) => `
### ${index + 1}. ${rec.title} (${rec.priority.toUpperCase()})

${rec.description}

**Suggested Actions:**
${rec.suggestedActions.map(action => `- ${action}`).join('\n')}

**Estimated Impact:** ${rec.estimatedImpact}
`).join('\n')}

## Bottlenecks Analysis

${report.analysis.bottlenecks.length > 0 ? `
| Feature | Metric | Severity | Description | Suggested Action |
|---------|--------|----------|-------------|------------------|
${report.analysis.bottlenecks.map(bottleneck =>
            `| ${bottleneck.feature} | ${bottleneck.metric} | ${bottleneck.severity.toUpperCase()} | ${bottleneck.description} | ${bottleneck.suggestedAction} |`
        ).join('\n')}
` : 'No significant bottlenecks identified.'}

## Chart Data

Chart data is available in the JSON export. Use visualization tools like:
- Chart.js for web-based charts
- Excel or Google Sheets for spreadsheet analysis
- D3.js for custom visualizations
- Python matplotlib/seaborn for data science analysis

---

*Generated by Extended Graph Plugin Benchmark Suite*
`;
    }

    // Helper methods
    private getAverageInitTime(results: AggregatedResult[]): number {
        if (results.length === 0) return 0;
        const sum = results.reduce((acc, result) => acc + result.aggregatedMetrics.initializationTime.mean, 0);
        return sum / results.length;
    }

    private getMetricClass(value: number, type: 'initTime' | 'frameRate'): string {
        if (type === 'initTime') {
            if (value > 5000) return 'metric-danger';
            if (value > 2000) return 'metric-warning';
            return 'metric-good';
        } else if (type === 'frameRate') {
            if (value < 30) return 'metric-danger';
            if (value < 45) return 'metric-warning';
            return 'metric-good';
        }
        return '';
    }

    private calculateFeatureImpact(results: AggregatedResult[]): Array<{ feature: string, impact: number }> {
        // Calculate relative performance impact of each feature compared to baseline
        const baseline = results.find(r => r.scenarioId.includes('baseline'));
        if (!baseline) return [];

        const baselineTime = baseline.aggregatedMetrics.initializationTime.mean;

        return results
            .filter(r => !r.scenarioId.includes('baseline'))
            .map(r => ({
                feature: r.scenarioName,
                impact: ((r.aggregatedMetrics.initializationTime.mean - baselineTime) / baselineTime) * 100
            }))
            .sort((a, b) => b.impact - a.impact)
            .slice(0, 10); // Top 10 impact features
    }

    private generateInsightsHTML(analysis: PerformanceAnalysis): string {
        const insights = [];

        if (analysis.baselinePerformance.initialization > 3000) {
            insights.push(`⚠️ <strong>High baseline initialization time:</strong> ${Math.round(analysis.baselinePerformance.initialization)}ms indicates potential optimization opportunities in the core plugin.`);
        }

        const criticalBottlenecks = analysis.bottlenecks.filter(b => b.severity === 'critical');
        if (criticalBottlenecks.length > 0) {
            insights.push(`🚨 <strong>Critical bottlenecks found:</strong> ${criticalBottlenecks.length} features have critical performance issues that need immediate attention.`);
        }

        if (insights.length === 0) {
            insights.push(`✅ <strong>Overall performance looks good:</strong> No major performance issues detected in the current test suite.`);
        }

        return insights.map(insight => `<p>${insight}</p>`).join('');
    }

    private generateInsightsMarkdown(analysis: PerformanceAnalysis): string {
        const insights = [];

        if (analysis.baselinePerformance.initialization > 3000) {
            insights.push(`⚠️ **High baseline initialization time:** ${Math.round(analysis.baselinePerformance.initialization)}ms indicates potential optimization opportunities in the core plugin.`);
        }

        const criticalBottlenecks = analysis.bottlenecks.filter(b => b.severity === 'critical');
        if (criticalBottlenecks.length > 0) {
            insights.push(`🚨 **Critical bottlenecks found:** ${criticalBottlenecks.length} features have critical performance issues that need immediate attention.`);
        }

        if (insights.length === 0) {
            insights.push(`✅ **Overall performance looks good:** No major performance issues detected in the current test suite.`);
        }

        return insights.join('\n\n');
    }
}