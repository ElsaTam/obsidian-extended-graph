import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, ExternalLinkOption, ExtendedGraphInstances, SettingMultiPropertiesModal, SettingsSection, t, ExternalLinkOpenMode } from "../internal";

export class SettingBeta extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'beta', t("features.ids.beta"), t("beta.betaFeatures"), 'hourglass', "");
    }

    protected override addBody() {
        this.addRevertAction();
        this.addExternalLinks();
    }

    private addRevertAction() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("beta.revertAction"))
            .setDesc(t("beta.revertActionDesc"))
            .addToggle(cb => cb
                .setValue(ExtendedGraphInstances.settings.revertAction)
                .onChange(async (value) => {
                    ExtendedGraphInstances.settings.revertAction = value;
                    await ExtendedGraphInstances.plugin.saveSettings();
                }));

        this.elementsBody.push(setting.settingEl);
    }

    private addExternalLinks() {

        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.externalLinks"))
            .setDesc(t("features.externalLinksDesc"))
            .addDropdown(cb => {
                const options: Record<ExternalLinkOption, string> = {
                    none: t("features.externalLinksOptions.none"),
                    domain: t("features.externalLinksOptions.domain"),
                    href: t("features.externalLinksOptions.href"),
                    domain_and_href: t("features.externalLinksOptions.domain_and_href")
                };
                cb.addOptions(options);
                cb.setValue(ExtendedGraphInstances.settings.externalLinks);
                cb.onChange(async (value) => {
                    ExtendedGraphInstances.settings.externalLinks = value as ExternalLinkOption;
                    await ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.externalLinksProperties"))
            .setDesc(t("features.externalLinksPropertiesDesc"))
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        t("features.externalLinksProperties"),
                        t("features.externalLinksPropertiesAdd"),
                        ExtendedGraphInstances.settings.externalLinksProperties
                    );
                    modal.open();
                })
            }
            ).settingEl);

        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.externalLinksOpenMode"))
            .setDesc(t("features.externalLinksOpenModeDesc"))
            .addDropdown(cb => {
                const options: Record<ExternalLinkOpenMode, string> = {
                    web: t("features.externalLinksModes.web"),
                    note: t("features.externalLinksModes.note"),
                    choice: t("features.externalLinksModes.choice"),
                };
                cb.addOptions(options);
                cb.setValue(ExtendedGraphInstances.settings.externalLinkOpenMode);
                cb.onChange(async (value) => {
                    ExtendedGraphInstances.settings.externalLinkOpenMode = value as ExternalLinkOpenMode;
                    await ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }
}