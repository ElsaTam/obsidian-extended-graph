import { ButtonComponent, ExtraButtonComponent, Modal, setIcon, Setting } from "obsidian";
import * as Color from '../../colors/color-bits';
import { cmOptions, GradientMakerModal, plotColorMap, plotColorMapFromName, ExtendedGraphInstances, t, UIElements } from "../../internal";

export class GradientPickerModal extends Modal {
    callback: (palette: string) => void;
    selectedPalette: string = "";
    customPalettes: Record<string, { name: string, setting: Setting, canvas: HTMLCanvasElement }> = {};

    constructor() {
        super(ExtendedGraphInstances.app);
        this.setTitle(t("features.interactives.palettePickGradient"));
        this.modalEl.addClass("graph-modal-palette-picker");
    }

    onOpen() {
        for (const [group, palettes] of Object.entries(cmOptions)) {
            this.addPalettesGroup(group, palettes);
        }
        this.addCustomPalettesGroup();
        this.addInfo();
    }

    private addPalettesGroup(name: string, palettes: string[]) {
        const group = new Setting(this.contentEl)
            .setName(name)
            .setHeading();
        group.controlEl.addClass("palette-group");

        for (const palette of palettes) {
            this.addPalette(palette, group.controlEl);
            this.addPalette(palette + "_r", group.controlEl);
        }
    }

    private addPalette(palette: string, container: HTMLElement) {
        const setting = new Setting(container)
            .setName(palette);

        const canvasPalette = setting.controlEl.createEl("canvas");
        canvasPalette.id = `picker-canvas-palette-${palette}`;
        canvasPalette.width = 100;
        canvasPalette.height = 20;
        plotColorMapFromName(canvasPalette, palette, ExtendedGraphInstances.settings);
        canvasPalette.onclick = () => {
            this.selectedPalette = palette;
            this.close();
        }
    }

    private addCustomPalettesGroup() {
        const group = new Setting(this.contentEl)
            .setName(t("plugin.custom"))
            .setHeading();
        new ButtonComponent(group.infoEl)
            .then(cb => {
                UIElements.setupButton(cb, "add");
                cb.onClick(() => {
                    const modal = new GradientMakerModal();
                    modal.onSave(name => {
                        this.addCustomPalette(name, group.controlEl);
                        this.selectedPalette = "custom:" + name;
                        this.callback(this.selectedPalette);
                    });
                    modal.open();
                });
            });
        group.controlEl.addClass("palette-group");

        for (const palette in ExtendedGraphInstances.settings.customColorMaps) {
            this.addCustomPalette(palette, group.controlEl);
        }
    }

    private addCustomPalette(name: string, container: HTMLElement) {
        const data = ExtendedGraphInstances.settings.customColorMaps[name];
        if (!data) return;

        const existing = Object.entries(this.customPalettes).find(([id, el]) => el.name === name);
        let id: string;
        if (!existing) {
            id = crypto.randomUUID();
            const setting = new Setting(container).setName(name);
            setting.settingEl.addClass("custom-palette");

            const canvas = setting.controlEl.createEl("canvas");
            canvas.id = `picker-canvas-custom-palette-${id}`;
            canvas.width = 100;
            canvas.height = 20;

            new ExtraButtonComponent(setting.infoEl)
                .then(cb => {
                    UIElements.setupExtraButton(cb, "edit");
                    cb.onClick(() => this.editCustomPalette(id));
                });

            new ExtraButtonComponent(setting.infoEl)
                .then(cb => {
                    UIElements.setupExtraButton(cb, "delete");
                    cb.onClick(() => this.deleteCustomPalette(id));
                });

            canvas.onclick = () => this.selectCustomPalette(id);

            this.customPalettes[id] = { name: name, setting, canvas };
        }
        else {
            id = existing[0];
        }

        plotColorMap(this.customPalettes[id].canvas, data.reverse, data.interpolate, data.colors.map(col => Color.parseHex(col).rgb), data.stops);
    }

    private editCustomPalette(id: string) {
        let name = this.customPalettes[id].name;
        const modal = new GradientMakerModal(name);
        modal.onSave(newName => {
            this.onCustomPaletteEdited(id, name, newName);
            name = newName;
        });
        modal.open();
    }

    private async onCustomPaletteEdited(id: string, oldName: string, newName: string) {
        const customNewName = "custom:" + newName;
        const data = ExtendedGraphInstances.settings.customColorMaps[customNewName];
        if (!data) return;

        if (oldName !== customNewName) {
            delete ExtendedGraphInstances.settings.customColorMaps[oldName];
            for (const key in ExtendedGraphInstances.settings.interactiveSettings) {
                if (ExtendedGraphInstances.settings.interactiveSettings[key].colormap === oldName) {
                    ExtendedGraphInstances.settings.interactiveSettings[key].colormap = customNewName;
                }
            }
            if (ExtendedGraphInstances.settings.nodesColorColormap === oldName) {
                ExtendedGraphInstances.settings.nodesColorColormap = customNewName;
            }
            if (ExtendedGraphInstances.settings.linksColorColormap === oldName) {
                ExtendedGraphInstances.settings.linksColorColormap = customNewName;
            }
            await ExtendedGraphInstances.plugin.saveSettings();
        }
        this.selectedPalette = customNewName;
        this.callback(this.selectedPalette);

        this.customPalettes[id].name = newName;
        this.customPalettes[id].setting.setName(newName);
        plotColorMap(this.customPalettes[id].canvas, data.reverse, data.interpolate, data.colors.map(col => Color.parseHex(col).rgb), data.stops);
    }

    private deleteCustomPalette(id: string) {
        const name = this.customPalettes[id].name;

        delete ExtendedGraphInstances.settings.customColorMaps[name];
        for (const key in ExtendedGraphInstances.settings.interactiveSettings) {
            if (ExtendedGraphInstances.settings.interactiveSettings[key].colormap === name) {
                ExtendedGraphInstances.settings.interactiveSettings[key].colormap = "rainbow";
            }
        }
        if (ExtendedGraphInstances.settings.nodesColorColormap === name) {
            ExtendedGraphInstances.settings.nodesColorColormap = "rainbow";
        }
        if (ExtendedGraphInstances.settings.linksColorColormap === name) {
            ExtendedGraphInstances.settings.linksColorColormap = "rainbow";
        }
        ExtendedGraphInstances.plugin.saveSettings();

        this.selectedPalette = "rainbow";
        this.callback(this.selectedPalette);
        this.customPalettes[id].setting.settingEl.detach();
        delete this.customPalettes[id];
    }

    private selectCustomPalette(id: string) {
        this.selectedPalette = "custom:" + this.customPalettes[id].name;
        this.close();
    }

    private addInfo() {
        new Setting(this.contentEl)
            .setName(t("plugin.info"))
            .setHeading()
            .setDesc(t("features.interactives.paletteMatplotlibDesc"))
            .then(setting => {
                const iconEl = createDiv();
                setting.nameEl.prepend(iconEl);
                setIcon(iconEl, 'info');

                const link = setting.descEl.createEl("a");
                link.href = "https://matplotlib.org/stable/users/explain/colors/colormaps.html";
                link.setText("https://matplotlib.org/stable/users/explain/colors/colormaps.html");
            })

    }


    override onClose(): void {
        this.contentEl.empty();
        if (this.selectedPalette !== "") this.callback(this.selectedPalette);
    }

    onSelected(callback: (palette: string) => void) {
        this.callback = callback;
    }
}