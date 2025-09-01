import { DropdownComponent, Modal, Setting } from "obsidian";
import { getAllConfigFiles, ExtendedGraphInstances, t, pathParse } from "../../internal";

export class ImportConfigModal extends Modal {
    callback: (filepath: string) => void;
    dropdown: DropdownComponent;

    constructor(callback: (filepath: string) => void) {
        super(ExtendedGraphInstances.app);
        this.setTitle(t("controls.selectConfigToImport"));
        this.modalEl.addClass("graph-modal-import-config");
        this.callback = callback;
    }

    onOpen() {
        new Setting(this.contentEl)
            .addDropdown(async (cb) => {
                this.dropdown = cb;
                cb.addOption("", "");
                const files = await getAllConfigFiles();
                cb.addOptions(Object.fromEntries(files.map(file => [
                    file,
                    pathParse(file, ".json").basename + (ExtendedGraphInstances.statesManager.getStateFromConfig(file) ? " (🔗 state)" : "")
                ])));
            })
            .addButton((cb) => {
                cb.setIcon("download");
                cb.setCta();
                cb.buttonEl.addEventListener('click', e => {
                    const value = this.dropdown.getValue();
                    if (value !== "") {
                        this.callback(value);
                    }
                    this.close();
                });
            });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}