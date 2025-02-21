import { ToggleComponent } from "obsidian";
import { ExtendedGraphSettingTab, Feature, GraphType, graphTypeLabels, PluginInstances, SettingsSection } from "src/internal";


export abstract class SettingsSectionCollapsible extends SettingsSection {
    feature: Feature;
    interactiveKey: string;
    itemClasses: string[] = [];
    toggles: Partial<Record<GraphType, HTMLDivElement>> = {};
    
    constructor(settingTab: ExtendedGraphSettingTab, feature: Feature, key: string, title: string, icon: string, description: string) {
        super(settingTab, title, icon, description);

        this.feature = feature;
        this.interactiveKey = key;
        this.itemClasses.push(`setting-${this.feature}`);
        if (key !== '') this.itemClasses.push(`setting-${this.feature}-${key}`);
    }

    override display() {
        super.display();

        this.settingHeader.settingEl.addClasses(this.itemClasses);
        this.elementsBody.forEach(el => {
            el.addClasses(this.itemClasses);
        });
    }

    protected override addHeader(): void {
        super.addHeader();
        this.addToggle('graph');
        this.addToggle('localgraph');
    }

    protected addToggle(graphType: GraphType) {
        let enable = PluginInstances.settings.enableFeatures[graphType][this.feature];
        if (this.feature === 'property-key') {
            enable = PluginInstances.settings.additionalProperties[this.interactiveKey];
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
            PluginInstances.settings.additionalProperties[this.interactiveKey] = enable;
        }
        else {
            PluginInstances.settings.enableFeatures[graphType][this.feature] = enable;
        }
        PluginInstances.plugin.saveSettings();

        if ((PluginInstances.settings.enableFeatures['graph'][this.feature]
            || PluginInstances.settings.enableFeatures['localgraph'][this.feature])
            || (this.feature === 'property-key' && enable)) {
            this.settingHeader.settingEl.removeClass('is-collapsed');
        }
        else {
            this.settingHeader.settingEl.addClass('is-collapsed');
        }
    }
}