import { Modal, SearchComponent, Setting } from "obsidian";
import { ExtendedGraphInstances, PropertiesUnusedSuggester, UIElements } from "../../internal";

export class AddPropertyInteractiveModal extends Modal {
    callback: (name: string) => boolean;
    input: SearchComponent;

    constructor(title: string, callback: (name: string) => boolean) {
        super(ExtendedGraphInstances.app);
        this.setTitle(title);
        this.modalEl.addClass("graph-modal-new");
        this.callback = callback;

        this.scope.register(null, "Enter", (e: KeyboardEvent) => {
            if (this.callback(this.input.getValue())) {
                this.close();
            }
        });
    }

    onOpen() {
        new Setting(this.contentEl)
            .addSearch((cb) => {
                this.input = cb;
                new PropertiesUnusedSuggester(cb.inputEl, (value) => { });
            })
            .addButton((cb) => {
                UIElements.setupButton(cb, 'add');
                cb.buttonEl.addEventListener('click', e => {
                    if (this.callback(this.input.getValue())) {
                        this.close();
                    }
                })
            });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}