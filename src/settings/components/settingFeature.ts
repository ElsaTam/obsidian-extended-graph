import { Setting } from "obsidian";
import { Feature, graphTypeLabels, ExtendedGraphInstances } from "../../internal";

export class FeatureSetting extends Setting {
    constructor(containerEl: HTMLElement, name: string, desc: string, feature: Feature) {
        super(containerEl);
        if (name !== "") this.setName(name);
        if (desc !== "") this.setDesc(desc);

        this.addToggle(cb => {
            cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['graph']);
            cb.setValue(ExtendedGraphInstances.settings.enableFeatures['graph'][feature]);
            cb.onChange(value => {
                ExtendedGraphInstances.settings.enableFeatures['graph'][feature] = value;
                ExtendedGraphInstances.plugin.saveSettings();
            })
        })
            .addToggle(cb => {
                cb.toggleEl.insertAdjacentText('beforebegin', graphTypeLabels['localgraph']);
                cb.setValue(ExtendedGraphInstances.settings.enableFeatures['localgraph'][feature]);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.enableFeatures['localgraph'][feature] = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            })
    }
}