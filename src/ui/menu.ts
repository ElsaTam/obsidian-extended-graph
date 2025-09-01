import { Component, ExtraButtonComponent, setIcon } from "obsidian";
import { GraphView, LocalGraphView } from "obsidian-typings";
import { ExtendedGraphInstances, t } from "../internal";

export class MenuUI extends Component {
    view: GraphView | LocalGraphView;

    graphControlsEl: HTMLDivElement;
    buttonEnable: ExtraButtonComponent;
    buttonReset: ExtraButtonComponent;
    enabled: boolean;

    constructor(view: GraphView | LocalGraphView) {
        super();
        this.view = view;
        this.graphControlsEl = this.view.contentEl.querySelector(".graph-controls") as HTMLDivElement;
        this.graphControlsEl.addClass("graph-controls-extended-graph");

        const hr = this.graphControlsEl.createEl("hr");
        hr.addClass("separator-exended-graph");
        this.createEnableButton();
        this.createResetButton();
    }

    createEnableButton() {
        this.buttonEnable = new ExtraButtonComponent(this.graphControlsEl)
            .setTooltip(`${t("controls.enable")} ${t("plugin.name")}`, { placement: 'top' })
            //.setIcon("sparkles")
            .onClick(() => {
                if (!this.enabled) {
                    ExtendedGraphInstances.graphsManager.enablePlugin(this.view);
                } else {
                    ExtendedGraphInstances.graphsManager.disablePlugin(this.view);
                }
            })
            .then(cb => {
                setIcon(cb.extraSettingsEl, "git-fork-sparkles");
                cb.extraSettingsEl.addClasses(["graph-controls-button", "mod-extended-graph-toggle"]);
            });
    }

    createResetButton() {
        this.buttonReset = new ExtraButtonComponent(this.graphControlsEl)
            .setTooltip(t("controls.resetGraph"))
            .setIcon("rotate-ccw")
            .onClick(() => {
                if (this.enabled) {
                    ExtendedGraphInstances.graphsManager.resetPlugin(this.view);
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
        this.buttonEnable.setTooltip(`${t("controls.disable")} ${t("plugin.name")}`, { placement: 'top' });
        this.graphControlsEl.insertAfter(this.buttonReset.extraSettingsEl, this.buttonEnable.extraSettingsEl);
    }

    setDisableUIState() {
        this.enabled = false;
        this.buttonEnable.extraSettingsEl.removeClass("is-active");
        this.buttonEnable.setTooltip(`${t("controls.enable")} ${t("plugin.name")}`, { placement: 'top' });
        this.buttonReset.extraSettingsEl.remove();
    }

    enableUI() {
        this.buttonEnable.setDisabled(false);
        this.buttonReset.setDisabled(false);
    }

    disableUI() {
        this.buttonEnable.setDisabled(true);
        this.buttonReset.setDisabled(true);
    }
}