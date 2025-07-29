import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSection, t } from "src/internal";

export class SettingZoom extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'zoom', t("features.ids.zoom"), t("features.zoomOnNode"), 'scan-search', "");
    }

    protected override addBody() {
        const containerEl = this.settingTab.containerEl;

        const setting = new Setting(containerEl)
            .setName(t("features.zoomScale"))
            .setDesc(t("features.zoomScaleDesc"))
            .addSlider(cb => {
                const preview = document.createTextNode(PluginInstances.settings.zoomFactor.toString());
                if (preview) {
                    cb.sliderEl.parentElement?.insertBefore(preview, cb.sliderEl);
                }
                cb.setLimits(0, 8, 0.5)
                    .setValue(PluginInstances.settings.zoomFactor)
                    .onChange(value => {
                        PluginInstances.settings.zoomFactor = value;
                        if (preview) preview.textContent = PluginInstances.settings.zoomFactor.toString();
                        PluginInstances.plugin.saveSettings();
                    });
            });
        setting.controlEl.addClass("setting-item-description");

        this.elementsBody.push(setting.settingEl);
    }
}