import { ButtonComponent, ExtraButtonComponent, Modal, SearchComponent, TextComponent } from "obsidian";
import { isPropertyKeyValid, ExtendedGraphInstances, PropertiesSuggester, t, UIElements } from "../../internal";

export class SettingMultiPropertiesModal extends Modal {
    inputs: TextComponent[] = [];
    propertiesDiv: HTMLDivElement;
    properties: string[];
    addText: string;

    constructor(title: string, addText: string, properties: string[]) {
        super(ExtendedGraphInstances.app);
        this.properties = properties;
        this.addText = addText;
        this.setTitle(title);
        this.modalEl.addClass("graph-modal-setting-properties");
    }

    onOpen() {
        this.addAddButton();
        this.loadProperties();
    }

    private addAddButton() {
        this.contentEl.createSpan().textContent = this.addText;

        const addButton = new ButtonComponent(this.contentEl)
            .onClick(() => {
                this.addProperty("");
            })
        UIElements.setupButton(addButton, 'add');
    }

    private loadProperties() {
        this.propertiesDiv = this.contentEl.createDiv("properties-list");
        for (const property of this.properties) {
            this.addProperty(property);
        }
    }

    private addProperty(property: string) {
        const inputDiv = this.propertiesDiv.createDiv("property-value");
        let oldKey = property;

        const input = new SearchComponent(inputDiv)
            .setValue(property)
            .onChange(key => {
                if (this.renameProperty(oldKey, key)) {
                    oldKey = key;
                }
            });
        new PropertiesSuggester(input.inputEl, (key) => {
            if (this.renameProperty(oldKey, key)) {
                oldKey = key;
            }
        });
        this.inputs.push(input);

        const deleteButton = new ExtraButtonComponent(inputDiv)
            .onClick(() => {
                this.deleteProperty(inputDiv, input);
            });
        UIElements.setupExtraButton(deleteButton, 'delete');
    }

    private deleteProperty(inputDiv: HTMLElement, input: SearchComponent) {
        this.inputs.remove(input);
        this.properties.remove(input.getValue());
        inputDiv.remove();
        ExtendedGraphInstances.plugin.saveSettings();
    }

    private renameProperty(oldKey: string, newKey: string): boolean {
        if (isPropertyKeyValid(newKey) && !this.properties.contains(newKey) && newKey !== oldKey) {
            this.properties.remove(oldKey);
            this.properties.push(newKey);
            ExtendedGraphInstances.plugin.saveSettings();
            return true;
        }
        return false;
    }

    onClose(): void {
        this.contentEl.empty();
    }
}