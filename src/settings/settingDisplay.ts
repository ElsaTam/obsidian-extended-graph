import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FeatureSetting, ExtendedGraphInstances, SettingsSection, t } from "../internal";

export class SettingDisplay extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'display', t("features.ids.display"), t("features.otherDisplay"), 'monitor', "");
    }

    protected override addBody() {
        this.addBorderUnresolved();
        this.addLinkSameColorAsNodes();
        this.addNoLineHighlight();
        this.addSpreadArcs();
        this.addWeightArcs();
        this.addBrightness();
        this.addFadeInElements();
        this.addAnimateDotsOnLinks();
        this.addAnimationSpeedForDot();
        this.addHorizontalLegend();
        this.addShowPinIcon();
    }


    private addBorderUnresolved() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.borderUnresolved"))
            .setDesc(t("features.borderUnresolvedDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(ExtendedGraphInstances.settings.borderUnresolved.toString())
                    .onChange(async (value) => {
                        if (value === '') {
                            ExtendedGraphInstances.settings.borderUnresolved = '';
                            await ExtendedGraphInstances.plugin.saveSettings();
                        }
                        const floatValue = parseFloat(value);
                        if (!isNaN(floatValue)) {
                            ExtendedGraphInstances.settings.borderUnresolved = Math.clamp(floatValue, 0, 1);
                            await ExtendedGraphInstances.plugin.saveSettings();
                        }
                    })
            }).settingEl);
    }

    private addLinkSameColorAsNodes() {
        this.elementsBody.push(new FeatureSetting(
            this.containerEl,
            t("features.linksSameColorAsNode"),
            t("features.linksSameColorAsNodeDesc"),
            'linksSameColorAsNode'
        ).settingEl);
    }

    private addNoLineHighlight() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.noLineHighlight"))
            .setDesc(t("features.noLineHighlightDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.noLineHighlight || false);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.noLineHighlight = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addSpreadArcs() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.interactives.arcsSpread"))
            .setDesc(t("features.interactives.arcsSpreadDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.spreadArcs || false);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.spreadArcs = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addWeightArcs() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.interactives.arcWeight"))
            .setDesc(t("features.interactives.arcWeightDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.weightArcs || false);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.weightArcs = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addBrightness() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.brightness"))
            .setDesc(t("features.brightnessDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.inputEl.insertAdjacentText('beforebegin', t("plugin.light"));
                cb.setValue(ExtendedGraphInstances.settings.interactivesBrightness.light.toString());
                cb.onChange(value => {
                    if (value === '') {
                        ExtendedGraphInstances.settings.interactivesBrightness.light = 1;
                        ExtendedGraphInstances.plugin.saveSettings();
                    }
                    const floatValue = parseFloat(value);
                    if (!isNaN(floatValue)) {
                        ExtendedGraphInstances.settings.interactivesBrightness.light = Math.max(floatValue, 0);
                        ExtendedGraphInstances.plugin.saveSettings();
                    }
                })
            })
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.inputEl.insertAdjacentText('beforebegin', t("plugin.dark"));
                cb.setValue(ExtendedGraphInstances.settings.interactivesBrightness.dark.toString());
                cb.onChange(value => {
                    if (value === '') {
                        ExtendedGraphInstances.settings.interactivesBrightness.dark = 1;
                        ExtendedGraphInstances.plugin.saveSettings();
                    }
                    const floatValue = parseFloat(value);
                    if (!isNaN(floatValue)) {
                        ExtendedGraphInstances.settings.interactivesBrightness.dark = Math.max(floatValue, 0);
                        ExtendedGraphInstances.plugin.saveSettings();
                    }
                })
            })
            .settingEl);
    }

    private addFadeInElements() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.fadeInElements"))
            .setDesc(t("features.fadeInElementsDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.fadeInElements);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.fadeInElements = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                });
            }).settingEl);
    }

    private addAnimateDotsOnLinks() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.animateDotsOnLinks"))
            .setDesc(t("features.animateDotsOnLinksDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.animateDotsOnLinks || false);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.animateDotsOnLinks = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                });
            }).settingEl);
    }

    private addAnimationSpeedForDot() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.animateDotsOnLinksSpeed"))
            .setDesc(t("features.animateDotsOnLinksSpeedDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(ExtendedGraphInstances.settings.animationSpeedForDots.toString())
                    .onChange(async (value) => {
                        const floatValue = parseFloat(value);
                        if (!isNaN(floatValue) && floatValue > 0) {
                            ExtendedGraphInstances.settings.animationSpeedForDots = floatValue;
                            await ExtendedGraphInstances.plugin.saveSettings();
                        }
                    })
            }).settingEl);
    }

    private addHorizontalLegend() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("UI.horizontalLegend"))
            .setDesc(t("UI.horizontalLegendDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.horizontalLegend);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.horizontalLegend = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                });
            }).settingEl);
    }

    private addShowPinIcon() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("UI.showPinIcon"))
            .setDesc(t("UI.showPinIconDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.showPinIcon);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.showPinIcon = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                });
            }).settingEl);
    }

}