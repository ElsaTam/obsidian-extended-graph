import { Notice, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import {
    ExportConfigModal,
    ImportConfigModal,
    ExtendedGraphInstances,
    SettingFocus,
    SettingFolders,
    SettingImages,
    SettingLinks,
    SettingElementsStats,
    SettingPerformance,
    SettingPropertiesArray,
    SettingShapes,
    SettingsSection,
    SettingTags,
    SettingZoom,
    SettingNames,
    SettingIcons,
    SettingArrows,
    ExtendedGraphSettings,
    SettingQuery,
    SettingAutomation,
    SettingDisplay,
    SettingBeta,
    SettingFilter,
    t,
    SettingInput as SettingInputs,
    SettingLayers,
    getDataviewPlugin,
    validateFilename,
    SettingLocal as SettingLocalGraph
} from "../internal";
import ExtendedGraphPlugin from "../main";

export class ExtendedGraphSettingTab extends PluginSettingTab {
    sections: SettingsSection[] = [];
    originalSettings: ExtendedGraphSettings;
    showResetModalToggle: ToggleComponent;

    settingsWithPalettes: { onCustomPaletteModified: (oldName: string, newName: string) => void }[] = [];

    constructor(plugin: ExtendedGraphPlugin) {
        super(ExtendedGraphInstances.app, plugin);

        // We need to store those ones localy in order to interact with them
        // when a custom color palette is created/edited/deleted
        const settingsTags = new SettingTags(this);
        const settingsProperties = new SettingPropertiesArray(this);
        const settingLinks = new SettingLinks(this);
        const settingFolders = new SettingFolders(this);
        const settingElementsStats = new SettingElementsStats(this);
        const settingLocalGraph = new SettingLocalGraph(this);
        this.settingsWithPalettes.push(
            settingsTags,
            settingsProperties,
            settingLinks,
            settingFolders,
            settingElementsStats,
            settingLocalGraph
        )

        this.sections.push(new SettingAutomation(this));
        this.sections.push(settingsTags);
        this.sections.push(settingsProperties);
        this.sections.push(settingLinks);
        this.sections.push(new SettingArrows(this));
        this.sections.push(settingFolders);
        this.sections.push(new SettingImages(this));
        this.sections.push(new SettingIcons(this));
        this.sections.push(new SettingFocus(this));
        this.sections.push(new SettingShapes(this));
        this.sections.push(new SettingLayers(this));
        this.sections.push(settingElementsStats);
        this.sections.push(new SettingNames(this));
        this.sections.push(new SettingZoom(this));
        this.sections.push(settingLocalGraph);
        this.sections.push(new SettingDisplay(this));
        this.sections.push(new SettingFilter(this));
        this.sections.push(new SettingInputs(this));
        this.sections.push(new SettingPerformance(this));
        this.sections.push(new SettingBeta(this));
    }

    override display(): void {
        this.originalSettings = structuredClone(ExtendedGraphInstances.settings);
        this.containerEl.empty();
        this.containerEl.addClass("extended-graph-settings");

        this.addImportExport();
        this.addNav();
        this.addDisableNodes();
        this.addCanonicalPropertiesWithDataview();

        // FEATURES
        for (const section of this.sections) {
            section.display();
        }
    }

    private addImportExport(): void {
        new Setting(this.containerEl)
            .addExtraButton(cb => {
                cb.extraSettingsEl.insertAdjacentText('beforebegin', t("controls.export"))
                cb.setIcon("upload");
                cb.setTooltip(t("controls.exportSettings"));
                cb.onClick(() => {
                    const modal = new ExportConfigModal((name: string, fullpath: boolean) => {
                        const filepath = fullpath ? name : ExtendedGraphInstances.configurationDirectory + "/" + name + ".json";
                        if (!fullpath) {
                            if (!validateFilename(name)) {
                                return false;
                            }
                        }
                        ExtendedGraphInstances.plugin.exportSettings(filepath, ExtendedGraphInstances.settings);
                        return true;
                    });
                    modal.open();
                });
            })
            .addExtraButton(cb => {
                cb.extraSettingsEl.insertAdjacentText('beforebegin', t("controls.import"))
                cb.setIcon("download");
                cb.setTooltip(t("controls.importSettings"));
                cb.onClick(() => {
                    const modal = new ImportConfigModal((filepath: string) => {
                        if (filepath.trim() === "") {
                            new Notice("Configuration name cannot be empty");
                            return;
                        }
                        ExtendedGraphInstances.plugin.importSettings(filepath).then(() => {
                            this.display();
                        });
                    });
                    modal.open();
                });
            });
    }

    private addNav(): void {
        const nav = this.containerEl.createDiv({ cls: "extended-graph-nav-settings" });

        const label = nav.createDiv({ cls: "nav-label" });
        label.innerText = t("controls.goTo");
    }

    private addDisableNodes() {
        new Setting(this.containerEl)
            .setName(t("features.disableNodes"))
            .setDesc(t("features.disableNodesDesc"))
            .addToggle(cb => {
                cb.setValue(!ExtendedGraphInstances.settings.fadeOnDisable);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.fadeOnDisable = !value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            });
    }

    private addCanonicalPropertiesWithDataview() {
        if (getDataviewPlugin(false)) {
            new Setting(this.containerEl)
                .setName(t("features.canonicalizePropertiesWithDataview"))
                .setDesc(t("features.canonicalizePropertiesWithDataviewDesc"))
                .addToggle(cb => {
                    cb.setValue(ExtendedGraphInstances.settings.canonicalizePropertiesWithDataview);
                    cb.onChange(value => {
                        ExtendedGraphInstances.settings.canonicalizePropertiesWithDataview = value;
                        ExtendedGraphInstances.plugin.saveSettings();
                    })
                });
        }
    }

    override hide(): void {
        if (ExtendedGraphInstances.graphsManager && ExtendedGraphInstances.settings.resetAfterChanges) {
            if (SettingQuery.needReload(this.originalSettings, ExtendedGraphInstances.settings, 'graph')) {
                ExtendedGraphInstances.graphsManager.resetAllPlugins('graph');
            }
            if (SettingQuery.needReload(this.originalSettings, ExtendedGraphInstances.settings, 'localgraph')) {
                ExtendedGraphInstances.graphsManager.resetAllPlugins('localgraph');
            }
        }
        super.hide();
    }

    onCustomPaletteModified(oldName: string, newName: string): void {
        for (const setting of this.settingsWithPalettes) {
            setting.onCustomPaletteModified(oldName, newName);
        }
        ExtendedGraphInstances.plugin.saveSettings();
    }
}