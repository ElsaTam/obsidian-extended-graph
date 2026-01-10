import { ColorComponent, HexString, setIcon, Setting, TextComponent, ToggleComponent } from "obsidian";
import {
    ExtendedGraphSettingTab,
    Feature,
    FOLDER_KEY,
    getCMapData,
    getFileInteractives,
    int2hex,
    InteractivesColorSuggester,
    InteractivesSelectionModal,
    LINK_KEY,
    ExtendedGraphInstances,
    randomColor,
    SettingColorPalette,
    SettingsSectionPerGraphType,
    t,
    TAG_KEY,
    UIElements
} from "../../internal";
import ExtendedGraphPlugin from "../../main";

export abstract class SettingInteractives extends SettingsSectionPerGraphType {
    noneType: string = "";
    undefinedType: string = "";

    settingInteractiveColor: Setting;
    settingInteractiveFilter: Setting;
    selectionContainer: HTMLElement;
    settingColorPalette: SettingColorPalette;
    colors: SettingColor[] = [];
    canBeRecursive: boolean;

    constructor(settingTab: ExtendedGraphSettingTab, feature: Feature, interactiveKey: string, keyword: string, title: string, icon: string, description: string, canBeRecursive: boolean) {
        super(settingTab, feature, interactiveKey, keyword, title, icon, description);
        this.canBeRecursive = canBeRecursive;
    }

    protected override addBody(): void {
        this.colors = [];
        this.addNoneTypeSetting();
        this.addColorPaletteSetting();
        this.addSpecificColorHeaderSetting();
        for (const interactive of ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].colors) {
            if (this.canBeRecursive && interactive.recursive === undefined) {
                interactive.recursive = false;
            }
            this.addColor(interactive);
        }
        this.addFilterTypeSetting();
    }

    protected addNoneTypeSetting() {
        this.noneType = ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].noneType;
        const setting = new Setting(this.containerEl)
            .setName(t("features.interactives.noneTypeID"))
            .setDesc(t("features.interactives.noneTypeIDDesc") + this.interactiveKey)
            .addText(cb => cb
                .setValue(ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].noneType)
                .onChange(async (value) => {
                    value = value.trim();
                    if (value == this.noneType) return;
                    ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].noneType = value;
                    //INVALID_KEYS[this.interactiveKey].remove(this.noneType);
                    //INVALID_KEYS[this.interactiveKey].push(value);
                    this.noneType = value;
                    await ExtendedGraphInstances.plugin.saveSettings();
                }));
        this.elementsBody.push(setting.settingEl);
    }

    protected addUndefinedTypeSetting() {
        const settings = ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey];
        if (settings.undefinedType === undefined) {
            settings.undefinedType = "undefined";
        }
        this.undefinedType = settings.undefinedType;
        const setting = new Setting(this.containerEl)
            .setName(t("features.interactives.undefinedTypeID"))
            .setDesc(t("features.interactives.undefinedTypeIDDesc") + this.interactiveKey)
            .addText(cb => cb
                .setValue(settings.undefinedType ?? "undefined")
                .onChange(async (value) => {
                    value = value.trim();
                    if (value == this.undefinedType) return;
                    ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].undefinedType = value;
                    this.undefinedType = value;
                    await ExtendedGraphInstances.plugin.saveSettings();
                }));
        this.elementsBody.push(setting.settingEl);
    }

    protected addColorPaletteSetting(): void {
        this.settingColorPalette = new SettingColorPalette(this.containerEl, this.settingTab, this.interactiveKey)
            .setDesc(t("features.interactives.paletteDesc") + this.interactiveKey);

        this.settingColorPalette.setValue(ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].colormap);

        this.settingColorPalette.onPaletteChange((palette: string) => {
            const oldName = ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].colormap;
            ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].colormap = palette;
            ExtendedGraphInstances.plugin.app.workspace.trigger('extended-graph:settings-colorpalette-changed', this.interactiveKey);
            ExtendedGraphInstances.plugin.saveSettings();
            this.settingTab.onCustomPaletteModified(oldName, palette);
        });

        // Push to body list
        this.elementsBody.push(this.settingColorPalette.settingEl);
    }

    protected addSpecificColorHeaderSetting(): void {
        this.settingInteractiveColor = new Setting(this.containerEl)
            .setName(t("features.interactives.specificColors"))
            .setDesc(t("features.interactives.specificColorsDesc"))
            .addButton(cb => {
                UIElements.setupButton(cb, 'add');
                cb.onClick((e) => {
                    const data = { type: "", color: int2hex(randomColor()), recursive: this.canBeRecursive ? false : undefined };
                    ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].colors.push(data);
                    this.addColor(data);
                })
            });
        this.elementsBody.push(this.settingInteractiveColor.settingEl);
    }

    protected addFilterTypeSetting(): void {
        this.settingInteractiveFilter = new Setting(this.containerEl)
            .setName(t("features.interactives.selection"))
            .setDesc(t("features.interactives.selectionDesc"))
            .addExtraButton(cb => {
                cb.setIcon('mouse-pointer-click');
                cb.onClick(() => {
                    const modal = new InteractivesSelectionModal(this.interactiveKey, this.getAllTypes());
                    modal.open();
                })
            });
        this.elementsBody.push(this.settingInteractiveFilter.settingEl);
    }

    protected getAllTypes(): string[] {
        let allTypes = new Set<string>();
        const files = ExtendedGraphInstances.app.vault.getFiles();
        for (const file of files) {
            const types = getFileInteractives(this.interactiveKey, file);
            if (types) {
                allTypes = new Set<string>([...allTypes, ...types]);
            }
        }
        return [...allTypes].sort();
    }

    protected addColor(data: { type: string, color: HexString, recursive?: boolean }): SettingColor {
        const setting = new SettingColor(this.containerEl, ExtendedGraphInstances.plugin, this.interactiveKey, data, this.isValueValid.bind(this));
        this.elementsBody.push(setting.settingEl);

        this.colors = this.colors.filter(setting => setting.settingEl.parentElement);
        let previous = this.colors.last() ?? this.settingInteractiveColor;
        this.containerEl.insertAfter(setting.settingEl, previous.settingEl);
        this.colors.push(setting);
        return setting;
    }

    onCustomPaletteModified(oldName: string, newName: string): void {
        // Check if the colormap is no longer in the settings
        if (!getCMapData(ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].colormap, ExtendedGraphInstances.settings)) {
            // If the old name matches AND the new name is valid, change the name
            if (ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].colormap === oldName && getCMapData(newName, ExtendedGraphInstances.settings)) {
                ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].colormap = newName;
            }
            // Otherwise, reset it
            else {
                ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].colormap = "rainbow";
            }
        }
        this.settingColorPalette.populateCustomOptions();
        this.settingColorPalette.setValue(ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].colormap);
    }

    protected abstract isValueValid(name: string): boolean;
    protected abstract getPlaceholder(): string;
}


