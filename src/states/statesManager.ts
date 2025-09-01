import { Notice } from "obsidian";
import { GraphPlugin, GraphView, LocalGraphView } from "obsidian-typings";
import {
    cleanFilename,
    DEFAULT_STATE_ID,
    EngineOptions,
    ExtendedGraphSettings,
    FOLDER_KEY,
    getAllConfigFiles,
    getEngine,
    GraphInstances,
    GraphState,
    GraphStateData,
    GraphStateModal,
    InteractiveManager,
    InteractiveUI,
    ExtendedGraphInstances,
    SettingQuery,
    t,
    validateFilename
} from "../internal";



export class StatesManager {
    cacheStatesConfigs: { [stateID: string]: { filepath: string, settings: ExtendedGraphSettings } } = {};

    constructor() {
        this.mapStatesConfig();
    }

    // ================================ GETTERS ================================

    getStateDataById(id: string): GraphStateData | undefined {
        return ExtendedGraphInstances.settings.states.find(v => v.id === id);
    }

    // ============================= CREATE STATE ==============================

    /**
     * Creates a new state with the specified name from the current graph.
     * @param graph - The current graph.
     * @param name - The name of the new state.
     * @returns string - The ID of the new state.
     */
    newState(instances: GraphInstances, name: string): string {
        const state = new GraphState(name);
        state.setID();
        state.saveGraph(instances);
        this.onStateNeedsSaving(state.data);
        this.saveConfigForState(instances, state);
        return state.data.id;
    }

    // ============================= CHANGE STATE ==============================

    changeState(instances: GraphInstances, id: string) {
        let stateData = this.getStateDataById(id);
        if (!stateData) return;

        // If the config has changed, we need to reset the plugin in order to restart with all the correct settings
        const config = this.getConfig(id);
        if (ExtendedGraphInstances.settings.saveConfigsWithState && !ExtendedGraphInstances.graphsManager.isResetting.get(instances.view.leaf.id) && config) {
            if (SettingQuery.needReload(instances.settings, config, instances.type)) {
                ExtendedGraphInstances.graphsManager.resetPlugin(instances.view, true, id);
                return;
            }
            else {
                instances.settings = config;
            }
        }

        stateData = this.validateStateData(stateData);

        instances.stateData = stateData;

        if (instances.graphEventsDispatcher.lastFilteringAction)
            instances.graphEventsDispatcher.lastFilteringAction.record = false;

        setTimeout(() => {
            this.updateInteractiveManagers(stateData, instances);
            if (stateData.engineOptions) {
                instances.colorGroupHaveChanged = stateData.engineOptions.colorGroups !== instances.engine.options.colorGroups;
                instances.engine.setOptions(stateData.engineOptions);
                for (const node of instances.renderer.nodes) {
                    node.fontDirty = true;
                }
            }

            instances.layersManager?.setCurrentLevel(stateData.currentLayerLevel ?? 0, false);

            instances.legendUI?.updateUIFromState();

            instances.statePinnedNodes = structuredClone(stateData.pinNodes) ?? {};

            if (instances.statesUI.currentStateID === id && instances.graphEventsDispatcher.lastFilteringAction) {
                instances.graphEventsDispatcher.lastFilteringAction.record = true;
            }
        }, 200)
    }

    private validateStateData(stateData: GraphStateData): GraphStateData {
        const state = new GraphState(stateData.name);
        const hasChanged = state.saveState(stateData);
        if (hasChanged) {
            this.onStateNeedsSaving(state.data);
        }
        return state.data;
    }

    private updateInteractiveManagers(stateData: GraphStateData, instance: GraphInstances): void {
        this.updateManagers(stateData, instance.nodesSet.managers, instance.legendUI);
        this.updateManagers(stateData, instance.linksSet.managers, instance.legendUI);
        if (instance.foldersSet) this.updateManagers(stateData, instance.foldersSet.managers, instance.foldersUI);
    }

