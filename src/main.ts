import { addIcon, getIcon, MarkdownView, normalizePath, Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import {
    addCommands,
    DEFAULT_SETTINGS,
    DEFAULT_STATE_ID,
    DEFAULT_STATE_SETTINGS,
    ExtendedGraphSettings,
    ExtendedGraphSettingTab,
    FOLDER_KEY,
    getGraphBannerClass,
    getGraphBannerPlugin,
    GraphsManager,
    GraphState,
    INVALID_KEYS,
    isGraphBannerLoaded,
    LINK_KEY,
    ExtendedGraphInstances,
    ProxysManager,
    rgb2hex,
    StatesManager,
    TAG_KEY
} from './internal';

// https://pixijs.download/v7.4.2/docs/index.html

export default class ExtendedGraphPlugin extends Plugin {

    // ================================ LOADING ================================

    async onload(): Promise<void> {
        await this.checkDataValidity();

        ExtendedGraphInstances.plugin = this;
        ExtendedGraphInstances.app = this.app;
        ExtendedGraphInstances.configurationDirectory = normalizePath(this.manifest.dir + "/configs/");
        ExtendedGraphInstances.proxysManager = new ProxysManager();
        await this.loadSettings();

        this.addIcons();

        this.initializeInvalidKeys();
        this.addSettingTab(new ExtendedGraphSettingTab(this));

        ExtendedGraphInstances.graphsManager = new GraphsManager();
        ExtendedGraphInstances.statesManager = new StatesManager();

        this.app.workspace.onLayoutReady(() => {
            this.loadGraphsManager();
            this.onLayoutChange();
        });

        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!isGraphBannerLoaded()) return;

                if (!file || file.extension !== "md") return;

                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!view || view.file !== file) return;

                this.onMarkdownViewOpen(view);
            }),
        );

        addCommands(this);
    }

    private addIcons(): void {
        const ratio = 100 / 24;
        addIcon("git-fork-sparkles", `<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" class="git-fork-sparkles"><circle cx="50" cy="76" r="12"/><circle cx="25" cy="25" r="12"/><circle cx="76" cy="25" r="12"/><path d="M76 36v8c0 2.4-1.6 4-4 4H28c-2.4 0-4-1.6-4-4V36"/><path d="M50 50v12"/><path d="m 82.03746,54.745552 v 16"/><path d="m 90.03746,62.745552  h -16"/><path d="m 72.5023,80.767008 v 8"/><path d="m 76.5023,84.767008 h -8"/><path d="m 14.7461264,54.15018 v 8"/><path d="m 18.7461264,58.15018 h -8"/></g>`);

        if (!getIcon("squares-unite")) {
            addIcon("squares-unite", `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-squares-unite" transform="scale(${ratio})"><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a1 1 0 0 0 1 1h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-3a1 1 0 0 0-1-1z"/></g>`);
        }
        if (!getIcon("squares-subtract")) {
            addIcon("squares-subtract", `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-squares-subtract" transform="scale(${ratio})"><path d="M10 22a2 2 0 0 1-2-2"/><path d="M16 22h-2"/><path d="M16 4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-5a2 2 0 0 1 2-2h5a1 1 0 0 0 1-1z"/><path d="M20 8a2 2 0 0 1 2 2"/><path d="M22 14v2"/><path d="M22 20a2 2 0 0 1-2 2"/></g>`);
        }
        if (!getIcon("squares-intersect")) {
            addIcon("squares-intersect", `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-squares-intersect" transform="scale(${ratio})"><path d="M10 22a2 2 0 0 1-2-2"/><path d="M14 2a2 2 0 0 1 2 2"/><path d="M16 22h-2"/><path d="M2 10V8"/><path d="M2 4a2 2 0 0 1 2-2"/><path d="M20 8a2 2 0 0 1 2 2"/><path d="M22 14v2"/><path d="M22 20a2 2 0 0 1-2 2"/><path d="M4 16a2 2 0 0 1-2-2"/><path d="M8 10a2 2 0 0 1 2-2h5a1 1 0 0 1 1 1v5a2 2 0 0 1-2 2H9a1 1 0 0 1-1-1z"/><path d="M8 2h2"/></g>`);
        }

        this.createPinIconUrl();
    }

    private initializeInvalidKeys(): void {
        for (const key of Object.keys(ExtendedGraphInstances.settings.additionalProperties)) {
            INVALID_KEYS[key] = [];
        }
    }

    private loadGraphsManager() {
        this.addChild(ExtendedGraphInstances.graphsManager);
        ExtendedGraphInstances.graphsManager.load();
    }

    private createPinIconUrl() {
        const bodyStyle = getComputedStyle(document.body);
        const stroke = bodyStyle.getPropertyValue("--color-base-00");
        const accentColor = ExtendedGraphInstances.app.getAccentColor();

        const useVelocity = this.app.vault.getConfig("cssTheme") === "Velocity";
        if (useVelocity) {
            if (!getIcon("pin-safety")) {
                const ratio = 100 / 24;
                addIcon("pin-safety", `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-pin-safety" transform="scale(${ratio})"><path d="M20.8 3.2c-1.6-1.6-4.1-1.6-5.7 0L12.3 6S15 9 18 6c-3 3 0 5.7 0 5.7l2.8-2.8c1.6-1.6 1.6-4.2 0-5.7"/><path d="m7.1 21.1 10.3-10.2"/><circle cx="5" cy="19" r="3"/><path d="M2.9 16.9 13.1 6.6"/></g>`);
            }
        }

        const svg = useVelocity ? getIcon("pin-safety") : getIcon("pin");
        if (svg) {
            if (!useVelocity) {
                const tail = svg.getElementsByTagName("path")[0];
                const head = svg.getElementsByTagName("path")[1];
                head.setAttribute("fill", accentColor);
                head.setAttribute("stroke", stroke);
                tail.setAttribute("stroke", accentColor);
            }
            else {
                svg.getElementsByTagName("g")[0].setAttribute("stroke", accentColor);
            }

            const s = new XMLSerializer();
            ExtendedGraphInstances.pinSVGDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.serializeToString(svg))}`
        }
    }

    // =============================== UNLOADING ===============================

    onunload() {
    }

    // ================================ SETTINGS ===============================

    private async checkDataValidity() {
        const dataPath = normalizePath((this.manifest.dir ?? "") + "/data.json");
        try {
            if (await this.app.vault.adapter.exists(dataPath)) {
                JSON.parse(await this.app.vault.adapter.read(dataPath));
            }
        } catch (error) {
            const message = `There is an error in the settings file ${dataPath}, the json file can not be parsed. Please, make a copy of your file and report it on the GitHub repo, with the copy attached. Then, you can try to fix the file by hand, or fully delete the content of ${dataPath} and start using the plugin again (but you will lose your settings). I apologize for the inconvenience.`;
            new Notice(message, 0);
            console.warn(message);
            throw error;
        }
    }

    async loadSettings() {
        let data = await this.loadData();
        // Comlete default settings
        this.completeDefaultSettings();
        // Migrate
        if (data) {
            data = this.migrateSettings(data);
        }
        else {
            data = DEFAULT_SETTINGS;
        }

        // Deep load default settings
        this.loadSettingsRec(DEFAULT_SETTINGS, data);
        ExtendedGraphInstances.settings = data;
    }

    private migrateSettings(settings: any): any {
        if (!settings) return DEFAULT_SETTINGS;
        if (typeof settings !== "object") return DEFAULT_SETTINGS;

        // Remove invalid shallow keys
        for (const key in settings) {
            if (!DEFAULT_SETTINGS.hasOwnProperty(key)) {
                delete settings[key];
            }
        }

        // 2.2.3 --> 2.2.4
        if ("additionalProperties" in settings && typeof settings["additionalProperties"] === "object") {
            for (const key of Object.keys(settings["additionalProperties"])) {
                if (typeof settings["additionalProperties"][key] === "boolean") {
                    const enable = settings["additionalProperties"][key];
                    settings["additionalProperties"][key] = {
                        'graph': enable,
                        'localgraph': enable,
                    }
                }
            }
        }

        if (!("enableFeatures" in settings)) {
            settings['enableFeatures'] = {
                'graph': {},
                'localgraph': {},
            };
        }

        if ("linksSameColorAsNode" in settings) {
            settings['enableFeatures']['graph']["linksSameColorAsNode"] = settings['linksSameColorAsNode'];
            settings['enableFeatures']['localgraph']["linksSameColorAsNode"] = settings['linksSameColorAsNode'];
            delete settings['linksSameColorAsNode'];
        }

        if ("enableFeatures" in settings) {
            if ("curvedLinks" in settings['enableFeatures']['graph']) {
                settings["curvedLinks"] = settings['enableFeatures']['graph']["curvedLinks"];
            }
            delete settings['enableFeatures']['graph']["curvedLinks"];
            delete settings['enableFeatures']['localgraph']["curvedLinks"];
        }

        if ("source" in settings['enableFeatures']['graph']) {
            settings["disableSource"] = settings['enableFeatures']['graph']["source"];
            delete settings['enableFeatures']['graph']["source"];
            delete settings['enableFeatures']['localgraph']["source"];
        }
        if ("target" in settings['enableFeatures']['graph']) {
            settings["disableTarget"] = settings['enableFeatures']['graph']["target"];
            delete settings['enableFeatures']['graph']["target"];
            delete settings['enableFeatures']['localgraph']["target"];
        }

        // 2.2.5 --> 2.2.6
        if ('collapsedSettings' in settings && "property-key" in settings['collapsedSettings']) {
            delete settings['collapsedSettings']["property-key"];
        }

        // 2.3.0 --> 2.4.0
        if ("iconProperty" in settings) {
            if (!('iconProperties' in settings)) {
                settings['iconProperties'] = [];
            }
            if (!settings['iconProperties'].contains(settings["iconProperty"]))
                settings['iconProperties'].push(settings["iconProperty"]);
            delete settings["iconProperty"];
        }
        if ("nodesSizeProperty" in settings) {
            if (!('nodesSizeProperties' in settings)) {
                settings['nodesSizeProperties'] = [];
            }
            if (!settings['nodesSizeProperties'].contains(settings["nodesSizeProperty"]))
                settings['nodesSizeProperties'].push(settings["nodesSizeProperty"]);
            delete settings["nodesSizeProperty"];
        }
        if ("imageProperty" in settings) {
            if (!('imageProperties' in settings)) {
                settings['imageProperties'] = [];
            }
            if (!settings['imageProperties'].contains(settings["imageProperty"]))
                settings['imageProperties'].push(settings["imageProperty"]);
            delete settings["imageProperty"];
        }
        if ("usePropertyForName" in settings) {
            if (!('usePropertiesForName' in settings)) {
                settings['usePropertiesForName'] = [];
            }
            if (settings["usePropertyForName"] && !settings['usePropertiesForName'].contains(settings["usePropertyForName"]))
                settings['usePropertiesForName'].push(settings["usePropertyForName"]);
            delete settings["usePropertyForName"];
        }

        // 2.4.2 --> 2.4.4
        if ("interactiveSettings" in settings) {
            if (typeof settings["interactiveSettings"] === "object") {
                for (const key of Object.keys(settings["interactiveSettings"])) {
                    if (!('excludeRegex' in settings["interactiveSettings"][key]) || typeof settings["interactiveSettings"][key]['excludeRegex'] !== "object") {
                        settings["interactiveSettings"][key]['excludeRegex'] = {
                            "regex": "",
                            "flags": ""
                        }
                    }
                }
            }
            else {
                settings["interactiveSettings"] = {};
            }
        }

        // 2.4.7 --> 2.4.8
        if (typeof settings["customColorMaps"] === "object") {
            for (const name in settings["customColorMaps"]) {
                if (Array.isArray(settings["customColorMaps"][name]['colors'])) {
                    for (const i in settings["customColorMaps"][name]['colors']) {
                        const col = settings["customColorMaps"][name]['colors'][i];
                        if (Array.isArray(col)) {
                            if (col.every(c => typeof c === "number")) {
                                settings["customColorMaps"][name]['colors'][i] = rgb2hex(col.map(c => Math.round(c * 255)));
                            }
                            else {
                                settings["customColorMaps"][name]['colors'][i] = "#000000";
                            }
                        }
                    }
                }
            }
        }

        // 2.6.1 --> 2.6.2
        if ('removeNodesWithoutLayers' in settings) {
            if (typeof settings['removeNodesWithoutLayers'] === "boolean") {
                settings['nodesWithoutLayerOpacity'] = settings['removeNodesWithoutLayers'] ? 0 : 1;
            }
            delete settings['removeNodesWithoutLayers'];
        }
        if ("states" in settings && Array.isArray(settings["states"])) {
            const defaultState = settings["states"].find(state => state["id"] === DEFAULT_STATE_ID);
            if (defaultState['name'] === "Vault (default)") {
                defaultState['name'] = DEFAULT_STATE_SETTINGS.name;
            }
        }

        // 2.7.4 --> 2.7.5
        if ('invertNodeStats' in settings && typeof settings['invertNodeStats'] === "boolean") {
            settings['graphStatsDirection'] = settings['invertNodeStats'] ? 'reversed' : 'normal';
            delete settings['invertNodeStats'];
        }

        return settings;
    }

    private completeDefaultSettings() {
        DEFAULT_SETTINGS.interactiveSettings[TAG_KEY] = {
            colormap: "hsv",
            colors: [],
            unselected: [],
            excludeRegex: { regex: "", flags: "" },
            noneType: "none",
            showOnGraph: true,
            enableByDefault: true,
        };

        DEFAULT_SETTINGS.interactiveSettings[LINK_KEY] = {
            colormap: "rainbow",
            colors: [],
            unselected: [],
            excludeRegex: { regex: "", flags: "" },
            noneType: "none",
            showOnGraph: true,
            enableByDefault: true,
        };

        DEFAULT_SETTINGS.interactiveSettings[FOLDER_KEY] = {
            colormap: "winter",
            colors: [],
            unselected: [],
            excludeRegex: { regex: "", flags: "" },
            noneType: "/",
            showOnGraph: true,
            enableByDefault: false,
        };
    }

    loadSettingsRec(defaultSettings: any, userSettings: any) {
        if (!defaultSettings || typeof defaultSettings !== 'object' || Array.isArray(defaultSettings)) {
            return;
        }
        if (!userSettings || typeof userSettings !== 'object' || Array.isArray(userSettings)) {
            return;
        }
        // Complete settings
        for (const key in defaultSettings) {
            // Add settings
            if (!userSettings.hasOwnProperty(key)) {
                userSettings[key] = defaultSettings[key];
            }
            // Or recursively complete settings
            else {
                this.loadSettingsRec(defaultSettings[key], userSettings[key]);
            }
        }
    }

    async saveSettings() {
        await this.saveData(ExtendedGraphInstances.settings);
    }

    async loadConfigFile(filepath: string) {
        filepath = normalizePath(filepath);
        const data = await this.app.vault.adapter.read(filepath);
        let json = JSON.parse(data);

        const stateID = json["stateID"];

        json = this.migrateSettings(json);

        // Delete settings that we don't want to override
        delete json.states;
        delete json.backupGraphOptions;
        delete json.customColorMaps;
        delete json.collapseState;
        delete json.collapseLegend;
        delete json.resetAfterChanges;
        delete json.collapsedSettings;
        delete json.multipleNodesData;

        this.loadSettingsRec(ExtendedGraphInstances.settings, json);

        if (stateID) json["stateID"] = stateID;

        return json as ExtendedGraphSettings & { stateID?: string };
    }

    async importSettings(filepath: string): Promise<void> {
        // Load config file
        const importedSettings = await this.loadConfigFile(filepath);

        // Delete the stateID value if it exists
        delete importedSettings["stateID"];

        // Set and save the settings
        ExtendedGraphInstances.settings = importedSettings;
        await this.saveSettings();

        // Just in case the migration modified something
        this.exportSettings(filepath, ExtendedGraphInstances.settings);
    }

    async exportSettings(filepath: string, settings: ExtendedGraphSettings, state?: GraphState): Promise<void> {
        this.app.vault.adapter.mkdir(ExtendedGraphInstances.configurationDirectory);
        filepath = normalizePath(filepath);

        const clonedSettings = structuredClone(settings) as Partial<typeof ExtendedGraphInstances.settings> & { stateID?: string };

        // Remove settings that we don't want to save
        delete clonedSettings.states;
        delete clonedSettings.backupGraphOptions;
        delete clonedSettings.customColorMaps;
        delete clonedSettings.collapseState;
        delete clonedSettings.collapseLegend;
        delete clonedSettings.resetAfterChanges;
        delete clonedSettings.collapsedSettings;
        delete clonedSettings.multipleNodesData;

        // If exported alongside a state, we save the id
        if (state) {
            clonedSettings.stateID = state.data.id;
        }
        else {
            // Else, make sure we don't override the state id if it exists
            const stateID = ExtendedGraphInstances.statesManager.getStateFromConfig(filepath);
            if (stateID) {
                clonedSettings.stateID = stateID;
            }
        }

        const data = JSON.stringify(clonedSettings, null, 2);
        await this.app.vault.adapter.write(filepath, data);

        // If the config is bound to a state, update the cache
        if (clonedSettings.stateID) {
            ExtendedGraphInstances.statesManager.cacheConfig(filepath);
        }
    }

    // ============================= LAYOUT CHANGE =============================

    async onLayoutChange() {
        if (!this.app.internalPlugins.getPluginById("graph")?._loaded) return;
        const leaves = this.getGraphLeaves();
        ExtendedGraphInstances.graphsManager.leavesManager.syncWithLeaves(leaves);
        leaves.forEach(leaf => {
            ExtendedGraphInstances.graphsManager.graphLeavesManager.initLeaf(leaf);
        });
    }

    private getGraphLeaves(): WorkspaceLeaf[] {
        let leaves: WorkspaceLeaf[] = [];
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('graph'));
        leaves = leaves.concat(this.app.workspace.getLeavesOfType('localgraph'));
        leaves = leaves.concat(getGraphBannerPlugin()?.graphViews.map(v => v.leaf) || []);
        return [...(new Set(leaves))];
    }

    private onMarkdownViewOpen(view: MarkdownView): void {
        // Select the node that will be observed for mutations
        const targetNode = view.contentEl;

        // Options for the observer (which mutations to observe)
        const config = { attributes: true, childList: true, subtree: true };

        // Callback function to execute when mutations are observed
        const callback: MutationCallback = (mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === "childList") {
                    if (mutation.addedNodes.length > 0) {
                        if ((mutation.addedNodes[0] as HTMLElement).classList?.contains(getGraphBannerClass())) {
                            this.onLayoutChange();
                            /*const leaf = getGraphBannerPlugin()?.graphViews.find(v => v.node === mutation.addedNodes[0])?.leaf;
                            if (leaf && this.isGraph(leaf)) {
                                PluginInstances.graphsManager.onNewLeafOpen(leaf);
                            }*/
                        }
                    }
                }
            }
        };

        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);

        // Start observing the target node for configured mutations
        observer.observe(targetNode, config);

        // Stop observing after 2 seconds
        setTimeout(() => {
            observer.disconnect();
        }, 2000);
    }
}

