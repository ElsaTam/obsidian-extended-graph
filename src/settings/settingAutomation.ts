import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, FeatureSetting, PluginInstances, SettingsSection } from "src/internal";
import STRINGS from "src/Strings";

export class SettingAutomation extends SettingsSection {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, STRINGS.features.automation, 'workflow', "");
    }

    protected override addBody() {
        this.addAutoEnable();
        this.addStartingState();
        this.addResetAfterChanges();
    }

    private addAutoEnable(): void {
        new FeatureSetting(
            this.containerEl,
            STRINGS.features.autoEnable,
            STRINGS.features.autoEnableDesc,
            'auto-enabled'
        );
    }

    private addStartingState() {
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
            });
    }

    private addResetAfterChanges() {
        new Setting(this.containerEl)
            .setName(STRINGS.features.autoReset)
            .setDesc(STRINGS.features.autoResetDesc)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.resetAfterChanges);
                cb.onChange((value) => {
                    PluginInstances.settings.resetAfterChanges = value;
                    PluginInstances.plugin.saveSettings();
                })
            });
    }

}