    private updateManagers(stateData: GraphStateData, managers: Map<string, InteractiveManager>, interactiveUI: InteractiveUI | null): void {
        for (const [key, manager] of managers) {
            if (!ExtendedGraphInstances.settings.interactiveSettings[key].hasOwnProperty('enableByDefault')) {
                ExtendedGraphInstances.settings.interactiveSettings[key].enableByDefault = key !== FOLDER_KEY;
                ExtendedGraphInstances.plugin.saveSettings();
            }
            const enableByDefault = ExtendedGraphInstances.settings.interactiveSettings[key].enableByDefault;
            this.loadStateForInteractiveManager(manager, stateData);
            if (interactiveUI && stateData.toggleTypes) {
                if (enableByDefault) interactiveUI.enableAllUI(key);
                else interactiveUI.disableAllUI(key);
                if (stateData.toggleTypes.hasOwnProperty(key)) {
                    for (const type of stateData.toggleTypes[key]) {
                        if (enableByDefault) interactiveUI.disableUI(key, type);
                        else interactiveUI.enableUI(key, type);
                    }
                }
            }
        }
    }

    private loadStateForInteractiveManager(manager: InteractiveManager, stateData: GraphStateData): void {
        if (!stateData.toggleTypes) return;
        const enableByDefault = ExtendedGraphInstances.settings.interactiveSettings[manager.name].enableByDefault;
        const stateTypesToToggle: string[] = stateData.toggleTypes[manager.name] ?? [];
        const toDisable: string[] = [];
        const toEnable: string[] = [];
        manager.getTypes().forEach(type => {
            const interactive = manager.interactives.get(type);
            if (!interactive) return;
            // Type should be toggled (not default)
            if ((enableByDefault === interactive.isActive) && stateTypesToToggle.includes(type)) {
                interactive.isActive = !enableByDefault;
                if (enableByDefault) toDisable.push(type);
                else toEnable.push(type);
            }
            // Type should be default
            else if ((enableByDefault !== interactive.isActive) && !stateTypesToToggle.includes(type)) {
                interactive.isActive = enableByDefault;
                if (enableByDefault) toEnable.push(type);
                else toDisable.push(type);
            }
        });

        if (toDisable.length > 0) manager.instances.interactiveEventsDispatcher.onInteractivesDisabled(manager.name, toDisable);
        if (toEnable.length > 0) manager.instances.interactiveEventsDispatcher.onInteractivesEnabled(manager.name, toEnable);
    }

    // ============================== SAVE STATE ===============================

    /**
     * Saves the current graph in the state with the specified ID.
     * @param graph - The current graph.
     * @param id - The ID of the state to save.
     */
    async saveState(instances: GraphInstances, id: string): Promise<void> {
        if (id === DEFAULT_STATE_ID) return;
        const stateData = ExtendedGraphInstances.settings.states.find(v => v.id == id);
        if (!stateData) return;
        const state = new GraphState(stateData.name);
        state.saveState(stateData);
        state.setID(id);
        state.saveGraph(instances);
        await this.onStateNeedsSaving(state.data);
        this.saveConfigForState(instances, state);
    }

    async saveConfigForState(instances: GraphInstances, state: GraphState) {
        if (!instances.settings.saveConfigsWithState) return;

        let filename = cleanFilename(state.data.name);
        if (!validateFilename(filename, false)) filename = "state_" + state.data.id;
        const filepath = ExtendedGraphInstances.configurationDirectory + "/" + filename + ".json";
        ExtendedGraphInstances.plugin.exportSettings(filepath, instances.settings, state);
        this.cacheStatesConfigs[state.data.id] = {
            filepath: filepath,
            settings: await (() => {
                return ExtendedGraphInstances.plugin.loadConfigFile(filepath).then(
                    config => {
                        delete config["stateID"];
                        return config;
                    }
                )
            })(),
        }
    }

    async onStateNeedsSaving(stateData: GraphStateData, notice: boolean = false): Promise<void> {
        this.updateStateArray(stateData);
        await ExtendedGraphInstances.plugin.saveSettings().then(() => {
            if (notice) new Notice(`${t("plugin.name")}: ${t("notices.stateSaved")} (${stateData.name})`);
            this.updateAllStates();
        });
    }

