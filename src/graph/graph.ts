
import { Component } from 'obsidian';
import { FOLDER_KEY, FoldersSet, GraphInstances, InteractiveManager, LayersManager, LayersUI, LINK_KEY, LinksSet, NodesSet, TAG_KEY } from '../internal';

export class Graph extends Component {
    instances: GraphInstances;

    // Functions to override
    onOptionsChangeOriginal: () => void;

    // ============================== CONSTRUCTOR ==============================

    constructor(instances: GraphInstances) {
        super();

        this.instances = instances;
        this.instances.graph = this;

        // Interactive managers
        this.initializeInteractiveManagers();

        // Layers
        if (this.instances.settings.enableFeatures[this.instances.type].layers) {
            this.instances.layersManager = new LayersManager(this.instances);
        }

        // Sets
        this.instances.nodesSet = new NodesSet(this.instances, this.getNodeManagers());
        this.instances.linksSet = new LinksSet(this.instances, this.getLinkManagers());
        if (instances.settings.enableFeatures[instances.type]['folders']) {
            this.instances.foldersSet = new FoldersSet(this.instances, this.getFolderManagers());
        }

        // Functions to override
        this.overrideOnOptionsChange();
    }

    private initializeInteractiveManagers(): void {
        const keys = this.getInteractiveManagerKeys();
        for (const key of keys) {
            const manager = new InteractiveManager(this.instances, key);
            this.instances.interactiveManagers.set(key, manager);
            this.addChild(manager);
        }
    }

    private getInteractiveManagerKeys(): string[] {
        const keys: string[] = [];
        if (this.instances.settings.enableFeatures[this.instances.type]['properties']) {
            for (const property in this.instances.settings.additionalProperties) {
                if (this.instances.settings.additionalProperties[property][this.instances.type]) keys.push(property);
            }
        }
        if (this.instances.settings.enableFeatures[this.instances.type]['tags']) keys.push(TAG_KEY);
        if (this.instances.settings.enableFeatures[this.instances.type]['links']) keys.push(LINK_KEY);
        if (this.instances.settings.enableFeatures[this.instances.type]['folders']) keys.push(FOLDER_KEY);
        return keys;
    }

    private getNodeManagers(): InteractiveManager[] {
        return Array.from(this.instances.interactiveManagers.values()).filter(m => m.name !== LINK_KEY && m.name !== FOLDER_KEY);
    }

    private getLinkManagers(): InteractiveManager[] {
        const manager = this.instances.interactiveManagers.get(LINK_KEY);
        return manager ? [manager] : [];
    }

    private getFolderManagers(): InteractiveManager[] {
        const manager = this.instances.interactiveManagers.get(FOLDER_KEY);
        return manager ? [manager] : [];
    }

    private overrideOnOptionsChange(): void {
        this.onOptionsChangeOriginal = this.instances.view.onOptionsChange;
        this.instances.view.onOptionsChange = () => { };
    }

    // ================================ LOADING ================================

    onload(): void {
        this.initSets().then(() => {
            this.instances.graphEventsDispatcher.onGraphReady();
        }).catch(e => {
            console.error(e);
        });
    }

    private async initSets(): Promise<void> {
        // Let time to the engine to apply user filters
        await this.delay(this.instances.settings.delay);

        this.instances.nodesSet.load();
        this.instances.linksSet.load();
        this.instances.foldersSet?.load();
    }

    delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =============================== UNLOADING ===============================

    onunload(): void {
        this.restoreOriginalFunctions();
        this.instances.layersManager?.unload();
        this.instances.nodesSet.unload();
        this.instances.linksSet.unload();
        this.instances.foldersSet?.unload();
    }

    private restoreOriginalFunctions(): void {
        this.instances.view.onOptionsChange = this.onOptionsChangeOriginal;
    }

    // ============================= UPDATING LINKS ============================

    /**
     * Disables link types specified in the types array.
     * @param types - Array of link types to disable.
     */
    disableLinkTypes(types: string[]): void {
        for (const type of types) {
            this.instances.linksSet.disableType(LINK_KEY, type);
        }
    }

    /**
     * Enables link types specified in the types array.
     * @param types - Array of link types to enable.
    */
    enableLinkTypes(types: string[]): void {
        for (const type of types) {
            this.instances.linksSet.enableType(LINK_KEY, type);
        }
    }

    // ============================ UPDATING NODES =============================

    disableNodeInteractiveTypes(key: string, types: string[]): void {
        let nodesToDisable: string[] = [];
        for (const type of types) {
            nodesToDisable = nodesToDisable.concat(this.instances.nodesSet.disableType(key, type));
        }
        if (this.instances.settings.fadeOnDisable && nodesToDisable.length > 0) {
            this.fadeOutNodes(nodesToDisable);
        }
        else if (nodesToDisable.length > 0) {
            const links = [...this.instances.linksSet.extendedElementsMap.values()]
                .filter(link => (nodesToDisable.includes(link.coreElement.source.id)
                    || nodesToDisable.includes(link.coreElement.target.id))
                    && link.isEnabled
                );
            for (const link of links) {
                link.disable();
            }
        }
    }

    enableNodeInteractiveTypes(key: string, types: string[]): void {
        let nodesToEnable: string[] = [];
        for (const type of types) {
            nodesToEnable = nodesToEnable.concat(this.instances.nodesSet.enableType(key, type));
        }
        if (this.instances.settings.fadeOnDisable && nodesToEnable.length > 0) {
            this.fadeInNodes(nodesToEnable);
        }
    }


    private fadeOutNodes(ids: string[]): boolean {
        for (const id of ids) {
            const extendedElement = this.instances.nodesSet.extendedElementsMap.get(id);
            if (!extendedElement) continue;
            extendedElement.graphicsWrapper?.makeFaded();
        }
        return false;
    }

    private fadeInNodes(ids: string[]): boolean {
        for (const id of ids) {
            const extendedElement = this.instances.nodesSet.extendedElementsMap.get(id);
            if (!extendedElement) continue;
            extendedElement.graphicsWrapper?.makeOpaque();
        }
        return false;
    }
}
