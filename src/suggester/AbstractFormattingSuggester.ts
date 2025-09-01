import { AbstractInputSuggest, getLanguage } from "obsidian";
import { ExtendedGraphInstances, strCompare } from "../internal";

export abstract class AbstractFormattingSuggester extends AbstractInputSuggest<HTMLElement> {
    constructor(textInputEl: HTMLInputElement | HTMLDivElement) {
        super(ExtendedGraphInstances.app, textInputEl);
    }

    protected override getSuggestions(query: string): HTMLElement[] {
        return this.getStringSuggestions(query).sort((a, b) => strCompare(a, b)).map(value => {
            const match = new RegExp(query, "i").exec(value);
            const el = createDiv();
            if (match && match[0].length > 0) {
                if (match.index > 0) {
                    el.appendText(value.substring(0, match.index));
                }
                el.createEl("strong", { cls: "suggestion-highlight" }, strong => strong.setText(match[0]));
                if (match.index + match[0].length < value.length) {
                    el.appendText(value.substring(match.index + match[0].length));
                }
            }
            else {
                el.setText(value);
            }
            return el;
        });
    }

    protected abstract getStringSuggestions(query: string): string[];

    override renderSuggestion(value: HTMLElement, el: HTMLElement): void {
        for (const suggestionNode of Array.from(value.childNodes)) {
            el.appendChild(suggestionNode.cloneNode(true));
        }
    }
}