import { ToggleComponent } from "obsidian";
import { ExtendedGraphSettingTab, Feature, GraphType, graphTypeLabels, makeCompatibleForClass, ExtendedGraphInstances, SettingsSection } from "../internal";


export abstract class SettingsSectionPerGraphType extends SettingsSection {
    feature: Feature;
    interactiveKey: string;
    toggles: Partial<Record<GraphType, HTMLDivElement>> = {};

    constructor(settingTab: ExtendedGraphSettingTab, feature: Feature, key: string, keyword: string, title: string, icon: string, description: string) {
        super(settingTab, feature, keyword, title, icon, description);

        this.feature = feature;
        this.interactiveKey = key;
        if (key !== '') this.itemClasses.push(`setting-${this.feature}-${makeCompatibleForClass(key)}`);
    }

    protected override addHeader(): void {
        super.addHeader();

        this.toggles = {};
        this.addToggle('graph');
        this.addToggle('localgraph');
    }

    protected addToggle(graphType: GraphType) {
        let enable = ExtendedGraphInstances.settings.enableFeatures[graphType][this.feature];
        if (this.feature === 'property-key') {
            enable = ExtendedGraphInstances.settings.additionalProperties[this.interactiveKey][graphType];
        }
        const toggle = this.settingHeader.controlEl.createDiv();
        toggle.addClass("toggle-labelled");
        toggle.insertAdjacentText("afterbegin", graphTypeLabels[graphType])
        new ToggleComponent(toggle)
            .setValue(enable)
            .onChange(value => {
                this.toggle(graphType, value);
            });
        this.toggles[graphType] = toggle;
        this.toggle(graphType, enable);
    }

    private toggle(graphType: GraphType, enable: boolean) {
        if (this.feature === 'property-key') {
            ExtendedGraphInstances.settings.additionalProperties[this.interactiveKey][graphType] = enable;
        }
        else {
            ExtendedGraphInstances.settings.enableFeatures[graphType][this.feature] = enable;
        }
        ExtendedGraphInstances.plugin.saveSettings();
    }
}