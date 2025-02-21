import { PluginSettingTab, Setting } from "obsidian";
import { SettingFocus, SettingFolders, SettingImages, SettingLinks, SettingElementsStats, SettingPerformance, SettingPropertiesArray, SettingShapes, SettingsSection, SettingTags, SettingZoom, PluginInstances, graphTypeLabels } from "src/internal";
import ExtendedGraphPlugin from "src/main";
import STRINGS from "src/Strings";

export class ExtendedGraphSettingTab extends PluginSettingTab {
    sections: SettingsSection[] = [];

    constructor(plugin: ExtendedGraphPlugin) {
        super(PluginInstances.app, plugin);

        this.sections.push(new SettingTags(this));
        this.sections.push(new SettingPropertiesArray(this));
        this.sections.push(new SettingLinks(this));
        this.sections.push(new SettingFolders(this));
        this.sections.push(new SettingImages(this));
        this.sections.push(new SettingFocus(this));
        this.sections.push(new SettingShapes(this));
        this.sections.push(new SettingElementsStats(this));
        this.sections.push(new SettingZoom(this));
        this.sections.push(new SettingPerformance(this));
    }

    display(): void {
        this.containerEl.empty();
        this.containerEl.addClass("extended-graph-settings");

        this.addAutoEnable();
        this.addDisableNodes();
        this.addBorderUnresolved();

        // FEATURES
        for (const section of this.sections) {
            section.display();
        }
    }

    addAutoEnable(): void {
        new Setting(this.containerEl)
            .setName(STRINGS.features.autoEnable)
            .setDesc(STRINGS.features.autoEnableDesc)
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['graph']);
                cb.setValue(PluginInstances.settings.enableFeatures['graph']['auto-enabled']);
                cb.onChange(value => {
                    PluginInstances.settings.enableFeatures['graph']['auto-enabled'] = value;
                    PluginInstances.plugin.saveSettings();
                })
            })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['localgraph']);
                cb.setValue(PluginInstances.settings.enableFeatures['localgraph']['auto-enabled']);
                cb.onChange(value => {
                    PluginInstances.settings.enableFeatures['localgraph']['auto-enabled'] = value;
                    PluginInstances.plugin.saveSettings();
                })
            });
        
        new Setting(this.containerEl)
            .setName(STRINGS.states.startingState)
            .setDesc(STRINGS.states.startingStateDesc)
            .addDropdown(cb => {
                cb.addOptions(Object.fromEntries(Object.values(PluginInstances.settings.states).map(data => {
                    return [data.id, data.name]
                })));
                cb.setValue(PluginInstances.settings.startingStateID);
                cb.onChange(id => {
                    PluginInstances.settings.startingStateID = id;
                    PluginInstances.plugin.saveSettings();
                })
            })
    }

    addDisableNodes() {
        new Setting(this.containerEl)
            .setName(STRINGS.features.disableNodes)
            .setDesc(STRINGS.features.disableNodesDesc)
            .addToggle(cb => {
                cb.setValue(!PluginInstances.settings.fadeOnDisable);
                cb.onChange(value => {
                    PluginInstances.settings.fadeOnDisable = !value;
                    PluginInstances.plugin.saveSettings();
                })
            });
    }

    addBorderUnresolved() {
        new Setting(this.containerEl)
            .setName(STRINGS.features.borderUnresolved)
            .setDesc(STRINGS.features.borderUnresolvedDesc)
            .addText(cb => cb
                .setValue(PluginInstances.settings.borderUnresolved.toString())
                .onChange(async (value) => {
                    if (value === '') {
                        PluginInstances.settings.borderUnresolved = '';
                        await PluginInstances.plugin.saveSettings();
                    }
                    const intValue = parseFloat(value);
                    if (!isNaN(intValue)) {
                        PluginInstances.settings.borderUnresolved = Math.clamp(intValue, 0, 1);
                        await PluginInstances.plugin.saveSettings();
                    }
            }));
    }
}