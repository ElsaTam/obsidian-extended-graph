import { DropdownComponent, Notice, setIcon, Setting } from "obsidian";
import {
    ExtendedGraphSettingTab,
    getCMapData,
    getNLPPlugin,
    LinkStatFunction,
    linkStatFunctionLabels,
    linkStatFunctionNeedsNLP,
    NodeStatCalculatorFactory,
    NodeStatFunction,
    nodeStatFunctionLabels,
    nodeStatFunctionNeedsNLP,
    ExtendedGraphInstances,
    SettingColorPalette,
    SettingsSectionPerGraphType,
    t,
    GraphStatsDirection
} from "../internal";
import { SettingMultiPropertiesModal } from "../ui/modals/settingPropertiesModal";

export class SettingElementsStats extends SettingsSectionPerGraphType {
    warningNodeSizeSetting: Setting;
    warningNodeColorSetting: Setting;
    nodesSizeFunctionDropdown: DropdownComponent | undefined;
    nodesColorFunctionDropdown: DropdownComponent | undefined;
    linksSizeFunctionDropdown: DropdownComponent | undefined;
    linksColorFunctionDropdown: DropdownComponent | undefined;
    nodesPaletteSetting: SettingColorPalette;
    linksPaletteSetting: SettingColorPalette;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'elements-stats', '', t("features.ids.elementsStats"), t("features.elementsStats"), 'chart-pie', t("features.elementsStatsDesc"));
    }

    protected override addBody(): void {
        this.nodesSizeFunctionDropdown = undefined;
        this.nodesColorFunctionDropdown = undefined;
        this.linksSizeFunctionDropdown = undefined;
        this.linksColorFunctionDropdown = undefined;

        this.addNodeSizeProperties();
        this.addNodeSizeFunction();
        this.addNodeSizeWarning();
        this.addNodeSizeRange();

        this.addNodeColorFunction();
        this.addNodeColorWarning();
        this.addColorPaletteSettingForNodes();

        this.addStatsDirection();

        this.addLinkSizeFunction();
        this.addLinkColorFunction();
        this.addColorPaletteSettingForLinks();

        this.addRecomputeStatsOnGraphChange();
    }

    private addNodeSizeProperties(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.nodeSizeProperties"))
            .setDesc(t("features.nodeSizePropertiesDesc"))
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        t("features.nodeSizeProperties"),
                        t("features.nodeSizePropertiesAdd"),
                        ExtendedGraphInstances.settings.nodesSizeProperties
                    );
                    modal.open();
                })
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addNodeSizeFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.nodeSizesFunction"))
            .setDesc(t("features.nodeSizesFunctionDesc"))
            .addDropdown(cb => {
                this.nodesSizeFunctionDropdown = cb;
                cb.addOptions(
                    Object.fromEntries(Object.entries(nodeStatFunctionLabels)
                        .filter(entry => {
                            const fn = entry[0] as NodeStatFunction;
                            if (nodeStatFunctionNeedsNLP[fn] && !getNLPPlugin())
                                return false;
                            return true;
                        })
                    ));
                cb.setValue(ExtendedGraphInstances.settings.nodesSizeFunction);
                cb.onChange((value) => {
                    let functionKey = value as NodeStatFunction;
                    if (!getNLPPlugin() && nodeStatFunctionNeedsNLP[functionKey]) {
                        new Notice(`${t("notices.nlpPluginRequired")} (${functionKey})`);
                        functionKey = 'default';
                        this.nodesSizeFunctionDropdown?.setValue(functionKey);
                    }

                    ExtendedGraphInstances.settings.nodesSizeFunction = functionKey;
                    ExtendedGraphInstances.plugin.saveSettings();
                    this.setWarning(this.warningNodeSizeSetting, NodeStatCalculatorFactory.getWarning(functionKey));
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
        this.setWarning(setting, NodeStatCalculatorFactory.getWarning(ExtendedGraphInstances.settings.nodesSizeFunction));
    }

    private addNodeSizeRange(): void {
        const setting = new Setting(this.containerEl)
            .setName(t("features.nodeSizesRange"))
            .setDesc(t("features.nodeSizesRangeDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(ExtendedGraphInstances.settings.nodesSizeRange.min.toString());
                cb.onChange(async (value) => {
                    const floatValue = parseFloat(value);
                    if (!isNaN(floatValue)) {
                        ExtendedGraphInstances.settings.nodesSizeRange.min = Math.clamp(floatValue, 0.1, 5);
                        await ExtendedGraphInstances.plugin.saveSettings();
                    }
                });
            })
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(ExtendedGraphInstances.settings.nodesSizeRange.max.toString());
                cb.onChange(async (value) => {
                    const floatValue = parseFloat(value);
                    if (!isNaN(floatValue)) {
                        ExtendedGraphInstances.settings.nodesSizeRange.max = Math.clamp(floatValue, 0.1, 5);
                        await ExtendedGraphInstances.plugin.saveSettings();
                    }
                });
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addNodeColorFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.nodeColorsFunction"))
            .setDesc(t("features.nodeColorsFunctionDesc"))
            .addDropdown(cb => {
                this.nodesColorFunctionDropdown = cb;
                cb.addOptions(
                    Object.fromEntries(Object.entries(nodeStatFunctionLabels)
                        .filter(entry => {
                            const fn = entry[0] as NodeStatFunction;
                            if (nodeStatFunctionNeedsNLP[fn] && !getNLPPlugin())
                                return false;
                            return true;
                        })
                    ));
                cb.setValue(ExtendedGraphInstances.settings.nodesColorFunction);
                cb.onChange((value) => {
                    let functionKey = value as NodeStatFunction;
                    if (!getNLPPlugin() && nodeStatFunctionNeedsNLP[functionKey]) {
                        new Notice(`${t("notices.nlpPluginRequired")} (${functionKey})`);
                        functionKey = 'default';
                        this.nodesColorFunctionDropdown?.setValue(functionKey);
                    }

                    ExtendedGraphInstances.settings.nodesColorFunction = functionKey;
                    this.setWarning(this.warningNodeColorSetting, NodeStatCalculatorFactory.getWarning(functionKey));
                    ExtendedGraphInstances.plugin.saveSettings();
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
        this.setWarning(setting, NodeStatCalculatorFactory.getWarning(ExtendedGraphInstances.settings.nodesColorFunction));
    }

    private addStatsDirection(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.nodeStatsDirection"))
            .setDesc(t("features.nodeStatsDirectionDesc"))
            .addDropdown(cb => {
                const options: Record<GraphStatsDirection, string> = {
                    normal: t("features.nodeStatsDirectionNormal"),
                    reversed: t("features.nodeStatsDirectionReversed"),
                    undirected: t("features.nodeStatsDirectionUndirected"),
                };
                cb.addOptions(options);
                cb.setValue(ExtendedGraphInstances.settings.graphStatsDirection);
                cb.onChange(async (value) => {
                    ExtendedGraphInstances.settings.graphStatsDirection = value as GraphStatsDirection;
                    await ExtendedGraphInstances.plugin.saveSettings();
                })
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addColorPaletteSettingForNodes(): void {
        this.nodesPaletteSetting = new SettingColorPalette(this.containerEl, this.settingTab, 'stats-colors-nodes')
            .setDesc(t("features.nodeColorsPaletteDesc"));

        this.nodesPaletteSetting.setValue(ExtendedGraphInstances.settings.nodesColorColormap);

        this.nodesPaletteSetting.onPaletteChange((palette: string) => {
            ExtendedGraphInstances.settings.nodesColorColormap = palette;
            ExtendedGraphInstances.plugin.saveSettings();
            ExtendedGraphInstances.graphsManager.nodesColorCalculator?.mapStat();
            ExtendedGraphInstances.graphsManager.updatePaletteForNodesStat();
        });

        // Push to body list
        this.elementsBody.push(this.nodesPaletteSetting.settingEl);
    }

    private addLinkSizeFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.linkSizesFunction"))
            .setDesc(t("features.linkSizesFunctionDesc"))
            .addDropdown(cb => {
                this.linksSizeFunctionDropdown = cb;
                cb.addOptions(
                    Object.fromEntries(Object.entries(linkStatFunctionLabels)
                        .filter(entry => {
                            const fn = entry[0] as LinkStatFunction;
                            if (linkStatFunctionNeedsNLP[fn] && !getNLPPlugin())
                                return false;
                            return true;
                        })
                    )
                );
                cb.setValue(ExtendedGraphInstances.settings.linksSizeFunction);
                cb.onChange((value) => {
                    this.recomputeLinksSizes(value as LinkStatFunction);
                });
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addLinkColorFunction(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.linkColorsFunction"))
            .setDesc(t("features.linkColorsFunctionDesc") + " ⚠️ " + t("features.linksFeatureRequired"))
            .addDropdown(cb => {
                this.linksColorFunctionDropdown = cb;
                cb.addOptions(
                    Object.fromEntries(Object.entries(linkStatFunctionLabels)
                        .filter(entry => {
                            const fn = entry[0] as LinkStatFunction;
                            if (linkStatFunctionNeedsNLP[fn] && !getNLPPlugin())
                                return false;
                            return true;
                        })
                    )
                );
                cb.setValue(ExtendedGraphInstances.settings.linksColorFunction);
                cb.onChange((value) => {
                    this.recomputeLinksColors(value as LinkStatFunction);
                });
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addColorPaletteSettingForLinks(): void {
        this.linksPaletteSetting = new SettingColorPalette(this.containerEl, this.settingTab, 'stats-colors-links')
            .setDesc(t("features.linkColorsPaletteDesc"));

        this.linksPaletteSetting.setValue(ExtendedGraphInstances.settings.linksColorColormap);

        this.linksPaletteSetting.onPaletteChange((palette: string) => {
            ExtendedGraphInstances.settings.linksColorColormap = palette;
            ExtendedGraphInstances.plugin.saveSettings();
            ExtendedGraphInstances.graphsManager.linksColorCalculator?.mapStat();
            ExtendedGraphInstances.graphsManager.updatePaletteForLinksStat();
        });

        // Push to body list
        this.elementsBody.push(this.linksPaletteSetting.settingEl);
    }

    private addRecomputeStatsOnGraphChange(): void {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.nodeStatsRecomputeOnGraphChange"))
            .setDesc(t("features.nodeStatsRecomputeOnGraphChangeDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.recomputeStatsOnGraphChange);
                cb.onChange((value) => {
                    ExtendedGraphInstances.settings.recomputeStatsOnGraphChange = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                });
            });

        this.elementsBody.push(setting.settingEl);
    }



    onCustomPaletteModified(oldName: string, newName: string): void {
        // Check if the colormap is no longer in the settings
        if (!getCMapData(ExtendedGraphInstances.settings.nodesColorColormap, ExtendedGraphInstances.settings)) {
            // If the old name matches AND the new name is valid, change the name
            if (ExtendedGraphInstances.settings.nodesColorColormap === oldName && getCMapData(newName, ExtendedGraphInstances.settings)) {
                ExtendedGraphInstances.settings.nodesColorColormap = newName;
            }
            // Otherwise, reset it
            else {
                ExtendedGraphInstances.settings.nodesColorColormap = "rainbow";
            }
        }
        this.nodesPaletteSetting.populateCustomOptions();
        this.nodesPaletteSetting.setValue(ExtendedGraphInstances.settings.nodesColorColormap);

        // Check if the colormap is no longer in the settings
        if (!getCMapData(ExtendedGraphInstances.settings.linksColorColormap, ExtendedGraphInstances.settings)) {
            // If the old name matches AND the new name is valid, change the name
            if (ExtendedGraphInstances.settings.linksColorColormap === oldName && getCMapData(newName, ExtendedGraphInstances.settings)) {
                ExtendedGraphInstances.settings.linksColorColormap = newName;
            }
            // Otherwise, reset it
            else {
                ExtendedGraphInstances.settings.linksColorColormap = "rainbow";
            }
        }
        this.linksPaletteSetting.populateCustomOptions();
        this.linksPaletteSetting.setValue(ExtendedGraphInstances.settings.linksColorColormap);
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

    private recomputeLinksSizes(functionKey: LinkStatFunction): void {
        if (!getNLPPlugin() && linkStatFunctionNeedsNLP[functionKey]) {
            new Notice(`${t("notices.nlpPluginRequired")} (${functionKey})`);
            functionKey = 'default';
            this.linksSizeFunctionDropdown?.setValue(functionKey);
        }

        ExtendedGraphInstances.settings.linksSizeFunction = functionKey;
        ExtendedGraphInstances.plugin.saveSettings();
    }

    private recomputeLinksColors(functionKey: LinkStatFunction): void {
        if (!getNLPPlugin() && linkStatFunctionNeedsNLP[functionKey]) {
            new Notice(`${t("notices.nlpPluginRequired")} (${functionKey})`);
            functionKey = 'default';
            this.linksColorFunctionDropdown?.setValue(functionKey);
        }

        ExtendedGraphInstances.settings.linksColorFunction = functionKey;
        ExtendedGraphInstances.plugin.saveSettings();
    }
}