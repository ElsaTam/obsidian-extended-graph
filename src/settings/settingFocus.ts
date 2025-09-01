import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, ExtendedGraphInstances, SettingsSectionPerGraphType, t } from "../internal";

export class SettingFocus extends SettingsSectionPerGraphType {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'focus', '', t("features.ids.focus"), t("features.focus"), 'telescope', t("features.focusDesc"));
    }

    protected override addHeader(): void {
        super.addHeader();
    }

    protected override addBody(): void {
        this.addFocusScale();
        this.addHighlightOpenNodes();
        this.addHighlightSearchResults();
    }

    private addFocusScale(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(t("features.focusScale"))
                .setDesc(t("features.focusScaleDesc"))
                .addText(cb => {
                    cb.inputEl.addClass("number");
                    cb.setValue(ExtendedGraphInstances.settings.focusScaleFactor.toString())
                        .onChange(async (value) => {
                            const n = parseFloat(value);
                            if (n) {
                                ExtendedGraphInstances.settings.focusScaleFactor = n;
                                await ExtendedGraphInstances.plugin.saveSettings();
                            }
                        })
                }).settingEl
        );
    }

    private addHighlightOpenNodes(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(t("features.focusOpenNodes"))
                .setDesc(t("features.focusOpenNodesDesc"))
                .addToggle(cb => {
                    cb.setValue(ExtendedGraphInstances.settings.highlightOpenNodes)
                        .onChange(async (value) => {
                            ExtendedGraphInstances.settings.highlightOpenNodes = value;
                            await ExtendedGraphInstances.plugin.saveSettings();
                        })
                }).settingEl
        );
    }

    private addHighlightSearchResults(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(t("features.focusSearchResults"))
                .setDesc(t("features.focusSearchResultsDesc"))
                .addToggle(cb => {
                    cb.setValue(ExtendedGraphInstances.settings.highlightSearchResults)
                        .onChange(async (value) => {
                            ExtendedGraphInstances.settings.highlightSearchResults = value;
                            await ExtendedGraphInstances.plugin.saveSettings();
                        })
                }).settingEl
        );
    }
}