import { ButtonComponent, Setting } from "obsidian";
import { getAPI as getDataviewAPI } from "obsidian-dataview";
import {
    canonicalizeVarName,
    ExcludeFoldersModal,
    ExtendedGraphSettingTab,
    INVALID_KEYS,
    isPropertyKeyValid,
    LINK_KEY,
    PluginInstances,
    SettingInteractives,
    t
} from "src/internal";


export class SettingLinks extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'links', LINK_KEY, t("features.interactives.links"), 'link', t("features.interactives.linksDesc"), false);
    }

    protected override addBody(): void {
        super.addBody();

        this.addExcludeFolders();
        this.addDisableSources();
        this.addDisableTargets();
        this.addShowOnGraph();
        this.addMultipleTypes();
        this.addCurvedLinks();
        this.addOutlineLinks();
    }

    private addExcludeFolders() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.excludeSourceFolders"))
            .setDesc(t("features.excludeSourceFoldersDesc"))
            .addButton(cb => {
                this.setManageNumber(cb, PluginInstances.settings.excludedSourcesFolder.length);
                cb.onClick(() => {
                    const modal = new ExcludeFoldersModal(PluginInstances.settings.excludedSourcesFolder);
                    modal.open();
                    modal.onClose = () => this.setManageNumber(cb, PluginInstances.settings.excludedSourcesFolder.length);
                });
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.excludeTargetFolders"))
            .setDesc(t("features.excludeTargetFoldersDesc"))
            .addButton(cb => {
                this.setManageNumber(cb, PluginInstances.settings.excludedTargetsFolder.length);
                cb.onClick(() => {
                    const modal = new ExcludeFoldersModal(PluginInstances.settings.excludedTargetsFolder);
                    modal.open();
                    modal.onClose = () => this.setManageNumber(cb, PluginInstances.settings.excludedTargetsFolder.length);
                });
            }).settingEl);
    }

    private setManageNumber(cb: ButtonComponent, n: number): void {
        cb.setButtonText(`${t("controls.manage")} (${n})`);
    }

    private addMultipleTypes() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.linksAllowMultipleTypes"))
            .setDesc(t("features.linksAllowMultipleTypesDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.allowMultipleLinkTypes);
                cb.onChange(value => {
                    PluginInstances.settings.allowMultipleLinkTypes = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addDisableSources() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.removeSources"))
            .setDesc(t("features.removeSourcesDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.disableSource);
                cb.onChange(value => {
                    PluginInstances.settings.disableSource = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addDisableTargets() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.removeTargets"))
            .setDesc(t("features.removeTargetsDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.disableTarget);
                cb.onChange(value => {
                    PluginInstances.settings.disableTarget = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addShowOnGraph() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.colorLinks"))
            .setDesc(t("features.interactives.colorLinksDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph);
                cb.onChange(value => {
                    PluginInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.displayLinkTypeLabel"))
            .setDesc(t("features.interactives.displayLinkTypeLabelDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.displayLinkTypeLabel);
                cb.onChange(value => {
                    PluginInstances.settings.displayLinkTypeLabel = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.colorLinkTypeLabel"))
            .setDesc(t("features.interactives.colorLinkTypeLabelDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.colorLinkTypeLabel);
                cb.onChange(value => {
                    PluginInstances.settings.colorLinkTypeLabel = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addCurvedLinks() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.curvedLinks"))
            .setDesc(t("features.interactives.curvedLinksDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.curvedLinks);
                cb.onChange(value => {
                    PluginInstances.settings.curvedLinks = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.curvedFactor"))
            .setDesc(t("features.interactives.curvedFactorDesc"))
            .addSlider(cb => {
                const preview = document.createTextNode(PluginInstances.settings.curvedFactor.toString());
                if (preview) {
                    cb.sliderEl.parentElement?.insertBefore(preview, cb.sliderEl);
                }
                cb.setLimits(-2, 2, 0.2)
                    .setValue(PluginInstances.settings.curvedFactor)
                    .onChange(value => {
                        PluginInstances.settings.curvedFactor = value;
                        PluginInstances.plugin.saveSettings();
                        if (preview) preview.textContent = PluginInstances.settings.curvedFactor.toString();
                    })
            }).settingEl);
    }

    private addOutlineLinks() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.linksOutline"))
            .setDesc(t("features.linksOutlineDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.outlineLinks);
                cb.onChange(value => {
                    PluginInstances.settings.outlineLinks = value;
                    PluginInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    protected override isValueValid(name: string): boolean {
        return isPropertyKeyValid(name);
    }

    protected override getPlaceholder(): string {
        return "property-key";
    }

    protected override getAllTypes(): string[] {
        return SettingLinks.getAllTypes();
    }

    static getAllTypes() {
        let allTypes = new Set<string>();

        const dv = getDataviewAPI(PluginInstances.app);
        if (dv) {
            for (const page of dv.pages()) {
                for (const [key, value] of Object.entries(page)) {
                    if (key === "file" || PluginInstances.settings.imageProperties.contains(key) || INVALID_KEYS[LINK_KEY].includes(key)) continue;
                    if (value === null || value === undefined || value === '') continue;

                    // Check if the key is a canonicalized version of another key
                    if (!PluginInstances.settings.canonicalizePropertiesWithDataview && key === canonicalizeVarName(key) && Object.keys(page).some(k => canonicalizeVarName(k) === canonicalizeVarName(key) && k !== key)) {
                        continue;
                    }

                    if ((typeof value === "object") && ("path" in value)) {
                        allTypes.add(PluginInstances.settings.canonicalizePropertiesWithDataview ? canonicalizeVarName(key) : key);
                    }

                    if (Array.isArray(value)) {
                        for (const link of value) {
                            if (link && (typeof link === "object") && ("path" in link)) {
                                allTypes.add(PluginInstances.settings.canonicalizePropertiesWithDataview ? canonicalizeVarName(key) : key);
                            }
                        }
                    }
                }
            }

        }
        else {
            for (const file of PluginInstances.app.vault.getFiles()) {
                const frontmatterLinks = PluginInstances.app.metadataCache.getCache(file.path)?.frontmatterLinks;
                if (!frontmatterLinks) continue;
                const types = frontmatterLinks.map(l => l.key.split('.')[0]).filter(k => !PluginInstances.settings.imageProperties.contains(k) && !INVALID_KEYS[LINK_KEY].includes(k));
                allTypes = new Set<string>([...allTypes, ...types]);
            }
        }
        return [...allTypes].sort();
    }
}