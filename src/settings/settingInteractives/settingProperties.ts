import { ButtonComponent, Notice, Setting } from "obsidian";
import {
    ExtendedGraphSettingTab,
    FOLDER_KEY,
    isPropertyKeyValid,
    LINK_KEY,
    ExtendedGraphInstances,
    AddPropertyInteractiveModal,
    SettingInteractives,
    SettingsSectionPerGraphType,
    t,
    TAG_KEY,
    UIElements,
    getDataviewPlugin
} from "../../internal";

export class SettingPropertiesArray extends SettingsSectionPerGraphType {
    settingInteractives: SettingInteractives[] = [];
    interactiveName: string;
    propertiesContainer: HTMLElement;
    addButton?: ButtonComponent;

    constructor(settingTab: ExtendedGraphSettingTab) {
        super(settingTab, 'properties', '', t("features.ids.properties"), t("features.interactives.properties"), 'archive', t("features.interactives.propertiesDesc"));

        for (const key of Object.keys(ExtendedGraphInstances.settings.additionalProperties)) {
            this.settingInteractives.push(new SettingProperty(key, settingTab, this));
        }
    }

    protected override addHeader(): void {
        super.addHeader();

        this.settingHeader.addButton(cb => {
            this.addButton = cb;
            UIElements.setupButton(cb, 'add');
            this.elementsBody.push(cb.buttonEl);
            cb.onClick((e) => {
                cb.buttonEl.blur();
                this.openModalToAddInteractive();
            });
            this.settingHeader.controlEl.insertAdjacentElement("afterbegin", cb.buttonEl);
        });
    }

    protected override addBody() {
        this.propertiesContainer = this.settingTab.containerEl.createDiv("setting-item settings-properties-container");
        this.elementsBody.push(this.propertiesContainer);

        for (const setting of this.settingInteractives) {
            setting.containerEl = this.propertiesContainer;
            setting.display();
        }
    }

    protected openModalToAddInteractive() {
        const modal = new AddPropertyInteractiveModal(
            "Property key",
            this.addProperty.bind(this)
        );
        modal.open();
    }

    isKeyValid(key: string) {
        if (ExtendedGraphInstances.settings.additionalProperties.hasOwnProperty(key)) {
            new Notice(t("features.interactives.propertyAlreadyExists"));
            return false;
        }
        else if (key === LINK_KEY) {
            new Notice(t("features.interactives.propertyReservedLinks"));
            return false;
        }
        else if (key === FOLDER_KEY) {
            new Notice(t("features.interactives.propertyReservedFolders"));
            return false;
        }
        else if (key === TAG_KEY) {
            new Notice(t("features.interactives.propertyReservedTags"));
            return false;
        }
        return isPropertyKeyValid(key);
    }

    protected addProperty(key: string): boolean {
        if (!this.isKeyValid(key)) return false;

        ExtendedGraphInstances.settings.additionalProperties[key] = {
            'graph': true,
            'localgraph': true
        };
        ExtendedGraphInstances.settings.interactiveSettings[key] = {
            colormap: "rainbow",
            colors: [],
            unselected: [],
            excludeRegex: { regex: "", flags: "" },
            noneType: "none",
            showOnGraph: true,
            enableByDefault: true,
        }
        ExtendedGraphInstances.plugin.saveSettings().then(() => {
            const setting = new SettingProperty(key, this.settingTab, this);
            this.settingInteractives.push(setting);
            setting.containerEl = this.propertiesContainer;
            setting.display();
            //INVALID_KEYS[key] = [PluginInstances.settings.interactiveSettings[key].noneType];
        });
        return true;
    }

    protected override onCollapse(): void {
        this.addButton?.buttonEl.hide();
    }

    protected override onExpand(): void {
        this.addButton?.buttonEl.show();
    }

    onCustomPaletteModified(oldName: string, newName: string): void {
        for (const setting of this.settingInteractives) {
            setting.onCustomPaletteModified(oldName, newName);
        }
    }
}

export class SettingProperty extends SettingInteractives {
    array: SettingPropertiesArray;

    constructor(key: string, settingTab: ExtendedGraphSettingTab, array: SettingPropertiesArray) {
        super(settingTab, 'property-key', key, '', t("features.interactives.property") + ": " + key, '', t("features.interactives.propertyDesc") + key, false);
        this.array = array;
    }

    protected override addHeader() {
        super.addHeader();
        this.settingHeader.addExtraButton(cb => {
            UIElements.setupExtraButton(cb, 'delete');
            cb.onClick(() => {
                this.remove();
            });
            this.settingHeader.controlEl.insertAdjacentElement("afterbegin", cb.extraSettingsEl);
        });
        this.settingHeader.settingEl.addClass('setting-property-header');

        this.foldIcon.extraSettingsEl.remove();
    }

    protected override addBody(): void {
        super.addBody();

        // Show on graph
        this.elementsBody.push(new Setting(this.array.propertiesContainer)
            .setName(t("features.interactives.arcsAdd"))
            .setDesc(t("features.interactives.arcsAddPropertyDesc"))
            .addToggle(cb => {
                cb.setValue(ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph);
                cb.onChange(value => {
                    ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey].showOnGraph = value;
                    ExtendedGraphInstances.plugin.saveSettings();
                })
            }).settingEl);
    }

    remove(): void {
        delete ExtendedGraphInstances.settings.additionalProperties[this.interactiveKey];
        delete ExtendedGraphInstances.settings.interactiveSettings[this.interactiveKey];
        this.array.settingInteractives.remove(this);
        ExtendedGraphInstances.plugin.saveSettings().then(() => {
            this.settingHeader.settingEl.remove();
            this.elementsBody.forEach(el => el.remove());
        });
    }

    protected override isValueValid(name: string): boolean {
        return (name.length > 0);
    }

    protected override getPlaceholder(): string {
        return "property-key";
    }

    protected override getAllTypes(): string[] {
        return SettingProperty.getAllTypes(this.interactiveKey) ?? super.getAllTypes();
    }

    static getAllTypes(key: string): string[] | undefined {
        if (!getDataviewPlugin(false)) {
            return ExtendedGraphInstances.app.metadataCache.getFrontmatterPropertyValuesForKey(key);
        }
    }
}