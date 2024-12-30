import { App, Modal, setIcon, Setting, TextComponent } from "obsidian";

export class NewNameModal extends Modal {
    callback: (name: string) => boolean;
    input: TextComponent;

    constructor(app: App, title: string, callback: (name: string) => boolean) {
        super(app);
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
            .addText((text) => { this.input = text; })
            .addButton((btn) => {
                setIcon(btn.buttonEl, "plus");
                btn.buttonEl.addEventListener('click', e => {
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