import { ButtonComponent, setIcon, Setting, TextComponent, TFile } from "obsidian";
import { getAPI as getDataviewAPI } from "obsidian-dataview";
import { ExtendedGraphSettingTab, LayersManager, PluginInstances, SettingsSectionPerGraphType, SettingMultiPropertiesModal, t, UIElements, Layer } from "src/internal";

export class SettingLayers extends SettingsSectionPerGraphType {
    layerInfoSettings: LayerSetting[] = [];
    lastSettingBeforeLayerInfos: Setting;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'layers', '', t("features.ids.layers"), `${t("features.layers")} (${t("beta.beta")})`, 'layers', t("features.layersDesc"));
    }

    protected override addBody() {
        this.addProperties();
        this.addNumberOfActiveLayers();
        this.addLayerOrder();
        this.addRemoveNodesWithoutLayer();
        this.addUseCustomOpacity();
        this.addLayersInfo();
        this.addDisplayLabelsInUI();
    }

    private addProperties() {
        this.elementsBody.push(new Setting(this.settingTab.containerEl)
            .setName(t("features.layerProperties"))
            .setDesc(t("features.layerPropertiesDesc"))
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new SettingMultiPropertiesModal(
                        t("features.layerProperties"),
                        t("features.layerPropertiesAdd"),
                        PluginInstances.settings.layerProperties
                    );
                    modal.open();
                })
            }
            ).settingEl);
    }

    private addNumberOfActiveLayers() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.layersNumber"))
            .setDesc(t("features.layersNumberDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(PluginInstances.settings.numberOfActiveLayers.toString())
                    .onChange(async (value) => {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue) && intValue > 0) {
                            PluginInstances.settings.numberOfActiveLayers = intValue;
                            await PluginInstances.plugin.saveSettings();
                        }
                    })
            }).settingEl);
    }

    private addLayerOrder() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.layersOrder"))
            .setDesc(t("features.layersOrderDesc"))
            .addDropdown(cb => {
                cb.addOptions({
                    "ASC": "0-9",
                    "DESC": "9-0"
                }).setValue(PluginInstances.settings.layersOrder)
                    .onChange(async (value) => {
                        if (value === "ASC" || value === "DESC") {
                            PluginInstances.settings.layersOrder = value;
                            await PluginInstances.plugin.saveSettings();
                        }
                    })
            }).settingEl);
    }

    private addRemoveNodesWithoutLayer() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.layersRemoveIfNoLayer"))
            .setDesc(t("features.layersRemoveIfNoLayerDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.removeNodesWithoutLayers)
                    .onChange(async (value) => {
                        PluginInstances.settings.removeNodesWithoutLayers = value;
                        await PluginInstances.plugin.saveSettings();
                    })
            }).settingEl);
    }

    private addUseCustomOpacity() {
        const setting = new Setting(this.containerEl)
            .setName(t("features.layersUseCustomOpacity"))
            .setDesc(t("features.layersUseCustomOpacityDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.useLayerCustomOpacity)
                    .onChange(async (value) => {
                        PluginInstances.settings.useLayerCustomOpacity = value;
                        await PluginInstances.plugin.saveSettings();
                    })
            });
        this.elementsBody.push(setting.settingEl);
        this.lastSettingBeforeLayerInfos = setting;
    }

    private addLayersInfo() {
        const layers = LayersManager.getAllLayers(PluginInstances.settings);
        this.addLayersInfoFromData(layers);

        if (getDataviewAPI(PluginInstances.app)) {
            const setting = new Setting(this.containerEl)
                .setClass("setting-warning")
                .setDesc(t("features.layersInfoDataview"))
                .then(cb => {
                    setIcon(cb.nameEl, 'triangle-alert');
                });
            this.elementsBody.push(setting.settingEl);
        }

        if (layers.some(layer => !layer.levelFromID)) {
            const setting = new Setting(this.containerEl)
                .setClass("setting-additional-info")
                .setDesc(t("features.layersInfoLevelNotFromID"))
                .then(cb => {
                    setIcon(cb.nameEl, 'asterisk');
                });
            this.elementsBody.push(setting.settingEl);
        }
    }

    private addLayersInfoFromData(layers: Layer[]) {
        for (const setting of this.layerInfoSettings) {
            setting.settingEl.detach();
        }
        this.layerInfoSettings = [];

        for (const layer of layers.reverse()) {
            const setting = new LayerSetting(this.settingTab.containerEl, this, layer);

            this.lastSettingBeforeLayerInfos.settingEl.insertAdjacentElement("afterend", setting.settingEl);
            this.layerInfoSettings.push(setting);
            this.elementsBody.push(setting.settingEl);
        }

        this.layerInfoSettings.reverse();
    }

    private addDisplayLabelsInUI() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.layersDisplayLabels"))
            .setDesc(t("features.layersDisplayLabelsDesc"))
            .addToggle(cb => {
                cb.setValue(PluginInstances.settings.displayLabelsInUI)
                    .onChange(async (value) => {
                        PluginInstances.settings.displayLabelsInUI = value;
                        await PluginInstances.plugin.saveSettings();
                    })
            }).settingEl);
    }

    // =========================================================================

    async updateLayerID(setting: LayerSetting) {
        const oldLevel = setting.layer.level;
        let newLevel = parseInt(setting.levelInput.getValue());
        if (isNaN(newLevel)) {
            newLevel = oldLevel;
        }
        const oldLabel = setting.layer.label;
        let newLabel = setting.labelInput?.getValue() ?? oldLabel;
        if (newLabel === "") {
            newLabel = oldLabel;
        }

        const oldID = setting.layer.id;
        const newID = setting.layer.levelFromID ? newLevel.toString() + (newLabel !== "" ? ("_" + newLabel) : "") : newLabel;

        const updateSetting = () => {
            setting.layer.id = newID;
            setting.layer.level = newLevel;
            setting.layer.label = newLabel;
            setting.levelInput.setValue(newLevel.toString());
            setting.labelInput?.setValue(newLabel);
        }

        if (oldLevel === newLevel && oldLabel === newLabel) {
            updateSetting();
            return;
        }

        if (oldLevel !== newLevel && !setting.layer.levelFromID) {
            PluginInstances.settings.layersLevels[newID] = newLevel
            // We don't delete the previous one because it might be used by inline dataview properties
        }

        // If there is already a custom opacity for this new level, we don't do anything.
        // But if there isn't, we copy the custom opacity of the old level
        // We don't remove the old one because there are some inline properties from Dataview that might still use it
        if (oldLevel in PluginInstances.settings.layersCustomOpacity && !(newLevel in PluginInstances.settings.layersCustomOpacity)) {
            PluginInstances.settings.layersCustomOpacity[newLevel] = PluginInstances.settings.layersCustomOpacity[oldLevel];
            await PluginInstances.plugin.saveSettings();
        }

        // Then, we process all the frontmatters' files
        const files = PluginInstances.app.vault.getMarkdownFiles();
        for (const file of files) {
            await PluginInstances.app.fileManager.processFrontMatter(file, (frontmatter) => {
                for (const property of PluginInstances.settings.layerProperties) {
                    // If a layer property exists and is currently equal to the old id, change its value
                    if (property in frontmatter && frontmatter[property] === oldID) {
                        frontmatter[property] = newID;
                    }
                }
            });
        }

        // Update the layer setting
        updateSetting();

        // Reorder the layers
        const layers = this.layerInfoSettings.map(s => s.layer);
        LayersManager.sortData(PluginInstances.settings, layers);
        this.addLayersInfoFromData(layers);
    }
}

