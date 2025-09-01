import { ButtonComponent, Component, ExtraButtonComponent, setIcon, Setting } from "obsidian";
import * as Color from '../colors/color-bits';
import {
    CombinationLogic,
    FOLDER_KEY,
    GraphInstances,
    GraphStateData,
    GraphStateDataQuery,
    InteractiveManager,
    InteractiveUI,
    makeCompatibleForClass,
    ExtendedGraphInstances,
    strCompare,
    t,
    textColor,
    CSSBridge
} from "../internal";

class LegendRow extends Setting {
    name: string;
    isVisible: boolean = true;
    isCollapsed: boolean = false;
    andButton: ButtonComponent;
    orButton: ButtonComponent;
    disableAllButton: ExtraButtonComponent;
    enableAllButton: ExtraButtonComponent;
    cssBGColorVariable: string;
    cssTextColorVariable: string;
    logic: CombinationLogic;
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
                cb.setIcon("x")
                    .setTooltip(t("controls.disableAll") + ": " + this.name)
                    .onClick(() => {
                        this.disableAll();
                    });
            })
            .addExtraButton(cb => {
                this.enableAllButton = cb;
                cb.setIcon("check-check")
                    .setTooltip(t("controls.enableAll") + ": " + this.name)
                    .onClick(() => {
                        this.enableAll();
                    })
                    .then(cb => {
                        this.enableAllButton.extraSettingsEl.remove();
                    });
            })
            .then(cb => {
                const andOrDiv = createDiv("and-or-group");
                this.andButton = new ButtonComponent(andOrDiv)
                    .setButtonText(t("query.AND"))
                    .setTooltip(t("query.ANDFilterDesc"))
                    .onClick(() => this.changeCombinationLogic("AND"));
                this.orButton = new ButtonComponent(andOrDiv)
                    .setButtonText(t("query.OR"))
                    .setTooltip(t("query.ORFilterDesc"))
                    .onClick(() => this.changeCombinationLogic("OR"));
                (GraphStateDataQuery.getLogicType(this.manager.instances, this.name) === "AND") ? this.andButton.setCta() : this.orButton.setCta();
                this.controlEl.insertAdjacentElement("afterbegin", andOrDiv);
            })
            .setClass(`${this.getClassName(name)}s-row`);

        this.nameEl.addClass("mod-clickable");
        this.nameEl.onclick = () => {
            this.toggleCollapse();
        };
        const chevron = this.nameEl.createSpan();
        setIcon(chevron, "chevron-down");
    }

    private getClassName(type: string): string {
        return "graph-legend-" + makeCompatibleForClass(type);
    }

    private changeCombinationLogic(logic: CombinationLogic) {
        if (this.logic === logic) return;

        const stateData = this.manager.instances.stateData;
        if (stateData) {
            if (!stateData.logicTypes) {
                stateData.logicTypes = {};
            }
            stateData.logicTypes[this.name] = logic;
            this.manager.instances.engine.render();
            this.manager.instances.interactiveEventsDispatcher.onInteractivesLogicChanged(this.name);
            ExtendedGraphInstances.statesManager.onStateNeedsSaving(stateData, false);
        }

        this.changeCombinationLogicUI(logic);
    }

    changeCombinationLogicUI(logic: CombinationLogic) {
        this.logic = logic;
        if (logic === "AND") {
            this.andButton.setCta();
            this.orButton.removeCta();
        }
        else {
            this.orButton.setCta();
            this.andButton.removeCta();
        }
    }

    addLegend(type: string, color: Color.Color): void {
        const button = this.controlEl.getElementsByClassName(this.getClassName(type))[0];
        if (button) return;
        this.addButton(cb => {
            cb.setClass(this.getClassName(type))
                .setTooltip(type)
                .setClass("graph-legend")
                .setButtonText(type)
                .onClick(() => {
                    this.toggle(type);
                })
                .then(cb => {
                    cb.buttonEl.style.setProperty(this.cssBGColorVariable, CSSBridge.getCSSSplitRGB(color));
                    cb.buttonEl.style.setProperty(this.cssTextColorVariable, textColor(color));
                    if (type === this.manager.instances.settings.interactiveSettings[this.name].noneType) {
                        cb.buttonEl.addClass("graph-legend-none");
                    }
                });
        })

        const sortByName = function (a: HTMLButtonElement, b: HTMLButtonElement) {
            return strCompare(b.className.replace("graph-legend", ""), a.className.replace("graph-legend", ""));
        };

        const sortedChildren = Array.from(this.controlEl.getElementsByClassName("graph-legend")).sort(sortByName);
        for (let i = sortedChildren.length - 1; i >= 0; i--) {
            this.controlEl.appendChild(sortedChildren[i]);
        }
    }

    updateLegend(type: string, color: Color.Color): void {
        const button = this.controlEl.getElementsByClassName(this.getClassName(type))[0];
        if (!button) {
            this.addLegend(type, color)
        }
        else {
            (button as HTMLElement).style.setProperty(this.cssBGColorVariable, CSSBridge.getCSSSplitRGB(color));
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
                this.disableAllButton.extraSettingsEl.insertAdjacentElement('afterend', this.enableAllButton.extraSettingsEl);
                this.disableAllButton.extraSettingsEl.remove();
            }
        }
        else {
            this.enableUI(type);
            this.manager.enable([type]);
            const allAreEnabled = !this.manager.getTypes().some(t => !this.manager.isActive(t));
            if (allAreEnabled) {
                this.enableAllButton.extraSettingsEl.insertAdjacentElement('afterend', this.disableAllButton.extraSettingsEl);
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
        for (const type of this.manager.getTypes()) {
            this.disableUI(type);
        }
        this.manager.disable(this.manager.getTypes());
        this.disableAllButton.extraSettingsEl.insertAdjacentElement('afterend', this.enableAllButton.extraSettingsEl);
        this.disableAllButton.extraSettingsEl.remove();
    }

    enableAll() {
        for (const type of this.manager.getTypes()) {
            this.enableUI(type);
        }
        this.manager.enable(this.manager.getTypes());
        this.enableAllButton.extraSettingsEl.insertAdjacentElement('afterend', this.disableAllButton.extraSettingsEl);
        this.enableAllButton.extraSettingsEl.remove();
    }

    toggleVisibility() {
        if (this.isVisible) this.hide();
        else this.show();
    }

    show() {
        this.settingEl.removeClass("is-hidden");
        this.isVisible = true;
    }

    hide() {
        this.settingEl.addClass("is-hidden");
        this.isVisible = false;
    }

    toggleCollapse() {
        if (this.isCollapsed) this.expend();
        else this.collapse();

        const stateData = ExtendedGraphInstances.statesManager.getStateDataById(this.manager.instances.settings.startingStateID);
        if (stateData) {
            if (this.isCollapsed) {
                if (!stateData.collapsedLegendRows) {
                    stateData.collapsedLegendRows = [];
                }
                stateData.collapsedLegendRows?.push(this.name);
            }
            else {
                stateData.collapsedLegendRows?.remove(this.name);
            }
        }

        if (stateData) ExtendedGraphInstances.statesManager.onStateNeedsSaving(stateData, false);
    }

    collapse() {
        this.settingEl.addClass("is-collapsed");
        this.isCollapsed = true;
    }

    expend() {
        this.settingEl.removeClass("is-collapsed");
        this.isCollapsed = false;
    }
}

