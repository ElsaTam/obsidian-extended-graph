import { ButtonComponent, ExtraButtonComponent, Modal, SearchComponent, Setting } from "obsidian";
import { FoldersSuggester, isRegex, ExtendedGraphInstances, t, UIElements } from "../../internal";

export class ExcludeFoldersModal extends Modal {
    initialFolders: string[];
    folders: string[];
    messageP: HTMLParagraphElement;
    filtersDiv: HTMLDivElement;

    constructor(folders: string[]) {
        super(ExtendedGraphInstances.app);
        this.initialFolders = folders;
        this.folders = structuredClone(folders);
        this.setTitle(t("features.excludedFolders"));
        this.modalEl.addClass("graph-modal-exclude-folders");
    }

    onOpen() {
        this.messageP = this.contentEl.createEl('p');
        this.filtersDiv = this.contentEl.createDiv();
        this.addNewFilterSetting();
        this.addButtonContainer();

        this.updateMessage();
        this.addFilters();
    }

    private updateMessage() {
        this.messageP.textContent = this.folders.length === 0 ? t("features.noExclusionFilter") : t("features.withExclusionFilter");
    }

    private addFilters() {
        this.filtersDiv.replaceChildren();
        for (const folder of this.folders) {
            this.addFilter(folder);
        }
    }

    private addFilter(filter: string) {
        this.filtersDiv.createDiv("mobile-option-setting-item", div => {
            div.createSpan({
                cls: "mobile-option-setting-item-name",
                text: filter
            }, span => {
                isRegex(filter) && span.createSpan({
                    text: "Regex",
                    cls: "flair mod-flat"
                });
            });

            const closeButton = new ExtraButtonComponent(div);
            closeButton.extraSettingsEl.addClass("mobile-option-setting-item-option-icon");
            closeButton.setIcon("lucide-x");
            closeButton.setTooltip(t("controls.delete"));
            closeButton.onClick(() => {
                (this.folders as string[]).remove(filter);
                this.addFilters();
                this.updateMessage();
            });
        });
    }

    private addNewFilterSetting() {
        new Setting(this.contentEl)
            .then(setting => {
                setting.setDesc(t("plugin.filter"))
                    .addSearch(search => {
                        search.setPlaceholder(t("controls.pathRegexPlaceholder"));
                        new FoldersSuggester(search.inputEl, (value: string) => {
                            this.add(search);
                        });
                        setting.addButton(addButton => {
                            UIElements.setupButton(addButton, 'add');
                            addButton.onClick(() => {
                                this.add(search);
                            });
                        })
                    })
            })
    }

    private add(search: SearchComponent) {
        if (search.getValue() === "") return;

        this.folders.push(search.getValue());
        this.addFilter(search.getValue());
        this.updateMessage();
        search.setValue("");
    }

    private addButtonContainer() {
        this.contentEl.createDiv("modal-button-container", container => {
            new ButtonComponent(container)
                .setCta()
                .setButtonText(t("controls.save"))
                .onClick(async () => {
                    this.initialFolders.length = 0;
                    for (const folder of this.folders) {
                        this.initialFolders.push(folder);
                    }
                    await ExtendedGraphInstances.plugin.saveSettings();
                    this.close();
                });
            new ButtonComponent(container)
                .setClass("mod-cancel")
                .setButtonText(t("controls.cancel"))
                .onClick(() => {
                    this.close();
                });
        });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}