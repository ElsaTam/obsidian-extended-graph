import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, ExtendedGraphInstances, SettingsSectionPerGraphType, t } from "../internal";
import { SettingMultiPropertiesModal } from "../ui/modals/settingPropertiesModal";

export class SettingNames extends SettingsSectionPerGraphType {
    verticalOffset: Setting;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'names', '', t("features.ids.names"), t("features.names"), 'case-sensitive', t("features.namesDesc"));
    }

    protected override addBody() {
        this.addShowWhenNeighborHighlighted();
        this.addNumberOfCharacters();
        this.addOnlyFilename();
        this.addNoExtension();
        this.addUseProperty();
        this.addBackground();
        this.addDynamicVerticalOffset();
        this.addVerticalOffset();
    }

    private addNumberOfCharacters() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesNumberOfCharacters"))
            .setDesc(t("features.namesNumberOfCharactersDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(ExtendedGraphInstances.settings.numberOfCharacters?.toString() || '')
                    .onChange(async (value) => {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue)) {
                            ExtendedGraphInstances.settings.numberOfCharacters = intValue;
                        }
                        else {
                            ExtendedGraphInstances.settings.numberOfCharacters = null;
                        }
                        await ExtendedGraphInstances.plugin.saveSettings();
                    })
            })
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setPlaceholder(t("features.namesEllipsisPlaceholder"))
                cb.setValue(ExtendedGraphInstances.settings.ellipsis.toString())
                    .onChange(async (value) => {
                        ExtendedGraphInstances.settings.ellipsis = value;
                        await ExtendedGraphInstances.plugin.saveSettings();
                    })
            }).settingEl);
    }

    private addOnlyFilename() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesShowOnlyFileName"))
            .setDesc(t("features.namesShowOnlyFileNameDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.showOnlyFileName);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.showOnlyFileName = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addNoExtension() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesNoExtension"))
            .setDesc(t("features.namesNoExtensionDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.noExtension);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.noExtension = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addUseProperty() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesUseProperties"))
            .setDesc(t("features.namesUsePropertiesDesc"))
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        t("features.namesUseProperties"),
                        t("features.namesUsePropertiesAdd"),
                        ExtendedGraphInstances.settings.usePropertiesForName
                    );
                    modal.open();
                })
            }
            ).settingEl);
    }

    private addBackground() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesBackground"))
            .setDesc(t("features.namesBackgroundDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.addBackgroundToName);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.addBackgroundToName = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addDynamicVerticalOffset() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesDynamicVerticalOffset"))
            .setDesc(t("features.namesDynamicVerticalOffsetDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.dynamicVerticalOffset);
                cb.onChange(value => {
                    this.verticalOffset.setDisabled(value);
                    ExtendedGraphInstances.settings.dynamicVerticalOffset = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addVerticalOffset() {
        this.verticalOffset = new Setting(this.settingTab.containerEl)
            .setName(t("features.namesVerticalOffset"))
            .setDesc(t("features.namesVerticalOffsetDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(ExtendedGraphInstances.settings.nameVerticalOffset.toString());
                cb.onChange(value => {
                    const intValue = parseInt(value);
                    ExtendedGraphInstances.settings.nameVerticalOffset = isNaN(intValue) ? 0 : intValue;
                    ExtendedGraphInstances.plugin.saveSettings();
                });
            });
        this.verticalOffset.setDisabled(ExtendedGraphInstances.settings.dynamicVerticalOffset);

        this.elementsBody.push(this.verticalOffset.settingEl);
    }

    private addShowWhenNeighborHighlighted() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.namesShowWhenNeighborHighlighted"))
            .setDesc(t("features.namesShowWhenNeighborHighlightedDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.showNamesWhenNeighborHighlighted);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.showNamesWhenNeighborHighlighted = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

}