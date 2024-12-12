import { App, PluginSettingTab, Setting } from "obsidian";
import GraphExtendedPlugin from "./main";

export interface ExtendedGraphSettings {
    colormap: string;
}

export const DEFAULT_SETTINGS: ExtendedGraphSettings = {
    colormap: "hsv",
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
            .setName('Color palette')
            .setDesc('Toggle to enable or disable link type names in the graph view.')
            .addDropdown(cb => cb.addOptions({
                hsv: "hsv",
                rainbow: "rainbow",
                Spectral: "Spectral",
                viridis: "viridis",
            }).setValue(this.plugin.settings.colormap)
            .onChange(async (value) => {
                this.plugin.settings.colormap = value;
                this.app.workspace.trigger('extended-graph:settings-colorpalette-changed');
                await this.plugin.saveSettings();
            }));
    }
}