class LayerSetting extends Setting {
    mainSettings: SettingLayers;
    layer: Layer

    saveButton: ButtonComponent;
    levelInput: TextComponent;
    labelInput?: TextComponent;
    opacityInput: TextComponent;

    constructor(
        containerEl: HTMLElement,
        mainSettings: SettingLayers,
        layer: Layer
    ) {
        super(containerEl)

        this.mainSettings = mainSettings;
        this.layer = layer;

        this.settingEl.addClass("setting-layer-info");

        this.addSaveButton()
            .addLevelInput()
            .addLabelInput()
            .addLevelOriginIcon()
            .addOpacityInput();
    }

    private addSaveButton(): LayerSetting {
        this.addButton(cb => {
            this.saveButton = cb;
            UIElements.setupButton(cb, 'save');
            cb.onClick(() => {
                this.mainSettings.updateLayerID(this);
            });
        });
        return this;
    }

    private addLevelInput(): LayerSetting {
        this.addText(cb => {
            this.levelInput = cb;
            cb.inputEl.addClass("number");
            if (this.layer.levelFromDefault) {
                cb.setPlaceholder(this.layer.level.toString());
            }
            else {
                cb.setValue(this.layer.level.toString());
            }
        });
        return this;
    }

    private addLabelInput(): LayerSetting {
        if (this.layer.label === "") {
            return this;
        }
        return this.addText(cb => {
            this.labelInput = cb;
            this.labelInput.setValue(this.layer.label);
        })
    }

    private addLevelOriginIcon(): LayerSetting {
        if (this.layer.levelFromID) return this;

        const iconDiv = this.controlEl.createDiv("level-origin-icon");
        setIcon(iconDiv, 'asterisk');
        return this;
    }

    private addOpacityInput(): LayerSetting {
        this.addText(cb => {
            cb.inputEl.addClass("number");
            cb.setPlaceholder(t("features.layersOpacityPlaceholder"));
            cb.setValue(PluginInstances.settings.layersCustomOpacity[this.layer.level]?.toString() ?? "");
            cb.onChange(async (value) => {
                const floatValue = parseFloat(value);
                if (!isNaN(floatValue)) {
                    PluginInstances.settings.layersCustomOpacity[this.layer.level] = floatValue;
                    await PluginInstances.plugin.saveSettings();
                }
                else {
                    delete PluginInstances.settings.layersCustomOpacity[this.layer.level];
                    await PluginInstances.plugin.saveSettings();
                }
            });
        });
        return this;
    }
}