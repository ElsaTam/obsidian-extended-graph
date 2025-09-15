import { BenchmarkMetrics } from "./benchmarkTypes";


export class MetricsCollector {
    private startTime: number = 0;
    private startMemory: number = 0;
    private phases: Map<string, number> = new Map();
    private frameRateSamples: number[] = [];
    private performanceObserver: PerformanceObserver | null = null;
    private customMetrics: PerformanceEntry[] = [];
    private interactionMetrics: Partial<BenchmarkMetrics['interactionTimes']> = {};
    private featureMetrics: Partial<BenchmarkMetrics['featureMetrics']> = {};

    private isCollecting = false;
    private memoryPeakUsage = 0;
    private frameRateMonitoringId: number | null = null;

    constructor() {
        this.performanceObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();

            for (const entry of entries) {
                // Filter for Extended Graph related entries
                if (entry.name.startsWith('extended-graph-') ||
                    entry.name.startsWith('eg-phase-') ||
                    entry.name.startsWith('eg-interaction-')) {
                    this.customMetrics.push(entry);
                }

                // Capture paint metrics
                if (entry.entryType === 'paint') {
                    this.addCustomMetric(`paint-${entry.name}`, entry.startTime, 'milliseconds');
                }

                // Capture resource loading times
                if (entry.entryType === 'resource' &&
                    (entry.name.includes('image') || entry.name.includes('icon'))) {
                    this.addCustomMetric('resource-load', entry.duration, 'milliseconds');
                }
            }
        });
    }

    /**
     * Start metrics collection
     */
    start(): void {
        if (this.isCollecting) {
            console.warn('MetricsCollector already started');
            return;
        }

        this.isCollecting = true;
        this.startTime = performance.now();
        this.startMemory = this.getCurrentMemoryUsage();
        this.memoryPeakUsage = this.startMemory;

        // Clear previous data
        this.phases.clear();
        this.frameRateSamples = [];
        this.customMetrics = [];
        this.interactionMetrics = {};
        this.featureMetrics = {};

        // Start performance monitoring
        if (this.performanceObserver) {
            this.performanceObserver.observe({
                entryTypes: ['measure', 'navigation', 'resource', 'paint']
            });
        }

        // Start frame rate monitoring
        this.startFrameRateMonitoring();

        // Start memory peak tracking
        this.startMemoryPeakTracking();

        performance.mark('metrics-collection-start');
    }

    /**
     * End metrics collection and return results
     */
    end(): BenchmarkMetrics {
        if (!this.isCollecting) {
            throw new Error('MetricsCollector not started');
        }

        const endTime = performance.now();
        const endMemory = this.getCurrentMemoryUsage();

        performance.mark('metrics-collection-end');
        performance.measure('metrics-collection-duration', 'metrics-collection-start', 'metrics-collection-end');

        // Stop monitoring
        this.stopFrameRateMonitoring();
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }

        this.isCollecting = false;

        // Calculate frame rate statistics
        const frameRateStats = this.calculateFrameRateStats();

        // Compile final metrics
        const metrics: BenchmarkMetrics = {
            initializationTime: endTime - this.startTime,
            renderTime: this.phases.get('initial-render') || 0,
            nodeProcessingTime: this.phases.get('node-processing') || 0,
            linkProcessingTime: this.phases.get('link-processing') || 0,

            memoryUsage: {
                initial: this.startMemory,
                peak: this.memoryPeakUsage,
                final: endMemory,
                delta: endMemory - this.startMemory
            },

            frameRate: frameRateStats,

            interactionTimes: {
                zoom: this.interactionMetrics.zoom || 0,
                pan: this.interactionMetrics.pan || 0,
                hover: this.interactionMetrics.hover || 0,
                filter: this.interactionMetrics.filter || 0,
                nodeSelection: this.interactionMetrics.nodeSelection || 0,
                legendInteraction: this.interactionMetrics.legendInteraction || 0
            },

            featureMetrics: {
                imageLoadTime: this.featureMetrics.imageLoadTime,
                statisticsComputeTime: this.featureMetrics.statisticsComputeTime,
                shapeRenderTime: this.featureMetrics.shapeRenderTime,
                iconLoadTime: this.featureMetrics.iconLoadTime,
                nodesInteractives: this.featureMetrics.nodesInteractives,
                linksInteractives: this.featureMetrics.linksInteractives
            },

            customMetrics: [...this.customMetrics]
        };

        return metrics;
    }

    /**
     * Mark the start of a performance phase
     */
    markPhase(phaseName: string): void {
        if (!this.isCollecting) return;

        const timestamp = performance.now();
        this.phases.set(phaseName, timestamp - this.startTime);

        performance.mark(`eg-phase-${phaseName}`);

        // Measure previous phase if exists
        const phaseNames = Array.from(this.phases.keys());
        if (phaseNames.length > 1) {
            const previousPhase = phaseNames[phaseNames.length - 2];
            performance.measure(
                `eg-phase-duration-${previousPhase}`,
                `eg-phase-${previousPhase}`,
                `eg-phase-${phaseName}`
            );
        }
    }

    /**
     * Measure interaction performance
     */
    async measureInteraction(
        type: keyof BenchmarkMetrics['interactionTimes'],
        action: () => Promise<void>
    ): Promise<void> {
        if (!this.isCollecting) return;

        const startTime = performance.now();
        performance.mark(`eg-interaction-${type}-start`);

        try {
            await action();
        } finally {
            const endTime = performance.now();
            performance.mark(`eg-interaction-${type}-end`);
            performance.measure(
                `eg-interaction-${type}`,
                `eg-interaction-${type}-start`,
                `eg-interaction-${type}-end`
            );

            this.interactionMetrics[type] = endTime - startTime;
        }
    }

    /**
     * Record feature-specific metric
     */
    recordFeatureMetric(
        feature: keyof BenchmarkMetrics['featureMetrics'],
        value: number
    ): void {
        if (!this.isCollecting) return;

        this.featureMetrics[feature] = value;
        this.addCustomMetric(`feature-${feature}`, value, 'milliseconds');
    }

    /**
     * Add custom performance metric
     */
    addCustomMetric(name: string, value: number, unit: string = 'milliseconds'): void {
        if (!this.isCollecting) return;

        // Create a synthetic PerformanceEntry
        const entry: PerformanceMark = {
            name: `extended-graph-${name}`,
            entryType: 'measure',
            startTime: performance.now(),
            duration: value,
            detail: { unit, value },
            toJSON: () => {
                JSON.stringify({
                    name: `extended-graph-${name}`,
                    entryType: 'measure',
                    startTime: performance.now(),
                    duration: value,
                    detail: { unit, value }
                })
            }
        };

        this.customMetrics.push(entry);
    }

    /**
     * Start monitoring frame rate
     */
    private startFrameRateMonitoring(): void {
        let frameCount = 0;
        let lastTime = performance.now();

        const measureFrame = () => {
            if (!this.isCollecting) return;

            const currentTime = performance.now();
            frameCount++;

            // Calculate FPS every second
            if (currentTime - lastTime >= 1000) {
                const fps = frameCount / ((currentTime - lastTime) / 1000);
                this.frameRateSamples.push(fps);

                frameCount = 0;
                lastTime = currentTime;
            }

            this.frameRateMonitoringId = requestAnimationFrame(measureFrame);
        };

        this.frameRateMonitoringId = requestAnimationFrame(measureFrame);
    }

    /**
     * Stop frame rate monitoring
     */
    private stopFrameRateMonitoring(): void {
        if (this.frameRateMonitoringId) {
            cancelAnimationFrame(this.frameRateMonitoringId);
            this.frameRateMonitoringId = null;
        }
    }

    /**
     * Start tracking memory peak usage
     */
    private startMemoryPeakTracking(): void {
        const trackMemory = () => {
            if (!this.isCollecting) return;

            const currentMemory = this.getCurrentMemoryUsage();
            if (currentMemory > this.memoryPeakUsage) {
                this.memoryPeakUsage = currentMemory;
            }

            setTimeout(trackMemory, 100); // Check every 100ms
        };

        setTimeout(trackMemory, 100);
    }

    /**
     * Calculate frame rate statistics
     */
    private calculateFrameRateStats(): BenchmarkMetrics['frameRate'] {
        if (this.frameRateSamples.length === 0) {
            return {
                average: 0,
                min: 0,
                max: 0,
                samples: []
            };
        }

        const samples = this.frameRateSamples;
        const average = samples.reduce((sum, fps) => sum + fps, 0) / samples.length;
        const min = Math.min(...samples);
        const max = Math.max(...samples);

        return {
            average,
            min,
            max,
            samples: [...samples]
        };
    }

    /**
     * Get current memory usage
     */
    private getCurrentMemoryUsage(): number {
        if ('memory' in performance && (performance as any).memory) {
            return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * Measure DOM rendering performance
     */
    measureDOMRender(callback: () => void): number {
        const startTime = performance.now();

        callback();

        // Force a repaint to measure actual render time
        const element = document.createElement('div');
        element.style.transform = 'translateZ(0)';
        document.body.appendChild(element);

        requestAnimationFrame(() => {
            document.body.removeChild(element);
        });

        return performance.now() - startTime;
    }

    /**
     * Measure async operation with detailed timing
     */
    async measureAsync<T>(
        name: string,
        operation: () => Promise<T>
    ): Promise<{ result: T; duration: number; memoryDelta: number }> {
        const startTime = performance.now();
        const startMemory = this.getCurrentMemoryUsage();

        performance.mark(`async-${name}-start`);

        try {
            const result = await operation();

            const endTime = performance.now();
            const endMemory = this.getCurrentMemoryUsage();

            performance.mark(`async-${name}-end`);
            performance.measure(`async-${name}`, `async-${name}-start`, `async-${name}-end`);

            const duration = endTime - startTime;
            const memoryDelta = endMemory - startMemory;

            this.addCustomMetric(`async-${name}`, duration);
            this.addCustomMetric(`async-${name}-memory`, memoryDelta, 'bytes');

            return { result, duration, memoryDelta };

        } catch (error) {
            performance.mark(`async-${name}-error`);
            throw error;
        }
    }

    /**
     * Get real-time performance snapshot
     */
    getSnapshot(): {
        currentTime: number;
        currentMemory: number;
        recentFrameRate: number;
        phasesSoFar: Array<{ name: string; timestamp: number }>;
    } {
        const recentFrameRate = this.frameRateSamples.length > 0
            ? this.frameRateSamples[this.frameRateSamples.length - 1]
            : 0;

        return {
            currentTime: performance.now() - this.startTime,
            currentMemory: this.getCurrentMemoryUsage(),
            recentFrameRate,
            phasesSoFar: Array.from(this.phases.entries()).map(([name, timestamp]) => ({
                name,
                timestamp
            }))
        };
    }

    /**
     * Measure layout thrashing
     */
    measureLayoutThrashing(callback: () => void): {
        duration: number;
        layoutCount: number;
        styleCount: number;
    } {
        const startTime = performance.now();

        // Clear previous measurements
        performance.clearMeasures('layout-thrashing');
        performance.clearMarks('layout-start');
        performance.clearMarks('layout-end');

        performance.mark('layout-start');

        // Wrap callback to detect layout/style recalculations
        let layoutCount = 0;
        let styleCount = 0;

        const originalGetComputedStyle = window.getComputedStyle;
        window.getComputedStyle = function (...args) {
            styleCount++;
            return originalGetComputedStyle.apply(this, args);
        };

        // Detect layout by intercepting offsetHeight/offsetWidth access
        const originalOffsetHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'offsetHeight');
        const originalOffsetWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'offsetWidth');

        if (originalOffsetHeight) {
            Object.defineProperty(Element.prototype, 'offsetHeight', {
                get: function () {
                    layoutCount++;
                    return originalOffsetHeight.get!.call(this);
                }
            });
        }

        if (originalOffsetWidth) {
            Object.defineProperty(Element.prototype, 'offsetWidth', {
                get: function () {
                    layoutCount++;
                    return originalOffsetWidth.get!.call(this);
                }
            });
        }

        try {
            callback();
        } finally {
            // Restore original functions
            window.getComputedStyle = originalGetComputedStyle;
            if (originalOffsetHeight) {
                Object.defineProperty(Element.prototype, 'offsetHeight', originalOffsetHeight);
            }
            if (originalOffsetWidth) {
                Object.defineProperty(Element.prototype, 'offsetWidth', originalOffsetWidth);
            }
        }

        performance.mark('layout-end');
        performance.measure('layout-thrashing', 'layout-start', 'layout-end');

        const duration = performance.now() - startTime;

        return {
            duration,
            layoutCount,
            styleCount
        };
    }

    /**
     * Monitor GPU usage (if available)
     */
    measureGPUPerformance(): {
        supported: boolean;
        memoryInfo?: {
            totalJSHeapSize: number;
            usedJSHeapSize: number;
            jsHeapSizeLimit: number;
        };
        webGLInfo?: any;
    } {
        const result: any = {
            supported: false
        };

        // Check for memory info
        if ('memory' in performance) {
            result.memoryInfo = (performance as any).memory;
            result.supported = true;
        }

        // Check for WebGL info (proxy for GPU usage)
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');

            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    result.webGLInfo = {
                        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
                        version: gl.getParameter(gl.VERSION),
                        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
                    };
                    result.supported = true;
                }
            }
        } catch (error) {
            // WebGL not available or blocked
        }

        return result;
    }

    /**
     * Measure network requests impact
     */
    measureNetworkRequests(): {
        requests: Array<{
            url: string;
            duration: number;
            size: number;
            type: string;
        }>;
        totalDuration: number;
        totalSize: number;
    } {
        const networkEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

        const requests = networkEntries
            .filter(entry => entry.startTime >= this.startTime)
            .map(entry => ({
                url: entry.name,
                duration: entry.duration,
                size: entry.transferSize || 0,
                type: entry.initiatorType
            }));

        const totalDuration = requests.reduce((sum, req) => sum + req.duration, 0);
        const totalSize = requests.reduce((sum, req) => sum + req.size, 0);

        return {
            requests,
            totalDuration,
            totalSize
        };
    }

    /**
     * Export detailed metrics for analysis
     */
    exportDetailedMetrics(): {
        timeline: Array<{
            timestamp: number;
            phase: string;
            memory: number;
            frameRate?: number;
        }>;
        performanceEntries: PerformanceEntry[];
        networkRequests: ReturnType<typeof this.measureNetworkRequests>;
        gpuInfo: ReturnType<typeof this.measureGPUPerformance>;
    } {
        const timeline = Array.from(this.phases.entries()).map(([phase, timestamp], index) => ({
            timestamp,
            phase,
            memory: this.getCurrentMemoryUsage(),
            frameRate: this.frameRateSamples[Math.floor(index * this.frameRateSamples.length / this.phases.size)]
        }));

        return {
            timeline,
            performanceEntries: [...this.customMetrics],
            networkRequests: this.measureNetworkRequests(),
            gpuInfo: this.measureGPUPerformance()
        };
    }

    /**
     * Cleanup resources
     */
    dispose(): void {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }

        this.stopFrameRateMonitoring();
        this.isCollecting = false;

        // Clear collected data
        this.phases.clear();
        this.frameRateSamples = [];
        this.customMetrics = [];
        this.interactionMetrics = {};
        this.featureMetrics = {};
    }
}