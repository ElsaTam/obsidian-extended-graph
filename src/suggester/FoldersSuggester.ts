import { TFolder } from "obsidian";
import { AbstractFormattingSuggester, ExtendedGraphInstances } from "../internal";

export class FoldersSuggester extends AbstractFormattingSuggester {
    callback: (value: string) => void;
    folders: TFolder[] = [];

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(textInputEl);
        this.callback = callback;
        this.folders = ExtendedGraphInstances.app.vault.getAllFolders();
    }

    protected override getStringSuggestions(query: string): string[] {
        return this.folders.reduce((acc: string[], folder) => {
            if (new RegExp(query, "i").exec(folder.path)) {
                acc.push(folder.path);
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