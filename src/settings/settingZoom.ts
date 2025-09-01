import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, ExtendedGraphInstances, SettingsSection, t } from "../internal";

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
                const preview = document.createTextNode(ExtendedGraphInstances.settings.zoomFactor.toString());
                if (preview) {
                    cb.sliderEl.parentElement?.insertBefore(preview, cb.sliderEl);
                }
                cb.setLimits(0, 8, 0.5)
                    .setValue(ExtendedGraphInstances.settings.zoomFactor)
                    .onChange(value => {
                        ExtendedGraphInstances.settings.zoomFactor = value;
                        if (preview) preview.textContent = ExtendedGraphInstances.settings.zoomFactor.toString();
                        ExtendedGraphInstances.plugin.saveSettings();
                    });
            });
        setting.controlEl.addClass("setting-item-description");

        this.elementsBody.push(setting.settingEl);
    }
}