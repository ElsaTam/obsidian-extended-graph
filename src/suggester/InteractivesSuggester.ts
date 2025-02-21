import { AbstractInputSuggest } from "obsidian";
import { FOLDER_KEY, getFileInteractives, LINK_KEY, PluginInstances, SourceKey, TAG_KEY } from "src/internal";

export class InteractivesSuggester extends AbstractInputSuggest<HTMLElement> {
    key: SourceKey | undefined;
    propertyKey: string | undefined;
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, callback: (value: string) => void) {
        super(PluginInstances.app, textInputEl);
        this.callback = callback;
    }

    protected getSuggestions(query: string): HTMLElement[] {
        if (!this.key) return [];
        const files = PluginInstances.app.vault.getMarkdownFiles();
        let values: string[] = [];

        switch (this.key) {
            case 'tag':
                for (const file of files) {
                    values = values.concat([...getFileInteractives(TAG_KEY, file)]);
                }
                break;
            case 'property':
                if (!this.propertyKey) return [];
                for (const file of files) {
                    values = values.concat([...getFileInteractives(this.propertyKey, file)]);
                }
                break;
            case 'link':
                for (const file of files) {
                    values = values.concat([...getFileInteractives(LINK_KEY, file)]);
                }
                break;
            case 'folder':
            case 'folderRec':
                for (const file of files) {
                    values = values.concat([...getFileInteractives(FOLDER_KEY, file)]);
                }
                break;
            case 'file':
                values = files.map(file => file.basename);
                break;
            case 'path':
                values = files.map(file => file.path);
                break;
            default:
                break;
        }

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

    setKey(key?: SourceKey, propertyKey?: string): void {
        this.key = key;
        this.propertyKey = propertyKey;
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