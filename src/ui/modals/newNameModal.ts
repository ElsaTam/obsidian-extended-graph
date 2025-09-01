import { Modal, Setting, TextComponent } from "obsidian";
import { ExtendedGraphInstances, UIElements } from "../../internal";

export class NewNameModal extends Modal {
    callback: (name: string) => boolean;
    input: TextComponent;
    name?: string;

    constructor(title: string, callback: (name: string) => boolean, name?: string) {
        super(ExtendedGraphInstances.app);
        this.setTitle(title);
        this.modalEl.addClass("graph-modal-new");
        this.callback = callback;
        this.name = name;

        this.scope.register(null, "Enter", (e: KeyboardEvent) => {
            if (this.callback(this.input.getValue())) {
                this.close();
            }
        });
    }

    onOpen() {
        new Setting(this.contentEl)
            .addText((text) => {
                this.input = text;
                if (this.name) {
                    this.input.setValue(this.name);
                }
            })
            .addButton((cb) => {
                UIElements.setupButton(cb, this.name ? 'edit' : 'add');
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