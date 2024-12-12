import { App, PluginSettingTab, Setting } from "obsidian";
import GraphExtendedPlugin from "./main";

export interface ExtendedGraphSettings {
    colormap: string;
    imageProperty: string;
}

export const DEFAULT_SETTINGS: ExtendedGraphSettings = {
    colormap: "hsv",
    imageProperty: "image"
};

export class ExtendedGraphSettingTab extends PluginSettingTab {
    plugin: GraphExtendedPlugin;

    constructor(app: App, plugin: GraphExtendedPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() : void {
        const {containerEl} = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Image property')
            .setDesc('Name of the propery used to query the image of the node\'s note.')
            .addText(cb => cb
                .setValue(this.plugin.settings.imageProperty)
                .onChange(async (value) => {
                    this.plugin.settings.imageProperty = value;
                    await this.plugin.saveSettings();
            }))

        new Setting(containerEl)
            .setName('Color palette')
            .setDesc('Choose the color palette for the tags arc visualizations')
            .addDropdown(cb => cb.addOptions({
                RdYlBu: "RdYlBu",
                RdYlGn: "RdYlGn",
                Spectral: "Spectral",
                brg: "brg",
                cividis: "cividis",
                cool: "cool",
                hsv: "hsv",
                gnuplot: "gnuplot",
                jet: "jet",
                magma: "magma",
                plasma: "plasma",
                rainbow: "rainbow",
                spring: "spring",
                summer: "summer",
                turbo: "turbo",
                viridis: "viridis",
                winter: "winter"
            }).setValue(this.plugin.settings.colormap)
            .onChange(async (value) => {
                this.plugin.settings.colormap = value;
                this.app.workspace.trigger('extended-graph:settings-colorpalette-changed');
                await this.plugin.saveSettings();
            }));
    }
}