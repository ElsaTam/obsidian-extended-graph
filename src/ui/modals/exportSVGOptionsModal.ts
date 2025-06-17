import { Modal, Setting } from "obsidian";
import { GraphInstances, PluginInstances } from "src/internal";
import STRINGS from "src/Strings";

export class ExportSVGOptionModal extends Modal {
    instances?: GraphInstances;
    isCanceled: boolean = true;

    constructor(instances?: GraphInstances) {
        super(PluginInstances.app);
        this.instances = instances;

        this.setTitle(STRINGS.features.svgScreenshotOptions);
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
            .setName(STRINGS.features.svgScreenshotVisibleArea)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.onlyVisibleArea);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.onlyVisibleArea = value;
                    this.saveSettings();
                })
            });
    }

    private addShowNodeNames() {
        new Setting(this.contentEl)
            .setName(STRINGS.features.svgScreenshotNodeNames)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.showNodeNames);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.showNodeNames = value;
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
        PluginInstances.settings.exportSVGOptions.useCurvedLinks = canUseCurvedLinks;
        if (!canUseCurvedLinks) return;

        new Setting(this.contentEl)
            .setName(STRINGS.features.svgScreenshotCurvedLinks)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.useCurvedLinks);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.useCurvedLinks = value;
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
        PluginInstances.settings.exportSVGOptions.useModifiedArrows = canUseModifiedArrows;
        if (!canUseModifiedArrows) return;

        new Setting(this.contentEl)
            .setName("Show modified arrows")
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.useModifiedArrows);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.useModifiedArrows = value;
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
        PluginInstances.settings.exportSVGOptions.useNodesShapes = canUseNodeShapes;
        if (!canUseNodeShapes) return;

        new Setting(this.contentEl)
            .setName(STRINGS.features.svgScreenshotNodeShapes)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.useNodesShapes);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.useNodesShapes = value;
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
        PluginInstances.settings.exportSVGOptions.showArcs = canShowArcs;
        if (!canShowArcs) return;

        new Setting(this.contentEl)
            .setName(STRINGS.features.svgScreenshotArcs)
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.showArcs);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.showArcs = value;
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
        PluginInstances.settings.exportSVGOptions.showFolders = canShowFolders;
        if (!canShowFolders) return;

        new Setting(this.contentEl)
            .setName("Show folder boxes")
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.showFolders);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.showFolders = value;
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
        PluginInstances.settings.exportSVGOptions.useModifiedNames = canShowModifiedNames;
        if (!canShowModifiedNames) return;

        new Setting(this.contentEl)
            .setName("Show modified names")
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.useModifiedNames);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.useModifiedNames = value;
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
        PluginInstances.settings.exportSVGOptions.showIcons = canShowIcons;
        if (!canShowIcons) return;

        new Setting(this.contentEl)
            .setName("Show icons")
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.exportSVGOptions.showIcons);
                cb.onChange(value => {
                    PluginInstances.settings.exportSVGOptions.showIcons = value;
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
                cb.setButtonText(STRINGS.features.svgScreenshotCopyCode);
                cb.onClick(() => {
                    this.isCanceled = false;
                    PluginInstances.settings.exportSVGOptions.asImage = false;
                    this.applyAndClose();
                })
            });

        if (ClipboardItem.supports("image/svg+xml")) {
            setting.addButton(cb => {
                cb.setButtonText(STRINGS.features.svgScreenshotCopyImage);
                cb.setCta();
                cb.onClick(() => {
                    this.isCanceled = false;
                    PluginInstances.settings.exportSVGOptions.asImage = true;
                    this.applyAndClose();
                })
            })
        }
    }

    private async saveSettings(): Promise<void> {
        if (this.instances) this.instances.settings.exportSVGOptions = PluginInstances.settings.exportSVGOptions;
        await PluginInstances.plugin.saveSettings();
    }

    private applyAndClose() {
        this.saveSettings().then(() => {
            this.close();
        })
    }
}

