import { TAbstractFile, TFile, TFolder } from "obsidian";
import { GraphLink, GraphNode } from "obsidian-typings";
import { DisconnectionCause, ExtendedGraphElement, Graph, GraphInstances, InteractiveManager, INVALID_KEYS, TAG_KEY } from "src/internal";


export abstract class AbstractSet<T extends GraphNode | GraphLink> {
    // Parent graph
    instances: GraphInstances;

    // Element containers
    coreCollection: T[];
    extendedElementsMap = new Map<string, ExtendedGraphElement<T>>();
    connectedIDs = new Set<string>();
    disconnectedIDs: {[cause: string] : Set<string>} = {};
    typesMap: {[key: string]: {[type: string]: Set<string>}} = {}; // [key][type].get(id)

    // Temporary elements
    elementsToAddToCascade: Set<string> | null = null;

    // Interactive managers specific to the set
    managers = new Map<string, InteractiveManager>();

    /**
     * Constructor for LinksSet.
     * @param graph - The graph instance.
     * @param manager - The interactive managers.
     */
    constructor(instances: GraphInstances, managers: InteractiveManager[]) {
        this.instances = instances;
        this.initializeManagers(managers);
        this.initializeTypesMap();
        this.initializeDisconnectedIDs();
    }

    private initializeManagers(managers: InteractiveManager[]) {
        for (const manager of managers) {
            this.managers.set(manager.name, manager);
        }
    }

    private initializeTypesMap() {
        for (const key of this.managers.keys()) {
            this.typesMap[key] = {};
        }
    }
    
    private initializeDisconnectedIDs(): void {
        for (const value of Object.values(DisconnectionCause)) {
            this.disconnectedIDs[value] = new Set<string>();
        }
    }

    // ================================ LOADING ================================

    load(): Set<string> {
        for (const key of this.managers.keys()) {
            this.addMissingInteractiveTypes(key);
        }
        const addedElements = this.addMissingElements();
        if (addedElements.size > 0) {
            this.handleMissingElements(addedElements);
            this.elementsToAddToCascade = new Set(([...this.elementsToAddToCascade ?? []]).concat([...addedElements]));
        }
        return addedElements;
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
            if ((element as GraphNode).type === "tag") {
                if (key === TAG_KEY) {
                    types.add((element as GraphNode).id.replace("#", ""));
                }
            }
            else if (file && file instanceof TFile) {
                types = this.getTypesFromFile(key, element, file);
                if (types.size === 0) {
                    types.add(this.instances.settings.interactiveSettings[key].noneType);
                }
            }
            else {
                continue;
            }
            this.addTypes(key, types, id, missingTypes);
        }

        this.managers.get(key)?.addTypes(missingTypes);

