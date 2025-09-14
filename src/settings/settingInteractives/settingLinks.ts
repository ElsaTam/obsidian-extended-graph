import { ButtonComponent, Setting } from "obsidian";
import {
    canonicalizeVarName,
    ExcludeFoldersModal,
    ExtendedGraphSettingTab,
    getDataviewPlugin,
    INVALID_KEYS,
    isPropertyKeyValid,
    LINK_KEY,
    ExtendedGraphInstances,
    SettingInteractives,
    t
} from "../../internal";


export class SettingLinks extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'links', LINK_KEY, t("features.ids.linkTypes"), t("features.interactives.linkTypes"), 'link', t("features.interactives.linkTypesDesc"), false);
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
                this.setManageNumber(cb, ExtendedGraphInstances.settings.excludedSourcesFolder.length);
                cb.onClick(() => {
                    const modal = new ExcludeFoldersModal(ExtendedGraphInstances.settings.excludedSourcesFolder);
                    modal.open();
                    modal.onClose = () => this.setManageNumber(cb, ExtendedGraphInstances.settings.excludedSourcesFolder.length);
                });
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.excludeTargetFolders"))
            .setDesc(t("features.excludeTargetFoldersDesc"))
            .addButton(cb => {
                this.setManageNumber(cb, ExtendedGraphInstances.settings.excludedTargetsFolder.length);
                cb.onClick(() => {
                    const modal = new ExcludeFoldersModal(ExtendedGraphInstances.settings.excludedTargetsFolder);
                    modal.open();
                    modal.onClose = () => this.setManageNumber(cb, ExtendedGraphInstances.settings.excludedTargetsFolder.length);
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
                cb.setValue(ExtendedGraphInstances.settings.allowMultipleLinkTypes);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.allowMultipleLinkTypes = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addDisableSources() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.removeSources"))
            .setDesc(t("features.removeSourcesDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.disableSource);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.disableSource = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addDisableTargets() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.removeTargets"))
            .setDesc(t("features.removeTargetsDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.disableTarget);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.disableTarget = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addShowOnGraph() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.colorLinks"))
            .setDesc(t("features.interactives.colorLinksDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.displayLinkTypeLabel"))
            .setDesc(t("features.interactives.displayLinkTypeLabelDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.displayLinkTypeLabel);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.displayLinkTypeLabel = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.colorLinkTypeLabel"))
            .setDesc(t("features.interactives.colorLinkTypeLabelDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.colorLinkTypeLabel);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.colorLinkTypeLabel = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addCurvedLinks() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.curvedLinks"))
            .setDesc(t("features.interactives.curvedLinksDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.curvedLinks);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.curvedLinks = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);

        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.interactives.curvedFactor"))
            .setDesc(t("features.interactives.curvedFactorDesc"))
            .addSlider(cb => {
                const preview = document.createTextNode(ExtendedGraphInstances.settings.curvedFactor.toString());
                if (preview) {
                    cb.sliderEl.parentElement?.insertBefore(preview, cb.sliderEl);
                }
                cb.setLimits(-2, 2, 0.2)
                    .setValue(ExtendedGraphInstances.settings.curvedFactor)
                    .onChange(value => {
                        ExtendedGraphInstances.settings.curvedFactor = value;
                        ExtendedGraphInstances.plugin.saveSettings();
                        if (preview) preview.textContent = ExtendedGraphInstances.settings.curvedFactor.toString();
                    })
            }).settingEl);
    }

    private addOutlineLinks() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.linksOutline"))
            .setDesc(t("features.linksOutlineDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.outlineLinks);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.outlineLinks = value;
                    ExtendedGraphInstances.plugin.saveSettings();
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

        const dv = getDataviewPlugin();
        if (dv) {
            for (const page of dv.pages()) {
                for (const [key, value] of Object.entries(page)) {
                    if (key === "file" || ExtendedGraphInstances.settings.imageProperties.contains(key) || INVALID_KEYS[LINK_KEY].includes(key)) continue;
                    if (value === null || value === undefined || value === '') continue;

                    // Check if the key is a canonicalized version of another key
                    if (!ExtendedGraphInstances.settings.canonicalizePropertiesWithDataview && key === canonicalizeVarName(key) && Object.keys(page).some(k => canonicalizeVarName(k) === canonicalizeVarName(key) && k !== key)) {
                        continue;
                    }

                    if ((typeof value === "object") && ("path" in value)) {
                        allTypes.add(ExtendedGraphInstances.settings.canonicalizePropertiesWithDataview ? canonicalizeVarName(key) : key);
                    }

                    if (Array.isArray(value)) {
                        for (const link of value) {
                            if (link && (typeof link === "object") && ("path" in link)) {
                                allTypes.add(ExtendedGraphInstances.settings.canonicalizePropertiesWithDataview ? canonicalizeVarName(key) : key);
                            }
                        }
                    }
                }
            }

        }
        else {
            for (const file of ExtendedGraphInstances.app.vault.getFiles()) {
                const frontmatterLinks = ExtendedGraphInstances.app.metadataCache.getCache(file.path)?.frontmatterLinks;
                if (!frontmatterLinks) continue;
                const types = frontmatterLinks.map(l => l.key.split('.')[0]).filter(k => !ExtendedGraphInstances.settings.imageProperties.contains(k) && !INVALID_KEYS[LINK_KEY].includes(k));
                allTypes = new Set<string>([...allTypes, ...types]);
            }
        }
        return [...allTypes].sort();
    }
}