import { ExtraButtonComponent, Setting } from "obsidian";
import { ExtendedGraphSettingTab, getCMapData, NodeShape, ExtendedGraphInstances, SettingColorPalette, SettingsSection, ShapeEnum, t } from "../internal";

export class SettingLocal extends SettingsSection {
    depthColormapSetting: SettingColorPalette;
    shapesSVGContainer: HTMLElement;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'local-graph', t("features.ids.localGraph"), t("features.localGraph"), 'map-pin', t("features.localGraphDesc"));
    }

    protected override addBody() {
        this.addColorBasedOnDepth();
        this.addCurrentNodeColor();
        this.addCurrentNodeSize();
        this.addCurrentNodeShape();
    }


    private addColorBasedOnDepth() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.colorBasedOnDepth"))
            .setDesc(t("features.colorBasedOnDepthDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.colorBasedOnDepth)
                    .onChange(async (value) => {
                        ExtendedGraphInstances.settings.colorBasedOnDepth = value;
                        ExtendedGraphInstances.plugin.saveSettings();
                        this.depthColormapSetting.setVisibility(value);
                    })
            }).settingEl);

        this.depthColormapSetting = new SettingColorPalette(this.containerEl, this.settingTab, 'depth-color')
            .setName(t("features.depthPalette"))
            .setDesc(t("features.depthPaletteDesc"));

        this.depthColormapSetting.setValue(ExtendedGraphInstances.settings.depthColormap);

        this.depthColormapSetting.onPaletteChange((palette: string) => {
            ExtendedGraphInstances.settings.depthColormap = palette;
            ExtendedGraphInstances.plugin.saveSettings();
        });

        this.depthColormapSetting.setVisibility(ExtendedGraphInstances.settings.colorBasedOnDepth);

        // Push to body list
        this.elementsBody.push(this.depthColormapSetting.settingEl);
    }

    private addCurrentNodeColor() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.localGraphCurrentNodeColor"))
            .setDesc(t("features.localGraphCurrentNodeColorDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.currentNode.useColor);
                cb.onChange(async (value) => {
                    ExtendedGraphInstances.settings.currentNode.useColor = value;
                    await ExtendedGraphInstances.plugin.saveSettings();
                })
            })
            .addColorPicker(cb => {
                cb.setValue(ExtendedGraphInstances.settings.currentNode.color);
                cb.onChange(async (hex: string) => {
                    ExtendedGraphInstances.settings.currentNode.color = hex;
                    await ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    private addCurrentNodeSize() {
        this.elementsBody.push(new Setting(this.containerEl)
            .setName(t("features.localGraphCurrentNodeSize"))
            .setDesc(t("features.localGraphCurrentNodeSizeDesc"))
            .addText(cb => {
                cb.inputEl.addClass("number");
                cb.setValue(ExtendedGraphInstances.settings.currentNode.size.toString());
                cb.onChange(async (value) => {
                    const intValue = parseInt(value);
                    if (!isNaN(intValue)) {
                        ExtendedGraphInstances.settings.currentNode.size = Math.max(10, intValue);
                        await ExtendedGraphInstances.plugin.saveSettings();
                    }
                })
            }).settingEl);
    }

    private addCurrentNodeShape() {
        const setting = new Setting(this.containerEl)
            .setName(t("features.localGraphCurrentNodeShape"))
            .setDesc(t("features.localGraphCurrentNodeShapeDesc"));
        this.elementsBody.push(setting.settingEl);
        this.shapesSVGContainer = setting.controlEl;

        const shapes = Object.values(ShapeEnum);
        for (const shape of shapes) {
            const svg = NodeShape.getSVG(shape);
            svg.addClass("shape-svg");

            const extraButton = new ExtraButtonComponent(this.shapesSVGContainer);
            extraButton.setTooltip(shape);
            extraButton.extraSettingsEl.addClasses(["shape-icon", shape]);
            extraButton.extraSettingsEl.replaceChildren(svg);
            extraButton.onClick(async () => {
                ExtendedGraphInstances.settings.currentNode.shape = shape;
                await ExtendedGraphInstances.plugin.saveSettings();
                this.highlightSelectedShape();
            })
        }

        this.highlightSelectedShape();
    }

    private highlightSelectedShape() {
        for (const child of Array.from(this.shapesSVGContainer.querySelectorAll(".shape-icon"))) {
            child.toggleClass("is-active", child.hasClass(ExtendedGraphInstances.settings.currentNode.shape));
        }
    }



    onCustomPaletteModified(oldName: string, newName: string): void {
        // Check if the colormap is no longer in the settings
        if (!getCMapData(ExtendedGraphInstances.settings.depthColormap, ExtendedGraphInstances.settings)) {
            // If the old name matches AND the new name is valid, change the name
            if (ExtendedGraphInstances.settings.depthColormap === oldName && getCMapData(newName, ExtendedGraphInstances.settings)) {
                ExtendedGraphInstances.settings.depthColormap = newName;
            }
            // Otherwise, reset it
            else {
                ExtendedGraphInstances.settings.depthColormap = "rainbow";
            }
        }
        this.depthColormapSetting.populateCustomOptions();
        this.depthColormapSetting.setValue(ExtendedGraphInstances.settings.depthColormap);
    }

}