        return isElementMissing;
    }

    private addTypes(key: string, types: Set<string>, id: string, missingTypes: Set<string>): void {
        let hasType = false;
        for (const type of types) {
            if (this.isTypeValid(key, type)) {
                if (!this.managers.get(key)?.interactives.has(type)) {
                    missingTypes.add(type);
                    if (!this.typesMap[key].hasOwnProperty(type)) {
                        this.typesMap[key][type] = new Set<string>();
                    }
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

    private addMissingElements(): Set<string> {
        const missingElements = new Set<string>();
        for (const coreElement of this.coreCollection) {
            const id = this.getID(coreElement);
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

    protected handleMissingElements(ids: Set<string>): void { }

    abstract loadCascadesForMissingElements(ids: Set<string>): void;

    // =============================== UNLOADING ===============================

    unload() {
        this.clearExtendedElements();
        this.clearMaps();
    }
    
    private clearExtendedElements() {
        this.extendedElementsMap.forEach(el => {
            this.clearExtendedElement(el);
        });
    }

    protected clearExtendedElement(el: ExtendedGraphElement<T>): void {
        el.graphicsWrapper?.disconnect();
        el.graphicsWrapper?.clearGraphics();
        el.graphicsWrapper?.destroyGraphics();
    }

    protected clearMaps() {
        this.extendedElementsMap.clear();
        this.connectedIDs.clear();
        for (const value of Object.values(DisconnectionCause)) {
            this.disconnectedIDs[value].clear();
        }
        this.managers.clear();
    }

    // =========================== EXTENDED ELEMENTS ===========================

    protected abstract createExtendedElement(coreElement: T): void;

    // ================================ GETTERS ================================

    getAllTypes(key: string): Set<string> | null {
        const types = new Set<string>();

        this.extendedElementsMap.forEach(extendedElement => {
            const wrapperTypes = this.getTypes(key, extendedElement.coreElement);
            if (wrapperTypes) {
                wrapperTypes.forEach(type => types.add(type));
            }
        });
        
        return new Set([...types].sort());
    }

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
        if (!this.instances.settings.interactiveSettings[key].unselected || this.instances.settings.interactiveSettings[key].unselected.includes(type))
            return false;
        if (INVALID_KEYS.hasOwnProperty(key) && [key].includes(type))
            return false;
        return true;
    }

    protected abstract getID(coreElement: T): string;
    protected abstract getTypesFromFile(key: string, coreElement: T, file: TFile): Set<string>;
    protected abstract getAbstractFile(coreElement: T): TAbstractFile | null;
    
    // ============================= TOGGLE TYPES ==============================

    disableType(key: string, type: string): string[] {
        const elementsToDisable: string[] = [];
        for (const [id, extendedElement] of this.extendedElementsMap) {
            // If the elment does not have this type, skip
            const elementTypes = extendedElement.getTypes(key);
            if (!elementTypes.has(type)) {
                continue;
            }

            extendedElement.disableType(key, type);

            if (extendedElement.isAnyManagerDisabled()) {
                elementsToDisable.push(id);
            }
        }
        return elementsToDisable;
    }

    enableType(key: string, type: string): string[] {
        const elementsToEnable: string[] = [];
        for (const [id, extendedElement] of this.extendedElementsMap) {
            // If the elment does not have this type, skip
            const elementTypes = extendedElement.getTypes(key);
            if (!elementTypes.has(type)) {
                continue;
            }
        
            extendedElement.enableType(key, type);

            if (!extendedElement.isAnyManagerDisabled()) {
                elementsToEnable.push(id);
            }
        }
        return elementsToEnable;
    }

    // ============================ TOGGLE ELEMENTS ============================

    disableElements(ids: string[], cause: string) {
        return new Set(ids.filter(id => this.disableElement(id, cause)));
    }

    private disableElement(id: string, cause: string): boolean {
        const extendedElement = this.extendedElementsMap.get(id);
        if (!extendedElement) return false;

        this.disconnectedIDs[cause].add(id);
        this.connectedIDs.delete(id);

        extendedElement.disable();
        extendedElement.coreElement.clearGraphics();
        this.coreCollection.remove(extendedElement.coreElement);

        return true;
    }

    enableElements(ids: string[], cause: string): Set<string> {
        return new Set(ids.filter(id => this.enableElement(id, cause)));
    }

    private enableElement(id: string, cause: string): boolean {
        const extendedElement = this.extendedElementsMap.get(id);
        if (!extendedElement) return false;
        
        this.disconnectedIDs[cause].delete(id);
        this.connectedIDs.add(id);

        if (!extendedElement.getCoreCollection().includes(extendedElement.coreElement))
            extendedElement.getCoreCollection().push(extendedElement.coreElement);
        extendedElement.coreElement.initGraphics();
        extendedElement.enable();

        return true;
    }

    // ================================ COLORS =================================

    updateTypeColor(key: string, type: string, color: Uint8Array): void {
        const ids = this.getElementsByTypes(key, [type]);
        for (const id of ids) {
            const extendedElement = this.extendedElementsMap.get(id);
            if (!extendedElement) return;
            extendedElement.types.get(key)?.add(type);
            extendedElement.graphicsWrapper?.managerGraphicsMap?.get(key)?.redrawType(type, color);
        }
    }
}