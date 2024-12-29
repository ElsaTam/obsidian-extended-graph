import { App, PluginSettingTab, Setting } from "obsidian";
import GraphExtendedPlugin from "src/main";
import { SettingTags, SettingLinks, SettingProperties, SettingPropertiesArray } from "./settingInteractive";
import { SettingFeatures } from "./settingFeatures";
import { SettingImages } from "./settingImages";
import { SettingFocus } from "./settingFocus";

export class ExtendedGraphSettingTab extends PluginSettingTab {
    plugin: GraphExtendedPlugin;
    tagSettings: SettingTags;
    propertiesSettingsArray: SettingPropertiesArray;
    linkSettings: SettingLinks;
    featuresSettings: SettingFeatures;
    imagesSettings: SettingImages;
    focusSettings: SettingFocus;

    constructor(app: App, plugin: GraphExtendedPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.tagSettings = new SettingTags(this);
        this.propertiesSettingsArray = new SettingPropertiesArray(this);
        this.linkSettings = new SettingLinks(this);
        this.featuresSettings = new SettingFeatures(this);
        this.imagesSettings = new SettingImages(this);
        this.focusSettings = new SettingFocus(this);
    }

    display() : void {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.addClass("extended-graph-settings");

        new Setting(containerEl)
            .setName('Maximum number of nodes')
            .setDesc('If the graph contains more nodes than this setting, the plugin will be disabled.')
            .addText(cb => cb
                .setValue(this.plugin.settings.maxNodes.toString())
                .onChange(async (value) => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        this.plugin.settings.maxNodes = intValue;
                        await this.plugin.saveSettings();
                    }
            }));

        new Setting(containerEl)
            .setName('Global filter')
            .setDesc('This filter query will be prepend at the beginning of every graph filter')
            .addTextArea(cb => cb
                .setValue(this.plugin.settings.globalFilter)
                .onChange(async (value) => {
                    this.plugin.settings.globalFilter = value;
                    await this.plugin.saveSettings();
                    this.plugin.graphsManager.onGlobalFilterChanged(value);
            }));

        new Setting(containerEl)
            .setName(`Disable nodes`)
            .setDesc(`When all arcs are disabled on the node, remove it from the graph.`)
            .addToggle(cb => {
                cb.setValue(!this.plugin.settings.fadeOnDisable);
                cb.onChange(value => {
                    this.plugin.settings.fadeOnDisable = !value;
                    this.plugin.saveSettings();
                })
            });

        // FEATURES
        this.featuresSettings.display();
        this.imagesSettings.display();
        this.tagSettings.display();
        this.propertiesSettingsArray.display();
        this.linkSettings.display();
        this.focusSettings.display();
    }
}