    async saveForDefaultState(view: GraphView | LocalGraphView): Promise<void> {
        const stateData = this.getStateDataById(DEFAULT_STATE_ID);
        if (!stateData) return;
        const engine = getEngine(view);
        if (!engine) return;
        stateData.engineOptions = new EngineOptions(engine.getOptions());
        await this.onStateNeedsSaving(stateData, true);
    }

    saveForNormalState(view: GraphView | LocalGraphView) {
        const coreGraph = (ExtendedGraphInstances.app.internalPlugins.getPluginById("graph") as GraphPlugin).instance;

        const engine = getEngine(view);
        if (!engine) {
            return;
        }
        coreGraph.options = engine.getOptions();
        coreGraph.saveOptions();
        ExtendedGraphInstances.graphsManager.backupOptions(view);
        new Notice(t("notices.normalStateSave"));
    }

    // ============================= UPDATE STATE ==============================

    private updateStateArray(stateData: GraphStateData): void {
        const index = ExtendedGraphInstances.settings.states.findIndex(v => v.name === stateData.name);
        if (index >= 0) {
            ExtendedGraphInstances.settings.states[index] = stateData;
        }
        else {
            ExtendedGraphInstances.settings.states.push(stateData);
        }
    }

    private updateAllStates(): void {
        ExtendedGraphInstances.graphsManager.allInstances.forEach(instances => {
            instances.statesUI.updateStatesList();
        });
    }

    renameState(id: string, newName: string): void {
        const stateData = this.getStateDataById(id);
        if (!stateData || stateData.name === newName) return;
        stateData.name = newName;
        ExtendedGraphInstances.plugin.saveSettings().then(() => {
            new Notice(`${t("plugin.name")}: ${t("notices.stateRenamed")} (${newName})`);
            this.updateAllStates();
        });
    }

    // ============================= DELETE STATE ==============================

    /**
     * Deletes the state with the specified ID.
     * @param id - The ID of the state to delete.
     */
    deleteState(id: string): void {
        if (id === DEFAULT_STATE_ID) return;
        const state = this.getStateDataById(id);
        if (!state) return;
        ExtendedGraphInstances.settings.states.remove(state);
        ExtendedGraphInstances.plugin.saveSettings().then(() => {
            new Notice(`${t("plugin.name")}: ${t("notices.stateDeleted")} (${state.name})`);
            this.updateAllStates();
        });
        delete this.cacheStatesConfigs[id];
    }

    // ============================= DISPLAY STATE =============================

    showGraphState(view: GraphView | LocalGraphView): void {
        const instances = ExtendedGraphInstances.graphsManager.allInstances.get(view.leaf.id);
        if (!instances) return;
        const modal = new GraphStateModal(instances);
        modal.open();
    }

    // ================================ CONFIGS ================================

    private async mapStatesConfig(): Promise<void> {
        const configFiles = await getAllConfigFiles();

        for (const file of configFiles) {
            this.cacheConfig(file);
        }
    }

    async cacheConfig(filepath: string) {
        const stateIDs = ExtendedGraphInstances.settings.states.map(state => state.id);
        const importedSettings = await ExtendedGraphInstances.plugin.loadConfigFile(filepath);

        if (importedSettings.stateID && stateIDs.contains(importedSettings.stateID)) {
            this.cacheStatesConfigs[importedSettings.stateID] = {
                filepath: filepath,
                settings: await (() => {
                    return ExtendedGraphInstances.plugin.loadConfigFile(filepath).then(
                        config => {
                            delete config["stateID"];
                            return config
                        }
                    )
                })(),
            };
        }
    }

    hasConfig(stateID: string): boolean {
        return stateID in this.cacheStatesConfigs;
    }

    getConfig(stateID: string): ExtendedGraphSettings | undefined {
        return this.cacheStatesConfigs[stateID]?.settings;
    }

    getStateFromConfig(filepath: string): string | undefined {
        return Object.keys(this.cacheStatesConfigs).find(stateID => this.cacheStatesConfigs[stateID].filepath === filepath);
    }
}