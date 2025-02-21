import { Component, ExtraButtonComponent, Setting } from "obsidian";
import { FOLDER_KEY, GraphInstances, InteractiveManager, InteractiveUI, PluginInstances, TAG_KEY, textColor } from "src/internal";
import STRINGS from "src/Strings";

class LegendRow extends Setting {
    name: string;
    disableAllButton: ExtraButtonComponent;
    enableAllButton: ExtraButtonComponent;
    cssBGColorVariable: string;
    cssTextColorVariable: string;
    manager: InteractiveManager;

    constructor(name: string, manager: InteractiveManager, containerEl: HTMLElement) {
        super(containerEl);
        this.name = name;
        this.manager = manager;
        this.cssBGColorVariable = "--legend-color-rgb";
        this.cssTextColorVariable = "--legend-text-color";

        this.setName(this.name)
            .setTooltip(this.name)
            .addExtraButton(cb => {
                this.disableAllButton = cb;
                cb.setIcon("copy")
                    .setTooltip(STRINGS.controls.disableAll + ": " + this.name)
                    .onClick(() => {
                        this.disableAll();
                    });
            })
            .addExtraButton(cb => {
                this.enableAllButton = cb;
                cb.setIcon("copy-check")
                    .setTooltip(STRINGS.controls.enableAll + ": " + this.name)
                    .onClick(() => {
                        this.enableAll();
                    })
                    .then(cb => {
                        this.enableAllButton.extraSettingsEl.remove();
                    });
            })
            .setClass(`graph-legend-${name}s-row`);
    }

    private getClassName(type: string): string {
        return "graph-legend-" + type.replace(" ", "-");
    }

    addLegend(type: string, color: Uint8Array): void {
        const button = this.controlEl.getElementsByClassName(this.getClassName(type))[0];
        if (button) return;
        this.addButton(cb => {
            cb.setClass(this.getClassName(type))
                .setClass("graph-legend")
                .setButtonText(type)
                .onClick(() => {
                    this.toggle(type);
                })
                .then(cb => {
                    cb.buttonEl.style.setProperty(this.cssBGColorVariable, `${color[0]}, ${color[1]}, ${color[2]}`);
                    cb.buttonEl.style.setProperty(this.cssTextColorVariable, textColor(color));
                    if (type === this.manager.instances.settings.interactiveSettings[this.name].noneType) {
                        cb.buttonEl.addClass("graph-legend-none");
                    }
                });
        })

        const sortByName = function(a: HTMLButtonElement, b: HTMLButtonElement) {
            return b.className.replace("graph-legend", "").toLowerCase().localeCompare(a.className.replace("graph-legend", "").toLowerCase());
        };
    
        const sortedChildren = Array.from(this.controlEl.getElementsByClassName("graph-legend")).sort(sortByName);
        for (let i = sortedChildren.length-1; i >= 0; i--) {
            this.controlEl.appendChild(sortedChildren[i]);
        }
    }

    updateLegend(type: string, color: Uint8Array): void {
        const button = this.controlEl.getElementsByClassName(this.getClassName(type))[0];
        if (!button) {
            this.addLegend(type, color)
        }
        else {
            (button as HTMLElement).style.setProperty(this.cssBGColorVariable, `${color[0]}, ${color[1]}, ${color[2]}`);
            (button as HTMLElement).style.setProperty(this.cssTextColorVariable, textColor(color));
        }
    }

    removeLegend(types: Set<string> | string[]) {
        types.forEach(type => {
            const button = this.controlEl.getElementsByClassName(this.getClassName(type))[0];
            button?.parentNode?.removeChild(button);
        })
    }

    toggle(type: string) {
        const interactive = this.manager.interactives.get(type);
        if (!interactive) return;

        if (interactive.isActive) {
            this.disableUI(type);
            this.manager.disable([type]);
            const allAreDisabled = !this.manager.getTypes().some(t => this.manager.isActive(t));
            if (allAreDisabled) {
                this.disableAllButton.extraSettingsEl.remove();
                this.controlEl.insertAdjacentElement('afterbegin', this.enableAllButton.extraSettingsEl);
            }
        }
        else {
            this.enableUI(type);
            this.manager.enable([type]);
            const allAreEnabled = !this.manager.getTypes().some(t => !this.manager.isActive(t));
            if (allAreEnabled) {
                this.controlEl.insertAdjacentElement('afterbegin', this.disableAllButton.extraSettingsEl);
                this.enableAllButton.extraSettingsEl.remove();
            }
        }
    }

