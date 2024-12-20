import { ColorComponent, DropdownComponent, setIcon, Setting, TextComponent } from "obsidian";
import { cmOptions } from "src/colors/colormaps";
import { ExtendedGraphSettingTab } from "./settingTab";
import { capitalizeFirstLetter } from "src/helperFunctions";
import { plot_colormap } from "src/colors/colors";

export abstract class SettingInteractives {
    settingTab: ExtendedGraphSettingTab;
    name: string;
    previewClass: string;
    
    settingInteractiveColor: Setting;
    colorsContainer: HTMLDivElement;
    canvasPalette: HTMLCanvasElement;
    colorItems = new Map<string, Setting>();
    allTopElements: HTMLElement[] = [];

    constructor(settingTab: ExtendedGraphSettingTab, name: string) {
        this.settingTab = settingTab;
        this.name = name;
    }

    display() {
        this.colorItems.clear();
        let containerEl = this.settingTab.containerEl;
        
        this.allTopElements.push(
            new Setting(containerEl)
                .setName(capitalizeFirstLetter(this.name + 's'))
                .setHeading()
                .settingEl
        );

        let settingPalette = new Setting(containerEl)
            .setName(`Color palette (${this.name}s)`)
            .setDesc(`Choose the color palette for the ${this.name}s visualizations`)
            .addDropdown(cb => cb.addOptions(cmOptions).setValue(this.settingTab.plugin.settings.colormaps[this.name])
            .onChange(async (value) => {
                plot_colormap(this.canvasPalette.id, value, false);
                this.settingTab.plugin.settings.colormaps[this.name] = value;
                this.settingTab.app.workspace.trigger('extended-graph:settings-colorpalette-changed', this.name);
                await this.settingTab.plugin.saveSettings();
            }));
        this.allTopElements.push(settingPalette.settingEl);
        settingPalette.controlEl.addClass("color-palette");
        this.canvasPalette = settingPalette.controlEl.createEl("canvas");
        this.canvasPalette.id = `canvas-palette-${this.name}`;
        this.canvasPalette.width = 100;
        this.canvasPalette.height = 20;
        plot_colormap(this.canvasPalette.id, this.settingTab.plugin.settings.colormaps[this.name], false);
        
        this.settingInteractiveColor = new Setting(containerEl)
            .setName(`Specific ${this.name} colors`)
            .setDesc(`Choose specific ${this.name} colors that will not be affected by the color palette`)
            .addButton(cb => {
                setIcon(cb.buttonEl, "plus");
                cb.onClick((e) => {
                    this.addColor();
                })
            });
        this.allTopElements.push(this.settingInteractiveColor.settingEl);
        
        this.colorsContainer = containerEl.createDiv("settings-colors-container");
        this.allTopElements.push(this.colorsContainer);

        this.settingTab.plugin.settings.interactiveColors[this.name].forEach((interactive) => {
            this.addColor(interactive.type, interactive.color);
        })
    }

    private addColor(type?: string, color?: string) : Setting {
        let colorSetting = new Setting(this.colorsContainer);
        let uuid = crypto.randomUUID();
        this.colorItems.set(uuid, colorSetting);
        
        colorSetting.addText(cb => {
            cb.setPlaceholder(this.getPlaceholder());
            type && cb.setValue(type);
            cb.onChange((name: string) => {
                this.saveColorSetting(uuid);
            })
        });

        colorSetting.addColorPicker(cb => {
            color && cb.setValue(color);
            cb.onChange((color: string) => {
                this.saveColorSetting(uuid);
            })
        });

        colorSetting.addButton(cb => {
            setIcon(cb.buttonEl, 'x');
            cb.onClick((() => {
                this.removeColorSetting(uuid);
            }))
        });

        let preview = colorSetting.controlEl.createDiv(`preview ${this.previewClass}`);
        this.updatePreview(preview, type, color);

        return colorSetting;
    }

    protected updateCSS(preview: HTMLElement, color?: string) {
        let parent = preview.parentElement;
        color ? parent?.style.setProperty("--interactive-color", color) : parent?.style.setProperty("--interactive-color", "transparent");
    }

