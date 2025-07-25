import { AbstractFormattingSuggester, ExtendedGraphSettings, FOLDER_KEY, getFileInteractives, getOutlinkTypes, PluginInstances, SettingLinks, SettingProperty, SettingTags, SourceKey, TAG_KEY } from "src/internal";

export class InteractivesSuggester extends AbstractFormattingSuggester {
    key: SourceKey | undefined;
    propertyKey: string | undefined;
    settings: ExtendedGraphSettings;
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, settings: ExtendedGraphSettings, callback: (value: string) => void) {
        super(textInputEl);
        this.settings = settings;
        this.callback = callback;
    }

    protected override getStringSuggestions(query: string): string[] {
        if (!this.key) return [];
        let values: string[] = [];

        switch (this.key) {
            case 'tag':
                values = SettingTags.getAllTypes();
                break;
            case 'property':
                if (!this.propertyKey) return [];
                const properties = SettingProperty.getAllTypes(this.propertyKey);
                if (properties) {
                    values = properties;
                }
                else {
                    const files = PluginInstances.app.vault.getMarkdownFiles();
                    for (const file of files) {
                        values = values.concat([...getFileInteractives(this.propertyKey, file, this.settings)]);
                    }
                }
                break;
            case 'link':
                values = SettingLinks.getAllTypes();
                break;
            case 'folder':
            case 'folderRec':
                values = PluginInstances.app.vault.getAllFolders().map(folder => folder.path);
                break;
            case 'file':
                values = PluginInstances.app.vault.getFiles().map(file => file.basename);
                break;
            case 'path':
                values = PluginInstances.app.vault.getFiles().map(file => file.path);
                break;
            default:
                break;
        }

        let filteredValues = values.filter(value => new RegExp(query, "i").exec(value));
        return [...new Set(filteredValues)];
    }

    setKey(key?: SourceKey, propertyKey?: string): void {
        this.key = key;
        this.propertyKey = propertyKey;
    }

    override selectSuggestion(value: HTMLElement, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(value.innerText);
        this.callback(value.innerText);
        this.close();
    }
}