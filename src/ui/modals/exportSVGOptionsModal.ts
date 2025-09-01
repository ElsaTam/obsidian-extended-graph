import { Modal, Setting } from "obsidian";
import { GraphInstances, ExtendedGraphInstances, t } from "../../internal";

export class ExportSVGOptionModal extends Modal {
    instances?: GraphInstances;
    isCanceled: boolean = true;

    constructor(instances?: GraphInstances) {
        super(ExtendedGraphInstances.app);
        this.instances = instances;

        this.setTitle(t("features.svgScreenshotOptions"));
    }

    onOpen() {
        this.addCoreOptions();
        this.addExtendedOptions();
        this.addApply();
    }

    // ============================= CORE OPTIONS ==============================

    private addCoreOptions() {
        this.addOnlyVisibleArea();
        this.addShowNodeNames();
    }

    private addOnlyVisibleArea() {
        new Setting(this.contentEl)
            .setName(t("features.svgScreenshotVisibleArea"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.exportSVGOptions.onlyVisibleArea);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.exportSVGOptions.onlyVisibleArea = value;
                    this.saveSettings();
                })
            });
    }

    private addShowNodeNames() {
        new Setting(this.contentEl)
            .setName(t("features.svgScreenshotNodeNames"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.exportSVGOptions.showNodeNames);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.exportSVGOptions.showNodeNames = value;
                    this.saveSettings();
                })
            });
    }

    // =========================== EXTENDED OPTIONS ============================

    private addExtendedOptions() {
        if (!this.instances) return;

        this.addUseCurvedLinks();
        this.addUseModifiedArrows();
        this.addUseNodeShapes();
        this.addShowArcs();
        this.addShowFolders();
        this.addShowModifiedNames();
        this.addShowIcons();
    }

    private addUseCurvedLinks() {
        const canUseCurvedLinks = this.canUseCurvedLinks();
        ExtendedGraphInstances.settings.exportSVGOptions.useCurvedLinks = canUseCurvedLinks;
        if (!canUseCurvedLinks) return;

        new Setting(this.contentEl)
            .setName(t("features.svgScreenshotCurvedLinks"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.exportSVGOptions.useCurvedLinks);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.exportSVGOptions.useCurvedLinks = value;
                    this.saveSettings();
                })
            });
    }

    private canUseCurvedLinks() {
        if (!this.instances || !this.instances) return false;
        return this.instances.settings.enableFeatures[this.instances.type]['links'] && this.instances.settings.curvedLinks;
    }

    private addUseModifiedArrows() {
        const canUseModifiedArrows = this.canUseModifiedArrows();
        ExtendedGraphInstances.settings.exportSVGOptions.useModifiedArrows = canUseModifiedArrows;
        if (!canUseModifiedArrows) return;

        new Setting(this.contentEl)
            .setName("Show modified arrows")
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.exportSVGOptions.useModifiedArrows);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.exportSVGOptions.useModifiedArrows = value;
                    this.saveSettings();
                })
            });
    }

    private canUseModifiedArrows(): boolean {
        if (!this.instances || !this.instances) return false;
        return this.instances.settings.enableFeatures[this.instances.type]['arrows'];
    }

    private addUseNodeShapes() {
        const canUseNodeShapes = this.canUseNodeShapes();
        ExtendedGraphInstances.settings.exportSVGOptions.useNodesShapes = canUseNodeShapes;
        if (!canUseNodeShapes) return;

        new Setting(this.contentEl)
            .setName(t("features.svgScreenshotNodeShapes"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.exportSVGOptions.useNodesShapes);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.exportSVGOptions.useNodesShapes = value;
                    this.saveSettings();
                })
            });
    }

    private canUseNodeShapes(): boolean {
        if (!this.instances || !this.instances) return false;
        return this.instances.settings.enableFeatures[this.instances.type]['shapes'] ?? false
    }

    private addShowArcs() {
        const canShowArcs = this.canShowArcs();
        ExtendedGraphInstances.settings.exportSVGOptions.showArcs = canShowArcs;
        if (!canShowArcs) return;

        new Setting(this.contentEl)
            .setName(t("features.svgScreenshotArcs"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.exportSVGOptions.showArcs);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.exportSVGOptions.showArcs = value;
                    this.saveSettings();
                })
            });
    }

    private canShowArcs(): boolean {
        if (!this.instances || !this.instances) return false;
        const graphType = this.instances.type;
        if (this.instances.settings.enableFeatures[graphType]['tags']) return true;
        if (!this.instances.settings.enableFeatures[graphType]['properties']) return false;
        return Object.values(this.instances.settings.additionalProperties).some(b => b[graphType]);
    }

    private addShowFolders() {
        const canShowFolders = this.canShowFolders();
        ExtendedGraphInstances.settings.exportSVGOptions.showFolders = canShowFolders;
        if (!canShowFolders) return;

        new Setting(this.contentEl)
            .setName("Show folder boxes")
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.exportSVGOptions.showFolders);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.exportSVGOptions.showFolders = value;
                    this.saveSettings();
                })
            });
    }

    private canShowFolders(): boolean {
        if (!this.instances || !this.instances) return false;
        return this.instances.settings.enableFeatures[this.instances.type]['folders'];
    }

    private addShowModifiedNames() {
        const canShowModifiedNames = this.canShowModifiedNames();
        ExtendedGraphInstances.settings.exportSVGOptions.useModifiedNames = canShowModifiedNames;
        if (!canShowModifiedNames) return;

        new Setting(this.contentEl)
            .setName("Show modified names")
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.exportSVGOptions.useModifiedNames);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.exportSVGOptions.useModifiedNames = value;
                    this.saveSettings();
                })
            });
    }

    private canShowModifiedNames(): boolean {
        if (!this.instances || !this.instances) return false;
        return this.instances.settings.enableFeatures[this.instances.type]['names'];
    }

    private addShowIcons() {
        const canShowIcons = this.canShowIcons();
        ExtendedGraphInstances.settings.exportSVGOptions.showIcons = canShowIcons;
        if (!canShowIcons) return;

        new Setting(this.contentEl)
            .setName("Show icons")
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.exportSVGOptions.showIcons);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.exportSVGOptions.showIcons = value;
                    this.saveSettings();
                })
            });
    }

    private canShowIcons(): boolean {
        if (!this.instances || !this.instances) return false;
        return this.instances.settings.enableFeatures[this.instances.type]['icons'];
    }

    // ============================ APPLY AND CLOSE ============================

    private addApply() {
        const setting = new Setting(this.contentEl)
            .addButton(cb => {
                cb.setButtonText(t("features.svgScreenshotCopyCode"));
                cb.onClick(() => {
                    this.isCanceled = false;
                    ExtendedGraphInstances.settings.exportSVGOptions.asImage = false;
                    this.applyAndClose();
                })
            });

        if (ClipboardItem.supports("image/svg+xml")) {
            setting.addButton(cb => {
                cb.setButtonText(t("features.svgScreenshotCopyImage"));
                cb.setCta();
                cb.onClick(() => {
                    this.isCanceled = false;
                    ExtendedGraphInstances.settings.exportSVGOptions.asImage = true;
                    this.applyAndClose();
                })
            })
        }
    }

    private async saveSettings(): Promise<void> {
        if (this.instances) this.instances.settings.exportSVGOptions = ExtendedGraphInstances.settings.exportSVGOptions;
        await ExtendedGraphInstances.plugin.saveSettings();
    }

    private applyAndClose() {
        this.saveSettings().then(() => {
            this.close();
        })
    }
}