    disableUI(type: string) {
        const button = this.controlEl.getElementsByClassName(this.getClassName(type))[0];
        if (button) button.addClass("is-hidden");
    }

    enableUI(type: string) {
        const button = this.controlEl.getElementsByClassName(this.getClassName(type))[0];
        if (button) button.removeClass("is-hidden");
    }

    disableAll() {
        for(const type of this.manager.getTypes()) {
            this.disableUI(type);
        }
        this.manager.disable(this.manager.getTypes());
        this.disableAllButton.extraSettingsEl.remove();
        this.controlEl.insertAdjacentElement('afterbegin', this.enableAllButton.extraSettingsEl);
    }

    enableAll() {
        for(const type of this.manager.getTypes()) {
            this.enableUI(type);
        }
        this.manager.enable(this.manager.getTypes());
        this.controlEl.insertAdjacentElement('afterbegin', this.disableAllButton.extraSettingsEl);
        this.enableAllButton.extraSettingsEl.remove();
    }
}

export class LegendUI extends Component implements InteractiveUI {
    instances: GraphInstances;

    viewContent: HTMLElement;
    legendRows: Map<string, LegendRow>;

    isOpen: boolean;
    
    root: HTMLDivElement;
    toggleButton: ExtraButtonComponent;

    constructor(instances: GraphInstances) {
        super();
        this.instances = instances;
        this.viewContent = instances.view.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
    
        // TOGGLE BUTTON
        const graphControls = this.viewContent.querySelector(".graph-controls") as HTMLDivElement;
        this.toggleButton = new ExtraButtonComponent(graphControls)
            .setTooltip(STRINGS.controls.openLegend)
            .setIcon("tags")
            .onClick(() => {
                if (this.isOpen) {
                    this.close();
                }
                else {
                    this.open();
                }
            })
            .then(cb => {
                cb.extraSettingsEl.addClasses(["graph-controls-button", "mod-legend"]);
            });

        this.legendRows = new Map<string, LegendRow>();
        this.root = this.viewContent.createDiv();
        this.root?.addClass("graph-legend-container");
        for (const [key, manager] of this.instances.interactiveManagers) {
            if (key === FOLDER_KEY) continue;
            if (manager) this.legendRows.set(key, new LegendRow(key, manager, this.root));
        }

        if (PluginInstances.settings.collapseLegend) {
            this.close();
        }
        else {
            this.open();
        }
    }

    onunload(): void {
        this.root.remove();
        this.toggleButton.extraSettingsEl.remove();
    }

    update(row: string, type: string, color: Uint8Array) {
        this.legendRows.get(row)?.updateLegend(type, color);
    }

    add(row: string, type: string, color: Uint8Array) {
        this.legendRows.get(row)?.addLegend(type, color);
    }

    remove(row: string, types: Set<string> | string[]) {
        this.legendRows.get(row)?.removeLegend(types);
    }

    toggle(row: string, type: string) {
        this.legendRows.get(row)?.toggle(type);
    }

    disableUI(row: string, type: string) {
        this.legendRows.get(row)?.disableUI(type);
    }

    enableUI(row: string, type: string) {
        this.legendRows.get(row)?.enableUI(type);
    }

    enableAllUI(row: string) {
        this.legendRows.get(row)?.manager.getTypes().forEach(type => {
            this.legendRows.get(row)?.enableUI(type);
        })
    }

    disableAllUI(row: string) {
        this.legendRows.get(row)?.manager.getTypes().forEach(type => {
            this.legendRows.get(row)?.disableUI(type);
        })
    }

    open() {
        this.root.removeClass("is-closed");
        this.toggleButton.extraSettingsEl.addClass("is-active");
        this.isOpen = true;
        PluginInstances.settings.collapseLegend = false;
        PluginInstances.plugin.saveSettings();
    }

    close() {
        this.root.addClass("is-closed");
        this.toggleButton.extraSettingsEl.removeClass("is-active");
        this.isOpen = false;
        PluginInstances.settings.collapseLegend = true;
        PluginInstances.plugin.saveSettings();
    }
}