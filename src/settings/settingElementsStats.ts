import { DropdownComponent, setIcon, Setting } from "obsidian";
import { ExtendedGraphSettingTab, GraphAnalysisPlugin, isPropertyKeyValid, LinkStatCalculator, LinkStatFunction, linkStatFunctionLabels, linkStatFunctionNeedsNLP, NodeStatCalculatorFactory, NodeStatFunction, nodeStatFunctionLabels, PluginInstances, SettingColorPalette, SettingsSectionCollapsible } from "src/internal";
import STRINGS from "src/Strings";

export class SettingElementsStats extends SettingsSectionCollapsible {
    warningNodeSizeSetting: Setting;
    warningNodeColorSetting: Setting;
    linksSizeFunctionDropdown: DropdownComponent | undefined;
    linksColorFunctionDropdown: DropdownComponent | undefined;
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'elements-stats', '', STRINGS.features.elementsStats, 'chart-pie', STRINGS.features.elementsStatsDesc);
    }

    protected override addBody(): void {
        this.addNodeSizeProperty();
        this.addNodeSizeFunction();
        this.addNodeSizeWarning();

        this.addNodeColorFunction();
        this.addNodeColorWarning();
        this.addColorPaletteSettingForNodes();

        if (PluginInstances.graphsManager?.getGraphAnalysis()["graph-analysis"]) {
            this.addLinkSizeFunction();
            this.addLinkColorFunction();
            this.addColorPaletteSettingForLinks();
        }
    }

    private addNodeSizeProperty(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.nodeSizesProperty)
            .setDesc(STRINGS.features.nodeSizesPropertyDesc)
            .addText(cb => cb
                .setValue(PluginInstances.settings.nodesSizeProperty)
                .onChange(async (key) => {
                    if (key === "" || isPropertyKeyValid(key)) {
                        PluginInstances.settings.nodesSizeProperty = key;
                        await PluginInstances.plugin.saveSettings();
                    }
            }));
            
        this.elementsBody.push(setting.settingEl);
    }

    private addNodeSizeFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.nodeSizesFunction)
            .setDesc(STRINGS.features.nodeSizesFunctionDesc)
            .addDropdown(cb => {
                cb.addOptions(nodeStatFunctionLabels);
                cb.setValue(PluginInstances.settings.nodesSizeFunction);
                cb.onChange((value) => {
                    this.recomputeNodesSizes(value as NodeStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }

    private addNodeSizeWarning(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setClass("setting-warning")
            .then(cb => {
                setIcon(cb.nameEl, 'triangle-alert');
            });
            
        this.elementsBody.push(setting.settingEl);
        this.warningNodeSizeSetting = setting;
        this.setWarning(setting, PluginInstances.graphsManager?.nodesSizeCalculator?.getWarning());
    }
    
    private addNodeColorFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.nodeColorsFunction)
            .setDesc(STRINGS.features.nodeColorsFunctionDesc)
            .addDropdown(cb => {
                cb.addOptions(nodeStatFunctionLabels);
                cb.setValue(PluginInstances.settings.nodesColorFunction);
                cb.onChange((value) => {
                    this.recomputeNodeColors(value as NodeStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }

    private addNodeColorWarning(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setClass("setting-warning")
            .then(cb => {
                setIcon(cb.nameEl, 'triangle-alert');
            });
            
        this.elementsBody.push(setting.settingEl);
        this.warningNodeColorSetting = setting;
        this.setWarning(setting, PluginInstances.graphsManager?.nodesColorCalculator?.getWarning());
    }

    private addColorPaletteSettingForNodes(): void {
        const setting = new SettingColorPalette(this.containerEl, 'stats-colors-nodes')
            .setDesc(STRINGS.features.nodeColorsPaletteDesc);

        setting.setValue(PluginInstances.settings.nodesColorColormap);

        setting.onPaletteChange((palette: string) => {
            PluginInstances.settings.nodesColorColormap = palette;
            PluginInstances.plugin.saveSettings();
            PluginInstances.graphsManager.nodesColorCalculator?.mapStat();
            PluginInstances.graphsManager.updatePaletteForNodesStat();
        });

        // Push to body list
        this.elementsBody.push(setting.settingEl);
    }

    private addLinkSizeFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.linkSizesFunction)
            .setDesc(STRINGS.features.linkSizesFunctionDesc)
            .addDropdown(cb => {
                this.linksSizeFunctionDropdown = cb;
                const nlp = PluginInstances.graphsManager?.getGraphAnalysis().nlp;
                cb.addOptions(
                    Object.fromEntries(Object.entries(linkStatFunctionLabels)
                        .filter(entry => !linkStatFunctionNeedsNLP[entry[0] as LinkStatFunction] || nlp)
                    )
                );
                cb.setValue(PluginInstances.settings.linksSizeFunction);
                cb.onChange((value) => {
                    this.recomputeLinksSizes(value as LinkStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }
    
    private addLinkColorFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(STRINGS.features.linkColorsFunction)
            .setDesc(STRINGS.features.linkColorsFunctionDesc + " ⚠️ " + STRINGS.features.linksFeatureRequired)
            .addDropdown(cb => {
                this.linksColorFunctionDropdown = cb;
                const nlp = PluginInstances.graphsManager?.getGraphAnalysis().nlp;
                cb.addOptions(
                    Object.fromEntries(Object.entries(linkStatFunctionLabels)
                        .filter(entry => !linkStatFunctionNeedsNLP[entry[0] as LinkStatFunction] || nlp)
                    )
                );
                cb.setValue(PluginInstances.settings.linksColorFunction);
                cb.onChange((value) => {
                    this.recomputeLinksColors(value as LinkStatFunction);
                });
            });
            
        this.elementsBody.push(setting.settingEl);
    }

    private addColorPaletteSettingForLinks(): void {
        const setting = new SettingColorPalette(this.containerEl, 'stats-colors-links')
            .setDesc(STRINGS.features.linkColorsPaletteDesc);

        setting.setValue(PluginInstances.settings.linksColorColormap);

        setting.onPaletteChange((palette: string) => {
            PluginInstances.settings.linksColorColormap = palette;
            PluginInstances.plugin.saveSettings();
            PluginInstances.graphsManager.linksColorCalculator?.mapStat();
            PluginInstances.graphsManager.updatePaletteForLinksStat();
        });

        // Push to body list
        this.elementsBody.push(setting.settingEl);
    }
    









    private setWarning(warningSetting: Setting, warning?: string): void {
        if (warning && warning !== "") {
            warningSetting.setDesc(warning);
            warningSetting.settingEl.removeClass("is-hidden");
        }
        else {
            warningSetting.setDesc("");
            warningSetting.settingEl.addClass("is-hidden");
        }
    }

    private recomputeNodesSizes(functionKey: NodeStatFunction): void {
        PluginInstances.settings.nodesSizeFunction = functionKey;
        PluginInstances.plugin.saveSettings();

        PluginInstances.graphsManager.nodesSizeCalculator = NodeStatCalculatorFactory.getCalculator('size');
        PluginInstances.graphsManager.nodesSizeCalculator?.computeStats().then(() => {
            PluginInstances.graphsManager.updateSizeFunctionForNodesStat();
        });
        this.setWarning(this.warningNodeSizeSetting, PluginInstances.graphsManager?.nodesSizeCalculator?.getWarning());
    }

    private recomputeNodeColors(functionKey: NodeStatFunction): void {
        PluginInstances.settings.nodesColorFunction = functionKey;
        PluginInstances.graphsManager.nodesColorCalculator = NodeStatCalculatorFactory.getCalculator('color');
        PluginInstances.graphsManager.nodesColorCalculator?.computeStats().then(() => {
            PluginInstances.graphsManager.updatePaletteForNodesStat();
        });
        this.setWarning(this.warningNodeColorSetting, PluginInstances.graphsManager?.nodesColorCalculator?.getWarning());
        PluginInstances.plugin.saveSettings();
    }

    private recomputeLinksSizes(functionKey: LinkStatFunction): void {
        const ga = PluginInstances.graphsManager.getGraphAnalysis();
        if (!ga && functionKey !== 'default') {
            return;
        }
        else if (!ga.nlp && linkStatFunctionNeedsNLP[functionKey]) {
            new Notice(`${STRINGS.notices.nlpPluginRequired} (${functionKey})`);
            functionKey = 'default';
            this.linksSizeFunctionDropdown?.setValue(functionKey);
        }
    
        PluginInstances.settings.linksSizeFunction = functionKey;
        PluginInstances.plugin.saveSettings();

        if (functionKey === 'default') {
            PluginInstances.graphsManager.linksSizeCalculator = undefined;
            PluginInstances.graphsManager.updateSizeFunctionForLinksStat();
            return;
        }

        const graphAnalysisPlugin = PluginInstances.app.plugins.getPlugin("graph-analysis") as GraphAnalysisPlugin | null;
        if (!graphAnalysisPlugin) return;
        if (!PluginInstances.graphsManager.linksSizeCalculator) {
            PluginInstances.graphsManager.linksSizeCalculator = new LinkStatCalculator('size', graphAnalysisPlugin.g);
        }
        PluginInstances.graphsManager.linksSizeCalculator.computeStats(PluginInstances.settings.linksSizeFunction).then(() => {
            PluginInstances.graphsManager.updateSizeFunctionForLinksStat();
        });
    }

    private recomputeLinksColors(functionKey: LinkStatFunction): void {
        const ga = PluginInstances.graphsManager.getGraphAnalysis();
        if (!ga && functionKey !== 'default') {
            return;
        }
        else if (!ga.nlp && linkStatFunctionNeedsNLP[functionKey]) {
            new Notice(`${STRINGS.notices.nlpPluginRequired} (${functionKey})`);
            functionKey = 'default';
            this.linksColorFunctionDropdown?.setValue(functionKey);
        }
    
        PluginInstances.settings.linksColorFunction = functionKey;
        PluginInstances.plugin.saveSettings();

        if (functionKey === 'default') {
            PluginInstances.graphsManager.linksColorCalculator = undefined;
            PluginInstances.graphsManager.updatePaletteForLinksStat();
            return;
        }

        const graphAnalysisPlugin = PluginInstances.app.plugins.getPlugin("graph-analysis") as GraphAnalysisPlugin | null;
        if (!graphAnalysisPlugin) return;
        if (!PluginInstances.graphsManager.linksColorCalculator) {
            PluginInstances.graphsManager.linksColorCalculator = new LinkStatCalculator('color', graphAnalysisPlugin.g);
        }
        PluginInstances.graphsManager.linksColorCalculator.computeStats(PluginInstances.settings.linksColorFunction).then(() => {
            PluginInstances.graphsManager.updatePaletteForLinksStat();
        });
    }
}