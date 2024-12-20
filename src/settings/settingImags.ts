import { Setting } from "obsidian";
import { ExtendedGraphSettingTab } from "./settingTab";

export class SettingImages {
    settingTab: ExtendedGraphSettingTab;
    allTopElements: HTMLElement[] = [];
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        this.settingTab = settingTab;
    }

    display() {
        let containerEl = this.settingTab.containerEl;
        this.allTopElements.push(
            new Setting(containerEl)
                .setName("Images")
                .setHeading()
                .settingEl
        );

        this.allTopElements.push(
            new Setting(containerEl)
                .setName('Image property')
                .setDesc('Name of the propery used to query the image of the node\'s note.')
                .addText(cb => cb
                    .setValue(this.settingTab.plugin.settings.imageProperty)
                    .onChange(async (value) => {
                        this.settingTab.plugin.settings.imageProperty = value;
                        await this.settingTab.plugin.saveSettings();
                }))
                .settingEl
        );

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-image");
        })
    }
}