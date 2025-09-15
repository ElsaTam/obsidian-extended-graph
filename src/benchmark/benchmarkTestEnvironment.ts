import { App, TFolder } from "obsidian";
import { SystemInfo } from "./benchmarkTypes";

export class EnvironmentInfo {
    private app: App;
    private plugin: any;

    constructor(app: App, plugin: any) {
        this.app = app;
        this.plugin = plugin;
    }

    /**
     * Get system information for reporting
     */
    getSystemInfo(): SystemInfo {
        const vaultInfo = this.getVaultInfo();

        return {
            userAgent: navigator.userAgent,
            memory: (performance as any).memory ? {
                jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
                totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                usedJSHeapSize: (performance as any).memory.usedJSHeapSize
            } : undefined,
            hardwareConcurrency: navigator.hardwareConcurrency,
            timestamp: Date.now(),
            obsidianVersion: (this.app as any).appVersion || 'unknown',
            pluginVersion: this.plugin.manifest.version,
            vaultInfo
        };
    }

    /**
     * Get current vault information
     */
    private getVaultInfo(): SystemInfo['vaultInfo'] {
        const allFiles = this.app.vault.getAllLoadedFiles();
        const markdownFiles = this.app.vault.getMarkdownFiles();
        const folders = allFiles.filter(f => f instanceof TFolder);

        // Count tags (simplified)
        const allTags = new Set<string>();
        markdownFiles.forEach(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.tags) {
                cache.tags.forEach(tag => allTags.add(tag.tag));
            }
        });

        // Calculate average links per file
        let totalLinks = 0;
        markdownFiles.forEach(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.links) {
                totalLinks += cache.links.length;
            }
        });
        const averageLinksPerFile = markdownFiles.length > 0 ? totalLinks / markdownFiles.length : 0;

        return {
            totalFiles: allFiles.length,
            totalFolders: folders.length,
            totalTags: allTags.size,
            averageLinksPerFile
        };
    }
}