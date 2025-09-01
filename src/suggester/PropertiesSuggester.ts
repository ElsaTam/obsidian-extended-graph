import { AbstractFormattingSuggester, getAllVaultProperties, ExtendedGraphInstances } from "../internal";

export class PropertiesSuggester extends AbstractFormattingSuggester {
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(textInputEl);
        this.callback = callback;
    }

    protected getStringSuggestions(query: string): string[] {
        const values = getAllVaultProperties(ExtendedGraphInstances.settings);
        const filteredValues = values.filter(value => new RegExp(query, "i").exec(value));
        return [...new Set(filteredValues)];
    }

    override selectSuggestion(value: HTMLElement, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(value.innerText);
        this.callback(value.innerText);
        this.close();
    }
}