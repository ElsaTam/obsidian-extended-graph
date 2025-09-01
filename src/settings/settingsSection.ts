import { ExtraButtonComponent, setIcon, Setting } from "obsidian";
import { ExtendedGraphSettingTab, ExtendedGraphInstances, t } from "../internal";

export abstract class SettingsSection {
    settingTab: ExtendedGraphSettingTab;
    containerEl: HTMLElement;
    settingHeader: Setting;
    foldIcon: ExtraButtonComponent;
    elementsBody: HTMLElement[] = [];
    itemClasses: string[] = [];
    id: string;
    keyword: string;
    title: string;
    icon: string;
    description: string;
    isCollapsed: boolean = false;

    constructor(settingTab: ExtendedGraphSettingTab, id: string, keyword: string, title: string, icon: string, description: string) {
        this.settingTab = settingTab;
        this.containerEl = settingTab.containerEl;
        this.id = id;
        this.keyword = keyword;
        this.title = title;
        this.icon = icon;
        this.description = description;

        this.itemClasses.push(`setting-${this.id}`);
    }

    display() {
        this.elementsBody = [];

        this.addHeader();
        this.addBody();
        this.addToNav();

        if (this.id != 'property-key' && (!(this.id in ExtendedGraphInstances.settings.collapsedSettings) || ExtendedGraphInstances.settings.collapsedSettings[this.id])) {
            this.collapse();
        }

        this.elementsBody.forEach(el => {
            el.addClasses(this.itemClasses);
        });
    }

    protected addHeader(): void {
        this.settingHeader = new Setting(this.containerEl)
            .setName(this.title)
            .setHeading();

        if (this.icon && this.icon !== "") {
            this.settingHeader.then((setting) => {
                const iconEl = createDiv();
                setting.settingEl.prepend(iconEl);
                if (this.icon) {
                    setIcon(iconEl, this.icon);
                }
            });
        }

        this.foldIcon = new ExtraButtonComponent(this.settingHeader.nameEl)
            .setIcon("chevron-right")
            .onClick(() => {
                if (this.isCollapsed) this.expand();
                else this.collapse();
            })
            .then((btn) => {
                btn.extraSettingsEl.addClass("setting-header-fold-icon");
            });

        this.settingHeader.setDesc(this.description);

        this.settingHeader.settingEl.addClasses(this.itemClasses);
    }

    protected abstract addBody(): void;

    protected addToNav(): void {
        if (this.icon === "") return;
        const nav = this.settingTab.containerEl.querySelector(".extended-graph-nav-settings") as HTMLDivElement;
        if (!nav) return;

        const div = nav.createDiv();

        const button = new ExtraButtonComponent(div);
        button.setIcon(this.icon)
            .onClick(() => {
                this.settingHeader.settingEl.scrollIntoView();
            })
            .setTooltip(this.title);

        div.appendText(this.keyword);
    }

    protected collapse(): void {
        this.isCollapsed = true;
        this.settingHeader.settingEl.addClass('is-collapsed');
        ExtendedGraphInstances.settings.collapsedSettings[this.id] = true;
        ExtendedGraphInstances.plugin.saveSettings();
        this.onCollapse();
    }

    protected expand(): void {
        this.isCollapsed = false;
        this.settingHeader.settingEl.removeClass('is-collapsed');
        ExtendedGraphInstances.settings.collapsedSettings[this.id] = false;
        ExtendedGraphInstances.plugin.saveSettings();
        this.onExpand();
    }

    protected onCollapse(): void { }
    protected onExpand(): void { }
}