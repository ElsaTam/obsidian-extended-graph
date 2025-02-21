import { Setting } from "obsidian";
import { ExtendedGraphSettingTab, PluginInstances, SettingsSectionCollapsible } from "src/internal";
import STRINGS from "src/Strings";

export class SettingFocus extends SettingsSectionCollapsible {
    allTopElements: HTMLElement[] = [];
    
    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'focus', '', STRINGS.features.focus, 'telescope', STRINGS.features.focusDesc);
    }

    protected override addHeader(): void {
        super.addHeader();
        this.toggles['localgraph']?.remove();
    }

    protected override addBody(): void {
        this.elementsBody.push(
            new Setting(this.settingTab.containerEl)
                .setName(STRINGS.features.focusScale)
                .setDesc(STRINGS.features.focusScaleDesc)
                .addText(cb => cb
                    .setValue(PluginInstances.settings.focusScaleFactor.toString())
                    .onChange(async (value) => {
                        const n = parseFloat(value);
                        if (n) {
                            PluginInstances.settings.focusScaleFactor = n;
                            await PluginInstances.plugin.saveSettings();
                        }
                })).settingEl
        );
    }
}