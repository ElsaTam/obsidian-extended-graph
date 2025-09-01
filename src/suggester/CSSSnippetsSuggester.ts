import { AbstractFormattingSuggester } from "../internal";
import { ExtendedGraphInstances } from "../pluginInstances";

export class CSSSnippetsSuggester extends AbstractFormattingSuggester {
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(textInputEl);
        this.callback = callback;
    }

    protected getStringSuggestions(query: string): string[] {
        const values = [...ExtendedGraphInstances.app.customCss.enabledSnippets];

        let filteredValues = values.filter(value => new RegExp(query, "i").exec(value));
        return [...new Set(filteredValues)];
    }

    override selectSuggestion(value: HTMLElement, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(value.innerText);
        this.callback(value.innerText);
        this.close();
    }
}