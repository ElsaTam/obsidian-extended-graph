import { AbstractInputSuggest } from "obsidian";
import { PluginInstances } from "src/pluginInstances";

export class PropertiesSuggester extends AbstractInputSuggest<HTMLElement> {
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(PluginInstances.app, textInputEl);
        this.callback = callback;
    }

    protected getSuggestions(query: string): HTMLElement[] {
        const values = Object.keys(PluginInstances.app.metadataTypeManager.properties);

        let filteredValues = values.filter(value => value.contains(query));
        let sortedValues = new Set(filteredValues.sort());
        return [...sortedValues].map(value => {
            const split = value.split(query);
            const el = createDiv();
            if (query === "") {
                el.setText(value);
                return el;
            }
            for (let i = 0; i < split.length - 1; ++i) {
                el.appendText(split[i]);
                const strong = createEl("strong");
                strong.setText(query);
                el.appendChild(strong);
            }
            el.appendText(split.last() ?? '');
            return el;
        });
    }

    renderSuggestion(value: HTMLElement, el: HTMLElement): void {
        value.childNodes.forEach((childNode) => {
            el.appendChild(childNode.cloneNode(true));
        });
    }

    selectSuggestion(value: HTMLElement, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(value.innerText);
        this.callback(value.innerText);
        this.close();
    }
}