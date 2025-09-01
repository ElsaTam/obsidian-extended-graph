import { TAbstractFile } from "obsidian";
import { AbstractFormattingSuggester, ExtendedGraphInstances } from "../internal";

export class FilesSuggester extends AbstractFormattingSuggester {
    callback: (value: string) => void;
    files: TAbstractFile[] = [];

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(textInputEl);
        this.callback = callback;
        this.files = ExtendedGraphInstances.app.vault.getAllLoadedFiles();
    }

    protected override getStringSuggestions(query: string): string[] {
        return this.files.reduce((acc: string[], file) => {
            if (new RegExp(query, "i").exec(file.path)) {
                acc.push(file.path);
            }
            return acc;
        }, []);
    }

    override selectSuggestion(value: HTMLElement, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(value.innerText);
        this.callback(value.innerText);
        this.close();
    }
}