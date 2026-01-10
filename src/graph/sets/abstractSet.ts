import { TAbstractFile, TFile } from "obsidian";
import { GraphLink, GraphNode } from "obsidian-typings";
import * as Color from '../../colors/color-bits';
import { ExtendedGraphElement, ExtendedGraphLink, ExtendedGraphNode, GraphInstances, InteractiveManager, SettingQuery, TAG_KEY } from "../../internal";


export abstract class AbstractSet<T extends GraphNode | GraphLink> {
    // Parent graph
    instances: GraphInstances;

    // Element containers
    coreCollection: T[];
    extendedElementsMap = new Map<string, ExtendedGraphElement<T>>();
    connectedIDs = new Set<string>();
    typesMap: { [key: string]: { [type: string]: Set<string> } } = {}; // [key][type].get(id)

    // Interactive managers specific to the set
    #managersArray: InteractiveManager[];
    managers = new Map<string, InteractiveManager>();

    /**
     * Constructor for LinksSet.
     * @param graph - The graph instance.
     * @param manager - The interactive managers.
     */
    constructor(instances: GraphInstances, managers: InteractiveManager[]) {
        this.instances = instances;
        this.#managersArray = managers;
    }

    // ================================ LOADING ================================

    load(id?: string): Set<string> {
        this.initializeManagers(this.#managersArray);
        this.initializeTypesMap();
        for (const key of this.managers.keys()) {
            this.addMissingInteractiveTypes(key);
        }
        const addedElements = this.addMissingElements(id);
        if (addedElements.size > 0) {
            this.handleMissingElements(addedElements);
        }
        return addedElements;
    }

    private initializeManagers(managers: InteractiveManager[]) {
        for (const manager of managers) {
            if (!this.managers.has(manager.name)) this.managers.set(manager.name, manager);
        }
    }

    private initializeTypesMap() {
        for (const key of this.managers.keys()) {
            if (!this.typesMap.hasOwnProperty(key)) this.typesMap[key] = {};
        }
    }

    /**
     * Initializes the tag types for the nodes set.
     * @returns True if there are missing nodes in the graph, false otherwise.
     */
    private addMissingInteractiveTypes(key: string): boolean | undefined {
        if (!this.managers.has(key)) return;

        const missingTypes = new Set<string>();
        let isElementMissing = false;

        for (const element of this.coreCollection) {
            const id = this.getID(element);
            if (this.extendedElementsMap.has(id)) continue;

            const file = this.getAbstractFile(element);
            isElementMissing = true;

            let types: Set<string> = new Set<string>();
            const interactiveSettings = this.instances.settings.interactiveSettings[key];
            if ((element as GraphNode).type === "tag" && key === TAG_KEY) {
                types.add((element as GraphNode).id.replace("#", ""));
            }
            else if (file && file instanceof TFile) {
                const fileTypes = this.getTypesFromFile(key, element, file);
                if (fileTypes === null) {
                    // Property doesn't exist - use undefinedType if available, otherwise noneType
                    types.add(interactiveSettings.undefinedType ?? interactiveSettings.noneType);
                } else if (fileTypes.size === 0) {
                    // Property exists but is empty - use noneType
                    types.add(interactiveSettings.noneType);
                } else {
                    types = fileTypes;
                }
            }
            else {
                // No file found - use undefinedType if available, otherwise noneType
                types.add(interactiveSettings.undefinedType ?? interactiveSettings.noneType);
            }
            this.addTypes(key, types, id, missingTypes);
        }

        //missingTypes.add(this.instances.settings.interactiveSettings[key].noneType);
        this.managers.get(key)?.addTypes(missingTypes);

        return isElementMissing;
    }

    private addTypes(key: string, types: Set<string>, id: string, missingTypes: Set<string>): void {
        let hasType = false;
        for (const type of types) {
            if (this.isTypeValid(key, type)) {
                if (!this.managers.get(key)?.interactives.has(type)) {
                    missingTypes.add(type);
                }
                if (!this.typesMap[key].hasOwnProperty(type)) {
                    this.typesMap[key][type] = new Set<string>();
                }
                this.typesMap[key][type].add(id);
                hasType = true;
            }
        }
        if (!hasType) {
            const type = this.instances.settings.interactiveSettings[key].noneType;
            if (!this.typesMap[key].hasOwnProperty(type)) {
                this.typesMap[key][type] = new Set<string>();
            }
            this.typesMap[key][type].add(id);

            if (!this.managers.get(key)?.interactives.has(type)) {
                missingTypes.add(type);
            }
        }
    }

    private addMissingElements(unique_id?: string): Set<string> {
        const missingElements = new Set<string>();
        for (const coreElement of this.coreCollection) {
            const id = this.getID(coreElement);
            if (unique_id && unique_id !== id) continue;
            const extendedElement = this.extendedElementsMap.get(id);
            if (extendedElement) {
                extendedElement.setCoreElement(coreElement);
            }
            else {
                missingElements.add(id);
                this.createExtendedElement(coreElement);
            }
        }
        return missingElements;
    }

    protected handleMissingElements(ids: Set<string>): void {
        for (const id of ids) {
            const extendedElement = this.extendedElementsMap.get(id);
            if (!extendedElement) return;
            extendedElement.init();
            this.handleMissingElement(extendedElement);
        }
    }

    protected abstract handleMissingElement(extendedElement: ExtendedGraphElement<T>): void;

    // =============================== UNLOADING ===============================

    unload() {
        this.clearExtendedElements();
        this.clearMaps();
    }

    private clearExtendedElements() {
        this.extendedElementsMap.forEach(el => {
            el.unload();
        });
    }

    protected clearMaps() {
        this.extendedElementsMap.clear();
        this.connectedIDs.clear();
        this.managers.clear();
    }

    // =========================== EXTENDED ELEMENTS ===========================

    protected abstract createExtendedElement(coreElement: T): ExtendedGraphNode | ExtendedGraphLink;

    // ================================ GETTERS ================================

    protected getTypes(key: string, coreElement: T): Set<string> {
        const allTypes = [...Object.getOwnPropertyNames(this.typesMap[key])];
        const types = allTypes.filter(type => this.typesMap[key][type]?.has(this.getID(coreElement)));
        return new Set<string>(types);
    }

    getElementsByTypes(key: string, types: string[]): Set<string> {
        const ids = new Set<string>();
        for (const type of types) {
            this.typesMap[key][type]?.forEach(id => {
                ids.add(id);
            });
        }
        return ids;
    }

    protected isTypeValid(key: string, type: string): boolean {
        if (SettingQuery.excludeType(this.instances.settings, key, type))
            return false;
        return true;
    }

    protected abstract getID(coreElement: T): string;
    protected abstract getTypesFromFile(key: string, coreElement: T, file: TFile): Set<string> | null;
    protected abstract getAbstractFile(coreElement: T): TAbstractFile | null;

    // ============================= TOGGLE TYPES ==============================

    disableType(key: string, type: string): string[] {
        const elementsToDisable: string[] = [];
        for (const [id, extendedElement] of this.extendedElementsMap) {
            // If the elment does not have this type, skip
            const elementTypes = extendedElement.getTypes(key);
            if (elementTypes.has(type)) {
                extendedElement.disableType(key, type);
            }

            if (extendedElement.isAnyManagerDisabled()) {
                if (extendedElement.isEnabled) {
                    extendedElement.disable();
                    elementsToDisable.push(id);
                }
            }
            else if (!extendedElement.isEnabled) {
                extendedElement.enable();
            }
        }
        return elementsToDisable;
    }

    enableType(key: string, type: string): string[] {
        const elementsToEnable: string[] = [];
        for (const [id, extendedElement] of this.extendedElementsMap) {
            // If the elment does not have this type, skip
            const elementTypes = extendedElement.getTypes(key);
            if (elementTypes.has(type)) {
                extendedElement.enableType(key, type);
            }

            if (extendedElement.isAnyManagerDisabled()) {
                if (extendedElement.isEnabled) {
                    extendedElement.disable();
                }
            }
            else if (!extendedElement.isEnabled) {
                extendedElement.enable();
                elementsToEnable.push(id);
            }
        }
        return elementsToEnable;
    }

    // ============================ TOGGLE ELEMENTS ============================

    disableElements(ids: string[]) {
        return new Set(ids.filter(id => this.disableElement(id)));
    }

    private disableElement(id: string): boolean {
        const extendedElement = this.extendedElementsMap.get(id);
        if (!extendedElement) return false;

        this.connectedIDs.delete(id);

        if (extendedElement.isEnabled) {
            extendedElement.disable();
        }
        extendedElement.coreElement.clearGraphics();
        this.coreCollection.remove(extendedElement.coreElement);

        return true;
    }

    enableElements(ids: string[]): Set<string> {
        return new Set(ids.filter(id => this.enableElement(id)));
    }

    private enableElement(id: string): boolean {
        const extendedElement = this.extendedElementsMap.get(id);
        if (!extendedElement) return false;

        this.connectedIDs.add(id);

        if (!extendedElement.canBeAddedWithEngineOptions()) return false;

        if (!extendedElement.getCoreCollection().includes(extendedElement.coreElement))
            extendedElement.getCoreCollection().push(extendedElement.coreElement);
        extendedElement.coreElement.initGraphics();
        if (!extendedElement.isEnabled) {
            extendedElement.enable();
        }

        return true;
    }

    // ================================ COLORS =================================

    updateTypeColor(key: string, type: string, color: Color.Color): void {
        const ids = this.getElementsByTypes(key, [type]);
        for (const id of ids) {
            const extendedElement = this.extendedElementsMap.get(id);
            if (!extendedElement) return;
            this.updateTypeColorForElement(extendedElement, key, type, color);
        }
    }

    protected updateTypeColorForElement(extendedElement: ExtendedGraphElement<T>, key: string, type: string, color: Color.Color): void {
        extendedElement.types.get(key)?.add(type);
        extendedElement.graphicsWrapper?.managerGraphicsMap?.get(key)?.updateValues();
    }

    // ========================== VAULT MODIFICATIONS ==========================

    delete(element: ExtendedGraphElement<T>) {
        element.graphicsWrapper?.disconnect();
        element.graphicsWrapper?.destroyGraphics();
        this.extendedElementsMap.delete(element.id);
    }
}