interface RowData {
    row: LegendRow;
    visibilityButton: {
        cb: ButtonComponent;
        eyeIcon: HTMLElement;
    };
}

export class LegendUI extends Component implements InteractiveUI {
    instances: GraphInstances;

    legendRows: Map<string, RowData>;

    isOpen: boolean;

    root: HTMLDivElement;
    rowsDiv: HTMLDivElement;
    toggleButton: ExtraButtonComponent;

    constructor(instances: GraphInstances) {
        super();
        this.instances = instances;

        this.createToggleButton();
        this.createRootPanel();
    }

    private createToggleButton() {
        const graphControls = this.instances.view.contentEl.querySelector(".graph-controls") as HTMLDivElement;
        this.toggleButton = new ExtraButtonComponent(graphControls)
            .setTooltip(t("controls.openLegend"))
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
    }

    private createRootPanel() {
        this.legendRows = new Map<string, RowData>();

        this.root = this.instances.view.contentEl.createDiv("graph-legend-container");
        if (this.instances.settings.horizontalLegend) this.root.addClass("horizontal-layout");
        this.rowsDiv = this.root.createDiv("graph-legend-rows");
        const hideRowsContainer = createDiv("graph-legend-hide-rows-container");
        const stateData = ExtendedGraphInstances.statesManager.getStateDataById(this.instances.settings.startingStateID);

        for (const [key, manager] of this.instances.interactiveManagers) {
            if (key === FOLDER_KEY) continue;

            const legendRow = new LegendRow(key, manager, this.rowsDiv);

            const eyeIcon = createSpan();
            setIcon(eyeIcon, "eye");

            const hideRowButton = new ButtonComponent(hideRowsContainer);

            const row = { row: legendRow, visibilityButton: { cb: hideRowButton, eyeIcon: eyeIcon } };
            this.legendRows.set(key, row);

            hideRowButton.setButtonText(key)
                .setTooltip(t("controls.hideRow") + ": " + key, { placement: 'top' })
                .onClick(() => {
                    this.toggleVisibility(row, stateData);
                })
                .then(cb => {
                    row.visibilityButton = {
                        cb: cb,
                        eyeIcon: eyeIcon
                    };
                    cb.buttonEl.prepend(eyeIcon);
                });


            if (stateData?.hiddenLegendRows?.contains(key)) {
                row.row.hide();
            }
            if (stateData?.collapsedLegendRows?.contains(key)) {
                row.row.collapse();
            }
        }

        this.root.appendChild(hideRowsContainer);

        if (ExtendedGraphInstances.settings.collapseLegend) {
            this.close();
        }
        else {
            this.open();
        }
    }

