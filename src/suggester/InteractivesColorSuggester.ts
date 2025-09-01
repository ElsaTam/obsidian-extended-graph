import { ExtendedGraphInstances } from "../pluginInstances";
import { InteractivesSuggester } from "./InteractivesSuggester";

export class InteractivesColorSuggester extends InteractivesSuggester {
    typeToInclude?: string;

    override renderSuggestion(value: HTMLElement, el: HTMLElement): void {
        super.renderSuggestion(value, el);

        const type = el.textContent ?? "";

        let alreadyExistingValues: string[] = [];
        if (this.key && this.key !== 'property') {
            alreadyExistingValues = ExtendedGraphInstances.settings.interactiveSettings[this.key].colors.map(c => c.type);
        }
        else if (this.key === 'property' && this.propertyKey) {
            alreadyExistingValues = ExtendedGraphInstances.settings.interactiveSettings[this.propertyKey].colors.map(c => c.type);
        }

        if (type !== this.typeToInclude && alreadyExistingValues.contains(type)) {
            el.addClass("extended-graph-duplicate");
        }
    }
}