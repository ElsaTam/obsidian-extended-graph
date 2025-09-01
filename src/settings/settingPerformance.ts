import { Setting } from "obsidian";
import { CSSSnippetsSuggester, ExtendedGraphSettingTab, ExtendedGraphInstances, SettingsSection, t } from "../internal";

export class SettingPerformance extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'performances', t("features.ids.performances"), t("features.performance"), 'cpu', "");
    }

    protected override addBody() {
        this.addDelay();
        this.addNumberOfNodes();
        this.addEnableCSS();
    }

    private addDelay() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.performanceDelay"))
            .setDesc(t("features.performanceDelayDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(ExtendedGraphInstances.settings.delay.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue)) {
                            ExtendedGraphInstances.settings.delay = intValue;
                            await ExtendedGraphInstances.plugin.saveSettings();
                        }
                    })
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addNumberOfNodes() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.performanceMaxNodes"))
            .setDesc(t("features.performanceMaxNodesDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(ExtendedGraphInstances.settings.maxNodes.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue)) {
                            ExtendedGraphInstances.settings.maxNodes = intValue;
                            await ExtendedGraphInstances.plugin.saveSettings();
                        }
                    })
            });

        this.elementsBody.push(setting.settingEl);
    }

    private addEnableCSS() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("beta.enableCSS"))
            .setDesc(t("beta.enableCSSDesc"))
            .addToggle(cb => cb
                .setValue(ExtendedGraphInstances.settings.enableCSS)
                .onChange(value => {
                    ExtendedGraphInstances.settings.enableCSS = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                }))
            .addSearch(cb => {
                cb.setValue(ExtendedGraphInstances.settings.cssSnippetFilename);
                new CSSSnippetsSuggester(cb.inputEl, (value: string) => {
                    ExtendedGraphInstances.settings.cssSnippetFilename = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                });
                cb.onChange((value) => {
                    ExtendedGraphInstances.settings.cssSnippetFilename = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            });

        this.elementsBody.push(setting.settingEl);
    }
}