import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FilesSuggester, ExtendedGraphInstances, SettingsSection, t, UIElements } from "../internal";

export class SettingFilter extends SettingsSection {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'filter', t("features.ids.filter"), t('features.filters'), 'file-x', t('features.filtersDesc'));
    }

    protected override addBody(): void {
        this.addIgnoreInlineLinks();
        this.addNewFilterSetting();
        for (const filter of ExtendedGraphInstances.settings.filterAbstractFiles) {
            this.addRegex(filter);
        }
    }

    private addIgnoreInlineLinks() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.ignoreInlineLinks"))
            .setDesc(t("features.ignoreInlineLinksDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.ignoreInlineLinks);
                cb.onChange(async (value) => {
                    ExtendedGraphInstances.settings.ignoreInlineLinks = value;
                    await ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addNewFilterSetting() {
        const setting = new Setting(this.settingTab.containerEl).setName(t("query.excludeRegex"));
        setting.addExtraButton(cb => {
            UIElements.setupExtraButton(cb, 'add');
            cb.onClick(async () => {
                const lastDiv = this.elementsBody.last() ?? setting.settingEl;
                const newFilter = { regex: "", flag: "" };
                ExtendedGraphInstances.settings.filterAbstractFiles.push(newFilter);
                const regexSetting = this.addRegex(newFilter);
                lastDiv.insertAdjacentElement('afterend', regexSetting.settingEl);
                await ExtendedGraphInstances.plugin.saveSettings();
            });
        });

        this.elementsBody.push(setting.settingEl);
    }

    private addRegex(filter: { regex: string, flag: string }): Setting {
        const setting = new Setting(this.settingTab.containerEl)
            .addSearch(search => {
                new FilesSuggester(search.inputEl, (value: string) => {
                    filter.regex = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                });
                search.setValue(filter.regex);
                search.onChange((value) => {
                    filter.regex = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                });
            })
            .addText(cb => {
                cb.setPlaceholder("flag")
                    .setValue(filter.flag)
                    .onChange((value) => {
                        filter.flag = value;
                        ExtendedGraphInstances.plugin.saveSettings();
                    });
            });

        setting.addExtraButton(cb => {
            UIElements.setupExtraButton(cb, 'delete');
            cb.onClick(() => {
                ExtendedGraphInstances.settings.filterAbstractFiles.remove(filter);
                ExtendedGraphInstances.plugin.saveSettings();
                setting.settingEl.remove();
                this.elementsBody.remove(setting.settingEl);
            });
        });

        this.elementsBody.push(setting.settingEl);
        setting.settingEl.addClasses(this.itemClasses);
        return setting;
    }
}