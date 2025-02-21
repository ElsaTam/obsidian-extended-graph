import { Component, ExtraButtonComponent } from "obsidian";
import { GraphView, LocalGraphView } from "obsidian-typings";
import { PluginInstances, setPluginIcon } from "src/internal";
import STRINGS from "src/Strings";

export class MenuUI extends Component {
    viewContent: HTMLElement;
    view: GraphView | LocalGraphView;

    graphControlsEl: HTMLDivElement;
    buttonEnable: ExtraButtonComponent;
    buttonReset: ExtraButtonComponent;
    enabled: boolean;

    constructor(view: GraphView | LocalGraphView) {
        super();
        this.view = view;
        this.viewContent = this.view.containerEl.getElementsByClassName("view-content")[0] as HTMLElement;
        this.graphControlsEl = this.viewContent.querySelector(".graph-controls") as HTMLDivElement;

        const hr = this.graphControlsEl.createEl("hr");
        hr.addClass("separator-exended-graph");
        this.createEnableButton();
        this.createResetButton();
    }

    createEnableButton() {
        this.buttonEnable = new ExtraButtonComponent(this.graphControlsEl)
            .setTooltip(`${STRINGS.controls.enable} ${STRINGS.plugin.name}`, {placement: 'top'})
            //.setIcon("sparkles")
            .onClick(() => {
                if (!this.enabled) {
                    PluginInstances.graphsManager.enablePlugin(this.view);
                } else {
                    PluginInstances.graphsManager.disablePlugin(this.view);
                }
            })
            .then(cb => {
                setPluginIcon(cb.extraSettingsEl);
                cb.extraSettingsEl.addClasses(["graph-controls-button", "mod-extended-graph-toggle"]);
            });
    }

    createResetButton() {
        this.buttonReset = new ExtraButtonComponent(this.graphControlsEl)
            .setTooltip(STRINGS.controls.resetGraph)
            .setIcon("rotate-ccw")
            .onClick(() => {
                if (this.enabled) {
                    PluginInstances.graphsManager.resetPlugin(this.view);
                }
            })
            .then(cb => {
                cb.extraSettingsEl.addClasses(["graph-controls-button", "mod-extended-graph-reset"]);
                cb.extraSettingsEl.remove();
            });
    }

    setEnableUIState() {
        this.enabled = true;
        this.buttonEnable.extraSettingsEl.addClass("is-active");
        this.buttonEnable.setTooltip(`${STRINGS.controls.disable} ${STRINGS.plugin.name}`, {placement: 'top'});
        this.graphControlsEl.insertAfter(this.buttonReset.extraSettingsEl, this.buttonEnable.extraSettingsEl);
    }

    setDisableUIState() {
        this.enabled = false;
        this.buttonEnable.extraSettingsEl.removeClass("is-active");
        this.buttonEnable.setTooltip(`${STRINGS.controls.enable} ${STRINGS.plugin.name}`, {placement: 'top'});
        this.buttonReset.extraSettingsEl.remove();
    }
}