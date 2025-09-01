import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, ExtendedGraphInstances, SettingsSectionPerGraphType, t } from "../internal";

export class SettingArrows extends SettingsSectionPerGraphType {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'arrows', '', t("features.ids.arrows"), t("features.arrows"), 'mouse-pointer-2', t("features.arrowsDesc"));
    }

    protected override addBody() {
        this.addInvertArrows();
        this.addFlatArrows();
        this.addOpaqueArrows();
        this.addScaleArrow();
        this.addColorArrow();
    }

    private addInvertArrows() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.arrowsInvert"))
            .setDesc(t("features.arrowsInvertDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.invertArrows);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.invertArrows = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addFlatArrows() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.arrowsFlat"))
            .setDesc(t("features.arrowsFlatDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.flatArrows);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.flatArrows = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addOpaqueArrows() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.arrowsOpaque"))
            .setDesc(t("features.arrowsOpaqueDesc"))
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', t("features.arrowsOpaqueKeepFading"));
                cb.setValue(ExtendedGraphInstances.settings.opaqueArrowsButKeepFading);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.opaqueArrowsButKeepFading = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', t("features.arrowsOpaqueAlways"));
                cb.setValue(ExtendedGraphInstances.settings.alwaysOpaqueArrows);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.alwaysOpaqueArrows = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addScaleArrow() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.arrowsScale"))
            .setDesc(t("features.arrowsScaleDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(ExtendedGraphInstances.settings.arrowScale.toString())
                    .onChange(async (value) => {
                        if (value === '') {
                            ExtendedGraphInstances.settings.arrowScale = 1;
                            await ExtendedGraphInstances.plugin.saveSettings();
                        }
                        const floatValue = parseFloat(value);
                        if (!isNaN(floatValue)) {
                            ExtendedGraphInstances.settings.arrowScale = Math.max(0.1, floatValue);
                            await ExtendedGraphInstances.plugin.saveSettings();
                        }
                    });
            }).settingEl);


        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.arrowsFixedSize"))
            .setDesc(t("features.arrowsFixedSizeDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.arrowFixedSize);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.arrowFixedSize = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addColorArrow() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.arrowsColor"))
            .setDesc(t("features.arrowsColorDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.arrowColorBool);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.arrowColorBool = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            })
            .addColorPicker(cb => {
                cb.setValue(ExtendedGraphInstances.settings.arrowColor);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.arrowColor = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }
}