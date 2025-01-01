import { Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "./settingTab";

export class SettingFeatures {
    settingTab: ExtendedGraphSettingTab;
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        this.settingTab = settingTab;
    }

    display() {
        const containerEl = this.settingTab.containerEl;
        new Setting(containerEl)
            .setName("Features")
            .setHeading()
            .setDesc("Current graph will not be affected, you will need to open/enable them again to see the changes.");

        new Setting(containerEl)
            .setName("Tags")
            .setDesc("Display and filter tag types")
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.enableTags);
                containerEl.style.setProperty('--display-tag-features', this.settingTab.plugin.settings.enableTags ? 'flex' : 'none');
                cb.onChange(value => {
                    this.settingTab.plugin.settings.enableTags = value;
                    this.settingTab.plugin.saveSettings();
                    containerEl.style.setProperty('--display-tag-features', value ? 'flex' : 'none');
                });
            });

        new Setting(containerEl)
            .setName("Properties")
            .setDesc("Display and filter by property values")
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.enableProperties);
                containerEl.style.setProperty('--display-property-features', this.settingTab.plugin.settings.enableProperties ? 'flex' : 'none');
                cb.onChange(value => {
                    this.settingTab.plugin.settings.enableProperties = value;
                    this.settingTab.plugin.saveSettings();
                    containerEl.style.setProperty('--display-property-features', value ? 'flex' : 'none');
                });
            });

        new Setting(containerEl)
            .setName("Links")
            .setDesc("Display and filter link types")
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.enableLinks);
                containerEl.style.setProperty('--display-link-features', this.settingTab.plugin.settings.enableLinks ? 'flex' : 'none');
                cb.onChange(value => {
                    this.settingTab.plugin.settings.enableLinks = value;
                    this.settingTab.plugin.saveSettings();
                    containerEl.style.setProperty('--display-link-features', value ? 'flex' : 'none');
                })
            });

        new Setting(containerEl)
            .setName("Images")
            .setDesc("Display image on top of nodes")
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.enableImages);
                containerEl.style.setProperty('--display-image-features', this.settingTab.plugin.settings.enableImages ? 'flex' : 'none');
                cb.onChange(value => {
                    this.settingTab.plugin.settings.enableImages = value;
                    this.settingTab.plugin.saveSettings();
                    containerEl.style.setProperty('--display-image-features', value ? 'flex' : 'none');
                })
            });

        new Setting(containerEl)
            .setName("Focus active note")
            .setDesc("Scale up the node corresponding to the active note")
            .addToggle(cb => {
                cb.setValue(this.settingTab.plugin.settings.enableFocusActiveNote);
                containerEl.style.setProperty('--display-focus-features', this.settingTab.plugin.settings.enableFocusActiveNote ? 'flex' : 'none');
                cb.onChange(value => {
                    this.settingTab.plugin.settings.enableFocusActiveNote = value;
                    this.settingTab.plugin.saveSettings();
                    containerEl.style.setProperty('--display-focus-features', value ? 'flex' : 'none');
                })
            });
    }
}