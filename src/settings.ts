import { App, PluginSettingTab, Setting } from "obsidian";
import GraphExtendedPlugin from "./main";

export interface ExtendedGraphSettings {
    colormaps: { [interactive: string] : string };
    imageProperty: string;
}

export const DEFAULT_SETTINGS: ExtendedGraphSettings = {
    colormaps: {
        "tag": "hsv",
        "relationship": "rainbow"
    },
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
        
        const cmOptions = {
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
        };

        new Setting(containerEl)
            .setName('Color palette (tags)')
            .setDesc('Choose the color palette for the tags arc visualizations')
            .addDropdown(cb => cb.addOptions(cmOptions).setValue(this.plugin.settings.colormaps["tag"])
            .onChange(async (value) => {
                this.plugin.settings.colormaps["tag"] = value;
                this.app.workspace.trigger('extended-graph:settings-colorpalette-changed', "tag");
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('Color palette (relationships)')
            .setDesc('Choose the color palette for the relationship links')
            .addDropdown(cb => cb.addOptions(cmOptions).setValue(this.plugin.settings.colormaps["relationship"])
            .onChange(async (value) => {
                this.plugin.settings.colormaps["relationship"] = value;
                this.app.workspace.trigger('extended-graph:settings-colorpalette-changed', "relationship");
                await this.plugin.saveSettings();
            }));
    }
}