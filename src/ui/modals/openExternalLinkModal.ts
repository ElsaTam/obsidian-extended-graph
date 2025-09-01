import { ButtonComponent, Modal, TFile } from "obsidian";
import { t } from "../../internal";
import { ExtendedGraphInstances } from "../../pluginInstances";

export class OpenExternalLinkModal extends Modal {
    items: { display: string, file: TFile }[] = [];

    constructor(files: TFile[], callback: (file: TFile | null) => any) {
        super(ExtendedGraphInstances.app);

        this.setTitle(t("features.externalLinkOpen"));
        this.modalEl.addClass("graph-modal-open-external-link");

        const basenames: Record<string, number> = {};
        files.forEach(file => basenames[file.basename] = basenames[file.basename] ? basenames[file.basename] + 1 : 1);

        this.items = files.map(file => {
            return {
                file: file,
                display: basenames[file.basename] > 1 ? file.path : file.basename
            }
        });

        for (const item of this.items) {
            const button = new ButtonComponent(this.contentEl);
            button.setButtonText(item.display);
            button.onClick(() => {
                callback(item.file);
            });
        }

        const button = new ButtonComponent(this.contentEl);
        button.setButtonText("Open on web");
        button.setCta();
        button.onClick(() => {
            callback(null);
        });
    }
}