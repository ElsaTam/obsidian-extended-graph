import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, ExtendedGraphInstances, SettingInteractives, t, TAG_KEY } from "../../internal";

export class SettingTags extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'tags', TAG_KEY, t("features.ids.tags"), t("features.interactives.tags"), 'tags', t("features.interactives.tagsDesc"), true);
    }

    protected override addBody(): void {
        super.addBody();

        // Show on graph
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.arcsAdd"))
            .setDesc(t("features.interactives.arcsAddTagDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    protected override isValueValid(name: string): boolean {
        return /^[^\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~\[\]\\\s]+/.test(name);
    }

    protected override getPlaceholder(): string {
        return "tag";
    }

    protected override getAllTypes(): string[] {
        return SettingTags.getAllTypes();
    }

    static getAllTypes(): string[] {
        return Object.keys(ExtendedGraphInstances.app.metadataCache.getTags()).map(tag => tag.replace("#", ""));
    }
}