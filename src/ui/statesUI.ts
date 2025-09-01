import { Component, DropdownComponent, ExtraButtonComponent, Setting } from "obsidian";
import { DEFAULT_STATE_ID, NewNameModal, UIElements, ExtendedGraphInstances, GraphInstances, t } from "../internal";

export class StatesUI extends Component {
    instances: GraphInstances;

    currentStateID: string;

    isOpen: boolean;

    root: HTMLDivElement;
    stateSetting: Setting;
    settingsSetting: Setting;
    toggleButton: ExtraButtonComponent;
    selectState: DropdownComponent;
    saveButton: ExtraButtonComponent;
    addButton: ExtraButtonComponent;
    deleteButton: ExtraButtonComponent;
    editButton: ExtraButtonComponent;

    constructor(instances: GraphInstances) {
        super();
        this.instances = instances;
        this.root = this.instances.view.contentEl.createDiv();
        this.root.addClass("graph-states-container");

        // TOGGLE BUTTON
        const graphControls = this.instances.view.contentEl.querySelector(".graph-controls") as HTMLDivElement;
        this.toggleButton = new ExtraButtonComponent(graphControls)
            .setTooltip(t("states.openSettings"))
            .setIcon("eye")
            .onClick(() => {
                if (this.isOpen) {
                    this.close();
                }
                else {
                    this.open();
                }
            })
            .then(cb => {
                cb.extraSettingsEl.addClasses(["graph-controls-button", "mod-states"]);
            });

        this.addStateSetting();

        // CURRENT STATE ID
        this.currentStateID = this.selectState.getValue();
        this.instances.stateData = ExtendedGraphInstances.statesManager.getStateDataById(this.currentStateID);

        if (ExtendedGraphInstances.settings.collapseState) {
            this.close();
        }
        else {
            this.open();
        }
    }

    private addStateSetting() {
        this.stateSetting = new Setting(this.root)
            .setName(t("states.states"))
            .addDropdown(cb => {
                this.selectState = cb;
                cb.onChange(value => {
                    this.currentStateID = value;
                    this.instances.stateData = ExtendedGraphInstances.statesManager.getStateDataById(this.currentStateID);
                    this.displaySaveDeleteButton();
                    this.instances.graphEventsDispatcher.changeState(value);
                })
            })
            .addExtraButton(cb => {
                this.editButton = cb;
                UIElements.setupExtraButton(cb, 'edit');
                cb.onClick(() => {
                    this.editButton.extraSettingsEl.blur();
                    this.openModalToRenameState();
                });
            })
            .addExtraButton(cb => {
                this.addButton = cb;
                UIElements.setupExtraButton(cb, 'add');
                cb.onClick(() => {
                    this.addButton.extraSettingsEl.blur();
                    this.openModalToAddState();
                })
            })
            .addExtraButton(cb => {
                this.saveButton = cb;
                UIElements.setupExtraButton(cb, 'save');
                cb.onClick(() => {
                    ExtendedGraphInstances.statesManager.saveState(this.instances, this.selectState.getValue());
                });
            })
            .addExtraButton(cb => {
                this.deleteButton = cb;
                UIElements.setupExtraButton(cb, 'delete');
                cb.onClick(() => {
                    ExtendedGraphInstances.statesManager.deleteState(this.selectState.getValue());
                });
            });
    }

    onunload(): void {
        this.root.remove();
        this.toggleButton.extraSettingsEl.remove();
    }

    private openModalToAddState() {
        const modal = new NewNameModal(
            t("states.newStateName"),
            this.newState.bind(this)
        );
        modal.open();
    }

    private openModalToRenameState() {
        const stateData = this.instances.stateData;
        if (stateData) {
            const modal = new NewNameModal(
                t("states.editStateName"),
                this.renameState.bind(this),
                stateData.name
            );
            modal.open();
        }
    }

    private addOption(key: string, name: string): void {
        for (let i = 0; i < this.selectState.selectEl.length; ++i) {
            if (this.selectState.selectEl.options[i].value == key) {
                this.selectState.selectEl.options[i].innerText = name;
                return;
            }
        }
        this.selectState.addOption(key, name);
    }

    private addState(key: string, name: string) {
        this.addOption(key, name);
        this.selectState.setValue(key);
    }

    private newState(name: string): boolean {
        if (name.length === 0) return false;
        const id = ExtendedGraphInstances.statesManager.newState(this.instances, name);
        this.currentStateID = id;
        this.instances.stateData = ExtendedGraphInstances.statesManager.getStateDataById(this.currentStateID);
        return true;
    }

    private renameState(name: string): boolean {
        if (name.length === 0) return false;
        ExtendedGraphInstances.statesManager.renameState(this.currentStateID, name);
        return true;
    }

    updateStatesList(): void {
        this.clear();
        ExtendedGraphInstances.settings.states.forEach(state => {
            this.addOption(state.id, state.name);
        });
        if (ExtendedGraphInstances.settings.states.find(v => v.id === this.currentStateID)) {
            this.setValue(this.currentStateID);
        }
        else {
            this.currentStateID = this.selectState.getValue();
            this.instances.stateData = ExtendedGraphInstances.statesManager.getStateDataById(this.currentStateID);
            this.displaySaveDeleteButton();
        }
    }

    setValue(id: string) {
        this.currentStateID = id;
        this.instances.stateData = ExtendedGraphInstances.statesManager.getStateDataById(this.currentStateID);
        this.selectState.setValue(id);
        this.displaySaveDeleteButton();
    }

    private clear() {
        for (let i = this.selectState.selectEl.length; i >= 0; i--) {
            this.selectState.selectEl.remove(i);
        }
    }

    private displaySaveDeleteButton() {
        if (this.selectState.getValue() !== DEFAULT_STATE_ID) {
            this.stateSetting.settingEl.append(this.editButton.extraSettingsEl);
            this.stateSetting.settingEl.append(this.saveButton.extraSettingsEl);
            this.stateSetting.settingEl.append(this.deleteButton.extraSettingsEl);
        }
        else {
            this.editButton.extraSettingsEl.remove();
            this.saveButton.extraSettingsEl.remove();
            this.deleteButton.extraSettingsEl.remove();
        }
    }

    private open() {
        this.root.removeClass("is-closed");
        this.toggleButton.extraSettingsEl.addClass("is-active");
        this.isOpen = true;
        ExtendedGraphInstances.settings.collapseState = false;
        ExtendedGraphInstances.plugin.saveSettings();
    }

    private close() {
        this.root.addClass("is-closed");
        this.toggleButton.extraSettingsEl.removeClass("is-active");
        this.isOpen = false;
        ExtendedGraphInstances.settings.collapseState = true;
        ExtendedGraphInstances.plugin.saveSettings();
    }
}