import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, ExtendedGraphInstances, SettingsSectionPerGraphType, t } from "../internal";
import { SettingMultiPropertiesModal } from "../ui/modals/settingPropertiesModal";

export class SettingIcons extends SettingsSectionPerGraphType {
    colorSetting: Setting | undefined;
    parentSetting: Setting | undefined;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'icons', '', t("features.ids.icons"), t("features.icons"), 'origami', t("features.iconsDesc"));
    }

    protected override addBody(): void {
        this.colorSetting = undefined;
        this.parentSetting = undefined;

        this.addProperty();
        this.addSupportForPlugins();
        this.addBackgroundOpacity();
        this.addBorderWidth();
    }

    private addProperty(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(t("features.iconProperties"))
                .setDesc(t("features.iconPropertiesDesc"))
                .addExtraButton(cb => {
                    cb.setIcon('mouse-pointer-click');
                    cb.onClick(() => {
                        const modal = new SettingMultiPropertiesModal(
                            t("features.iconProperties"),
                            t("features.iconPropertiesAdd"),
                            ExtendedGraphInstances.settings.iconProperties
                        );
                        modal.open();
                    })
                }
                ).settingEl
        );
    }

    private addSupportForPlugins(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(t("features.iconUsePlugin"))
                .setDesc(t("features.iconUsePluginDesc"))
                .addToggle(cb => {
                    cb.setValue(ExtendedGraphInstances.settings.usePluginForIcon);
                    cb.onChange((value) => {
                        ExtendedGraphInstances.settings.usePluginForIcon = value;
                        ExtendedGraphInstances.plugin.saveSettings();
                        this.colorSetting?.setVisibility(value);
                        this.parentSetting?.setVisibility(value);
                    })
                }).settingEl
        );

        this.colorSetting = new Setting(this.settingTab.containerEl)
            .setName(t("features.iconUsePluginColor"))
            .setDesc(t("features.iconUsePluginColorDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.usePluginForIconColor);
                cb.onChange((value) => {
                    ExtendedGraphInstances.settings.usePluginForIconColor = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            });
        this.colorSetting?.setVisibility(ExtendedGraphInstances.settings.usePluginForIcon);
        this.elementsBody.push(this.colorSetting.settingEl);

        this.parentSetting = new Setting(this.settingTab.containerEl)
            .setName(t("features.iconUseParentIcon"))
            .setDesc(t("features.iconUseParentIconDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.useParentIcon);
                cb.onChange((value) => {
                    ExtendedGraphInstances.settings.useParentIcon = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            });
        this.parentSetting?.setVisibility(ExtendedGraphInstances.settings.usePluginForIcon);
        this.elementsBody.push(this.parentSetting.settingEl);
    }

    private addBackgroundOpacity(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(t("features.iconBackgroundOpacity"))
                .setDesc(t("features.iconBackgroundOpacityDesc"))
                .addText(cb => {
                    cb.inputEl.addClass("number");
                    cb.setValue(ExtendedGraphInstances.settings.backgroundOpacityWithIcon.toString());
                    cb.onChange(async (value) => {
                        const floatValue = value === "" ? 0 : parseFloat(value);
                        if (!isNaN(floatValue)) {
                            ExtendedGraphInstances.settings.backgroundOpacityWithIcon = Math.clamp(floatValue, 0, 1);
                            await ExtendedGraphInstances.plugin.saveSettings();
                        }
                    })
                }).settingEl
        );
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(t("features.iconBackgroundColor"))
                .setDesc(t("features.iconBackgroundColorDesc"))
                .addToggle(cb => {
                    cb.setValue(ExtendedGraphInstances.settings.useIconColorForBackgroud);
                    cb.onChange(async (value) => {
                        ExtendedGraphInstances.settings.useIconColorForBackgroud = value;
                        await ExtendedGraphInstances.plugin.saveSettings();
                    })
                }).settingEl
        );
    }

    private addBorderWidth(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(t("features.iconBorderWidth"))
                .setDesc(t("features.iconBorderWidthDesc"))
                .addText(cb => {
                    cb.inputEl.addClass("number");
                    cb.setValue(ExtendedGraphInstances.settings.borderWidthWithIcon.toString());
                    cb.onChange(async (value) => {
                        const floatValue = value === "" ? 0 : parseFloat(value);
                        if (!isNaN(floatValue)) {
                            ExtendedGraphInstances.settings.borderWidthWithIcon = Math.max(floatValue, 0);
                            await ExtendedGraphInstances.plugin.saveSettings();
                        }
                    })
                }).settingEl
        );
    }
}