export class SettingColor extends Setting {
    plugin: ExtendedGraphPlugin;

    isValid: (type: string) => boolean;
    key: string;
    data: {
        type: string,
        color: HexString,
        recursive?: boolean
    }

    textComponent: TextComponent;
    colorComponent: ColorComponent;
    recursiveComponent?: ToggleComponent;
    warningDiv: HTMLDivElement;

    constructor(
        containerEl: HTMLElement,
        plugin: ExtendedGraphPlugin,
        key: string,
        data: {
            type: string,
            color: HexString,
            recursive?: boolean
        },
        isValid: (type: string) => boolean,
    ) {
        super(containerEl);

        this.plugin = plugin;
        this.isValid = isValid;
        this.key = key;
        this.data = data;

        // Input
        this.addSearch(cb => {
            this.textComponent = cb;
            const suggester = new InteractivesColorSuggester(cb.inputEl, ExtendedGraphInstances.settings,
                (value) => {
                    this.toggleWarning();
                    this.save();
                    suggester.typeToInclude = this.data.type;
                });
            suggester.typeToInclude = this.data.type;
            switch (key) {
                case LINK_KEY:
                    suggester.setKey('link');
                    break;
                case TAG_KEY:
                    suggester.setKey('tag');
                    break;
                case FOLDER_KEY:
                    suggester.setKey('folder');
                    break;
                default:
                    suggester.setKey('property', key);
                    break;
            }
            cb.setPlaceholder(key);
            cb.setValue(data.type);
            cb.onChange((name: string) => {
                this.toggleWarning();
                this.save();
                suggester.typeToInclude = this.data.type;
            })
        });

        // Color picker
        this.addColorPicker(cb => {
            this.colorComponent = cb;
            cb.setValue(data.color);
            cb.onChange((hex: string) => {
                this.updateCSS();
                this.save();
            })
        });

        // Delete button
        this.addButton(cb => {
            setIcon(cb.buttonEl, 'x');
            cb.onClick(() => {
                this.remove();
            })
        });

        // Recursive toggle
        const recursive = data.recursive;
        if (recursive !== undefined) {
            this.addToggle(cb => {
                this.recursiveComponent = cb;
                cb.toggleEl.insertAdjacentText("afterend", t("features.recursive"))
                cb.setValue(recursive);
                cb.onChange((value) => {
                    this.save();
                });
            });
        }

        // Already used warning
        this.warningDiv = this.controlEl.createDiv("control-warning");
        setIcon(this.warningDiv.createDiv(), 'triangle-alert');
        this.warningDiv.appendText(t("features.interactives.alreadyExists"));
        this.warningDiv.addClass("is-hidden");

        this.updateCSS();
        this.settingEl.addClass('setting-color');
    }

    private toggleWarning() {
        const newType = this.textComponent.getValue().trim();
        this.warningDiv.toggleClass("is-hidden", !ExtendedGraphInstances.settings.interactiveSettings[this.key].colors.find(data => data.type === newType && data !== this.data));
    }

    private save() {
        const newType = this.textComponent.getValue().trim();
        const newColor = this.colorComponent.getValue();
        const newRecursive = this.recursiveComponent?.getValue();

        if (!this.isValid(newType)) return;

        // Modify the correct data through pointer
        const oldType = this.data.type;
        this.data.type = newType;
        this.data.color = newColor;
        this.data.recursive = newRecursive;

        this.plugin.saveSettings().then(() => {
            if (oldType !== newType) {
                this.plugin.app.workspace.trigger(`extended-graph:settings-interactive-color-changed`, this.key, oldType);
            }
            this.plugin.app.workspace.trigger(`extended-graph:settings-interactive-color-changed`, this.key, newType);
        });
    }

    private updateCSS() {
        this.settingEl.style.setProperty("--interactive-color", this.colorComponent.getValue());
    }

    protected remove() {
        ExtendedGraphInstances.settings.interactiveSettings[this.key].colors.remove(this.data);
        ExtendedGraphInstances.plugin.saveSettings().then(() => {
            ExtendedGraphInstances.app.workspace.trigger(`extended-graph:settings-interactive-color-changed`, this.key, this.data.type);
        });

        this.settingEl.remove();
    }
}