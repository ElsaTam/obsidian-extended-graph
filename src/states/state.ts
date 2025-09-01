import {
    EngineOptions,
    FOLDER_KEY,
    GraphInstances,
    GraphStateData,
    LINK_KEY,
    ExtendedGraphInstances,
    TAG_KEY
} from "../internal";

export class GraphState {
    data = new GraphStateData();

    constructor(name: string) {
        this.data.name = name;
    }

    setID(id?: string) {
        this.data.id = id ? id : crypto.randomUUID();
    }

    saveGraph(instances: GraphInstances) {
        for (const [key, manager] of instances.interactiveManagers) {
            this.data.toggleTypes[key] = manager.getTypes()
                .filter(type => ExtendedGraphInstances.settings.interactiveSettings[key].enableByDefault !== manager.isActive(type));
        }

        // Pinned nodes
        this.data.pinNodes = {};
        for (const [id, extendedNode] of instances.nodesSet.extendedElementsMap) {
            if (extendedNode.isPinned) {
                this.data.pinNodes[id] = { x: extendedNode.coreElement.x, y: extendedNode.coreElement.y };
            }
        }

        // Engine options
        this.data.engineOptions = new EngineOptions(instances.engine.getOptions());

        // Hidden legend rows
        // Since they are updated directly from the UI,
        // we can just copy the ones from the current instances
        this.data.hiddenLegendRows = structuredClone(instances.stateData?.hiddenLegendRows) ?? [];

        // Collapsed legend rows
        // (same)
        this.data.collapsedLegendRows = structuredClone(instances.stateData?.collapsedLegendRows) ?? [];

        // Combination logics
        // (same)
        this.data.logicTypes = structuredClone(instances.stateData?.logicTypes) ?? {};

        // Layers
        if (instances.layersManager) {
            this.data.enableLayers = instances.layersManager.isEnabled;
            this.data.currentLayerLevel = instances.layersManager.currentLevel;
        }
    }

    saveState(stateData: GraphStateData): boolean {
        this.data = stateData;
        return this.completeDefaultOptions();
    }

    isValidProperty(key: string) {
        return ['id', 'name', 'toggleTypes', 'logicTypes', 'pinNodes', 'engineOptions', 'hiddenLegendRows', 'collapsedLegendRows', 'enableLayers', 'currentLayerLevel'].includes(key);
    }

    private completeDefaultOptions(): boolean {
        let hasChanged = false;

        if (!this.data.toggleTypes) {
            this.data.toggleTypes = {};
            hasChanged = true;
        }
        if (!this.data.toggleTypes[TAG_KEY]) {
            this.data.toggleTypes[TAG_KEY] = [];
            hasChanged = true;
        }
        if (!this.data.toggleTypes[LINK_KEY]) {
            this.data.toggleTypes[LINK_KEY] = [];
            hasChanged = true;
        }
        if (!this.data.toggleTypes[FOLDER_KEY]) {
            this.data.toggleTypes[FOLDER_KEY] = [];
            hasChanged = true;
        }

        if (!this.data.logicTypes) {
            this.data.logicTypes = {};
            hasChanged = true;
        }
        if (!this.data.logicTypes[TAG_KEY]) {
            this.data.logicTypes[TAG_KEY] = "OR";
            hasChanged = true;
        }
        if (!this.data.logicTypes[LINK_KEY]) {
            this.data.logicTypes[LINK_KEY] = "OR";
            hasChanged = true;
        }
        if (!this.data.logicTypes[FOLDER_KEY]) {
            this.data.logicTypes[FOLDER_KEY] = "OR";
            hasChanged = true;
        }

        if (!this.data.pinNodes) {
            this.data.pinNodes = {};
            hasChanged = true;
        }

        if (!this.data.engineOptions) {
            this.data.engineOptions = new EngineOptions();
            hasChanged = true;
        }
        else {
            if (this.data.engineOptions.search === undefined) {
                const graphPlugin = ExtendedGraphInstances.graphsManager.getCorePluginInstance();
                if (graphPlugin) {
                    this.data.engineOptions.search = graphPlugin.options.search ?? "";
                    hasChanged = true;
                }
            }
        }

        if (!this.data.hiddenLegendRows) {
            this.data.hiddenLegendRows = [];
            hasChanged = true;
        }

        if (!this.data.collapsedLegendRows) {
            this.data.collapsedLegendRows = [];
            hasChanged = true;
        }

        for (const key in this.data) {
            if (!this.isValidProperty(key)) {
                this.data = this.excludeKey(this.data, key) as GraphStateData;
                hasChanged = true;
            }
        }

        return hasChanged;
    }

    excludeKey<T extends object, U extends keyof any>(obj: T, key: U) {
        const { [key]: _, ...newObj } = obj;
        return newObj;
    }
}