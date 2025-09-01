import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FeatureSetting, ExtendedGraphInstances, SettingsSection, t } from "../internal";
import { SettingMultiPropertiesModal } from "../ui/modals/settingPropertiesModal";

export class SettingImages extends SettingsSection {
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'images', t("features.ids.images"), t("features.image"), 'image', t("features.imageDesc"));
    }

    protected override addBody() {
        this.addImagesFromProperties();
        this.addImagesFromEmbeds();
        this.addImagesForAttachments();
        this.addBorderFactor();
        this.addAllowExternal();
    }

    private addImagesFromProperties() {
        this.elementsBody.push(new FeatureSetting(
            this.settingTab.containerEl,
            t("features.imagesFromProperty"),
            t("features.imagesFromPropertyDesc"),
            'imagesFromProperty'
        ).settingEl);


        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.imageProperties"))
            .setDesc(t("features.imagePropertiesDesc"))
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        t("features.imageProperties"),
                        t("features.imagePropertiesAdd"),
                        ExtendedGraphInstances.settings.imageProperties
                    );
                    modal.open();
                })
            }
            ).settingEl);
    }

    private addImagesFromEmbeds() {
        this.elementsBody.push(new FeatureSetting(
            this.settingTab.containerEl,
            t("features.imagesFromEmbeds"),
            t("features.imagesFromEmbedsDesc"),
            'imagesFromEmbeds'
        ).settingEl);
    }

    private addImagesForAttachments() {
        this.elementsBody.push(new FeatureSetting(
            this.settingTab.containerEl,
            t("features.imagesForAttachments"),
            t("features.imagesForAttachmentsDesc"),
            'imagesForAttachments'
        ).settingEl);
    }

    private addBorderFactor() {
        const setting = new Setting(this.settingTab.containerEl)
            .setName(t("features.imageBorderWidth"))
            .setDesc(t("features.imageBorderWidthDesc"))
            .addSlider(cb => {
                const preview = document.createTextNode(ExtendedGraphInstances.settings.borderFactor.toString() + "%");
                if (preview) {
                    cb.sliderEl.parentElement?.insertBefore(preview, cb.sliderEl);
                }
                cb.setLimits(0, 50, 1)
                    .setValue(ExtendedGraphInstances.settings.borderFactor * 100)
                    .onChange(value => {
                        ExtendedGraphInstances.settings.borderFactor = value / 100;
                        if (preview) preview.textContent = ExtendedGraphInstances.settings.borderFactor.toString() + "%";
                        ExtendedGraphInstances.plugin.saveSettings();
                    });
            });
        setting.controlEl.addClass("setting-item-description");

        this.elementsBody.push(setting.settingEl);
    }

    private addAllowExternal() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.imagesAllowExternal"))
            .setDesc(t("features.imagesAllowExternalDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.allowExternalImages);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.allowExternalImages = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.imagesAllowExternalLocal"))
            .setDesc(t("features.imagesAllowExternalLocalDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.allowExternalLocalImages);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.allowExternalLocalImages = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }
}