    private toggleVisibility(row: RowData, stateData: GraphStateData | undefined) {
        row.row.toggleVisibility();

        row.visibilityButton.cb.buttonEl.toggleClass("is-inactive", !row.row.isVisible);
        setIcon(row.visibilityButton.eyeIcon, row.row.isVisible ? "eye" : "eye-off");
        if (stateData) {
            if (row.row.isVisible) {
                stateData.hiddenLegendRows?.remove(row.row.name);
            }
            else {
                if (!stateData.hiddenLegendRows) {
                    stateData.hiddenLegendRows = [];
                }
                stateData.hiddenLegendRows?.push(row.row.name);
            }
            ExtendedGraphInstances.statesManager.onStateNeedsSaving(stateData, false);
        }
    }

    onunload(): void {
        this.root.remove();
        this.toggleButton.extraSettingsEl.remove();
    }

    update(row: string, type: string, color: Color.Color) {
        this.legendRows.get(row)?.row.updateLegend(type, color);
    }

    add(row: string, type: string, color: Color.Color) {
        this.legendRows.get(row)?.row.addLegend(type, color);
    }

    remove(row: string, types: Set<string> | string[]) {
        this.legendRows.get(row)?.row.removeLegend(types);
    }

    toggle(row: string, type: string) {
        this.legendRows.get(row)?.row.toggle(type);
    }

    disableUI(row: string, type: string) {
        this.legendRows.get(row)?.row.disableUI(type);
    }

    enableUI(row: string, type: string) {
        this.legendRows.get(row)?.row.enableUI(type);
    }

    enableAllUI(row: string) {
        this.legendRows.get(row)?.row.manager.getTypes().forEach(type => {
            this.legendRows.get(row)?.row.enableUI(type);
        })
    }

    disableAllUI(row: string) {
        this.legendRows.get(row)?.row.manager.getTypes().forEach(type => {
            this.legendRows.get(row)?.row.disableUI(type);
        })
    }

    updateUIFromState() {
        if (!this.instances.stateData) return;

        if (this.instances.stateData.hiddenLegendRows) {
            for (const [key, row] of this.legendRows) {
                if (this.instances.stateData.hiddenLegendRows.includes(key)) {
                    row.row.hide();
                    row.visibilityButton.cb.buttonEl.addClass("is-inactive");
                    setIcon(row.visibilityButton.eyeIcon, "eye-off");
                } else {
                    row.row.show();
                    row.visibilityButton.cb.buttonEl.removeClass("is-inactive");
                    setIcon(row.visibilityButton.eyeIcon, "eye");
                }
            }
        }
        if (this.instances.stateData.collapsedLegendRows) {
            for (const [key, row] of this.legendRows) {
                if (this.instances.stateData.collapsedLegendRows.includes(key)) {
                    row.row.collapse();
                } else {
                    row.row.expend();
                }
            }
        }
        for (const [key, row] of this.legendRows) {
            row.row.changeCombinationLogicUI(GraphStateDataQuery.getLogicType(this.instances, key));
        }
    }

    open() {
        this.root.removeClass("is-closed");
        this.toggleButton.extraSettingsEl.addClass("is-active");
        this.isOpen = true;
        ExtendedGraphInstances.settings.collapseLegend = false;
        ExtendedGraphInstances.plugin.saveSettings();
    }

    close() {
        this.root.addClass("is-closed");
        this.toggleButton.extraSettingsEl.removeClass("is-active");
        this.isOpen = false;
        ExtendedGraphInstances.settings.collapseLegend = true;
        ExtendedGraphInstances.plugin.saveSettings();
    }
}