    private removeColorSetting(uuid: string) {
        const colorSetting = this.colorItems.get(uuid);
        if (!colorSetting) return;

        this.colorsContainer.removeChild(colorSetting.settingEl);
        this.colorItems.delete(uuid);
        this.saveColors(uuid);
    }

    private saveColorSetting(uuid: string) {
        const colorSetting = this.colorItems.get(uuid);
        if (!colorSetting) return;

        const colorPicker = colorSetting.components.find(cb => cb.hasOwnProperty('colorPickerEl')) as ColorComponent;
        const textInput = colorSetting.components.find(cb => cb.hasOwnProperty('inputEl')) as TextComponent;
        const preview = colorSetting.controlEl.querySelector(".preview") as HTMLElement;
        const type = textInput.getValue();
        const color = colorPicker.getValue();
        this.saveColor(preview, type, color);
    }

    protected async saveColors(changedType: string) {
        this.settingTab.plugin.settings.interactiveColors[this.name] = [];
        this.colorItems.forEach(colorSetting => {
            const colorPicker = colorSetting.components.find(cb => cb.hasOwnProperty('colorPickerEl')) as ColorComponent;
            const textInput = colorSetting.components.find(cb => cb.hasOwnProperty('inputEl')) as TextComponent;
            const type = textInput.getValue();
            const color = colorPicker.getValue();
            this.settingTab.plugin.settings.interactiveColors[this.name].push({type: type, color: color});
        });
        this.settingTab.app.workspace.trigger(`extended-graph:settings-${this.name}-color-changed`, changedType);
        await this.settingTab.plugin.saveSettings();
    }

    protected abstract saveColor(preview: HTMLElement, type: string, color: string) : void;
    protected abstract isNameValid(name: string) : boolean;
    protected abstract getPlaceholder() : string;
    protected abstract updatePreview(preview: HTMLDivElement, type?: string, color?: string) : void;
}


export class SettingTags extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, "tag");
        this.previewClass = "arc";
    }

    display(): void {
        super.display();

        let disableNodes = new Setting(this.settingTab.containerEl)
            .setName(`Disable nodes`)
            .setDesc(`When no more tag is available on the node, remove it from the graph. Needs to restart the graph to take effect.`)
            .addToggle(cb => {
                cb.setValue(!this.settingTab.plugin.settings.fadeOnDisable);
                cb.onChange(value => {
                    this.settingTab.plugin.settings.fadeOnDisable = !value;
                    this.settingTab.plugin.saveSettings();
                })
            });
        this.allTopElements.push(disableNodes.settingEl);

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-" + this.name);
        })
    }

    protected saveColor(preview: HTMLDivElement, type: string, color: string) {
        if (this.isNameValid(type)) {
            this.updatePreview(preview, type, color);
            super.saveColors(type);
        }
        else {
            preview.innerText = "";
        }
    }

    protected isNameValid(name: string) : boolean {
        return /^[a-zA-Z]+$/.test(name);
    }

    protected getPlaceholder(): string {
        return "#tag";
    }

    protected updatePreview(preview: HTMLDivElement, type?: string, color?: string) {
        //preview.innerText = type ? "#" + type : "";
        this.updateCSS(preview, color);
    }
}


export class SettingLinks extends SettingInteractives {

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, "link");
        this.previewClass = "line";
    }

    display(): void {
        super.display();

        this.allTopElements.forEach(el => {
            el.addClass("extended-graph-setting-" + this.name);
        })
    }

    protected saveColor(preview: HTMLDivElement, type: string, color: string) {
        if (this.isNameValid(type)) {
            this.updatePreview(preview, type, color);
            super.saveColors(type);
        }
    }

    protected isNameValid(name: string) : boolean {
        return (name.length > 0) && (!name.contains(":"));
    }

    protected getPlaceholder(): string {
        return "property-key";
    }

    protected updatePreview(preview: HTMLDivElement, type?: string, color?: string) {
        this.updateCSS(preview, color);
    }
}