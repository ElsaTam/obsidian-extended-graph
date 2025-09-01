import { Component } from "obsidian";
import { LINK_KEY, FOLDER_KEY } from "../globalVariables";
import * as Color from '../colors/color-bits';
import { GraphInstances } from "../pluginInstances";

export class InteractiveEventsDispatcher extends Component {
    instances: GraphInstances;

    constructor(instances: GraphInstances) {
        super();
        this.instances = instances;
    }

    /**
     * Handles the addition of interactive elements.
     * @param name - The name of the interactive element type.
     * @param colorMaps - A map of types to their corresponding colors.
     */
    onInteractivesAdded(name: string, colorMaps: Map<string, Color.Color>) {
        if (name === LINK_KEY) {
            this.onLinkTypesAdded(colorMaps);
        } else if (name === FOLDER_KEY) {
            this.onFoldersAdded(colorMaps);
        } else {
            this.onNodeInteractiveTypesAdded(name, colorMaps);
        }
    }

    /**
     * Handles the removal of interactive elements.
     * @param name - The name of the interactive element type.
     * @param types - A set of types to be removed.
     */
    onInteractivesRemoved(name: string, types: Set<string> | string[]) {
        if (name === LINK_KEY) {
            this.onLinkTypesRemoved(types);
        } else if (name === FOLDER_KEY) {
            this.onFoldersRemoved(types);
        } else {
            this.onNodeInteractiveTypesRemoved(name, types);
        }
    }

    /**
     * Handles the color change of interactive elements.
     * @param key - The name of the interactive element type.
     * @param type - The type of the interactive element.
     * @param color - The new color of the interactive element.
     */
    onInteractiveColorChanged(key: string, type: string, color: Color.Color) {
        if (key === LINK_KEY) {
            this.onLinkColorChanged(type, color);
        } else if (key === FOLDER_KEY) {
            this.onFolderColorChanged(type, color);
        } else {
            this.onNodeInteractiveColorChanged(key, type, color);
        }
    }

    /**
     * Handles the disabling of interactive elements.
     * @param key - The name of the interactive element type.
     * @param types - An array of types to be disabled.
     */
    onInteractivesDisabled(key: string, types: string[]) {
        if (key === LINK_KEY) {
            this.instances.graph.disableLinkTypes(types);
            this.instances.engine.render();
            this.instances.renderer.changed();
        } else if (key === FOLDER_KEY) {
            this.disableFolders(types);
        } else {
            this.instances.graph.disableNodeInteractiveTypes(key, types);
            if (!this.instances.settings.fadeOnDisable) {
                this.instances.engine.render();
            }
            this.instances.renderer.changed();
        }
    }

    /**
     * Handles the enabling of interactive elements.
     * @param key - The name of the interactive element type.
     * @param types - An array of types to be enabled.
     */
    onInteractivesEnabled(key: string, types: string[]) {
        this.instances.graphEventsDispatcher.setLastFilteringActionAsInteractive(key, types);

        if (key === LINK_KEY) {
            this.instances.graph.enableLinkTypes(types);
            this.instances.engine.render();
            this.instances.renderer.changed();
        } else if (key === FOLDER_KEY) {
            this.enableFolders(types);
        } else {
            this.instances.graph.enableNodeInteractiveTypes(key, types);
            if (!this.instances.settings.fadeOnDisable) {
                this.instances.engine.render();
            }
            this.instances.renderer.changed();
        }
    }

    onInteractivesLogicChanged(key: string) {
        if (key === LINK_KEY) {
            for (const [id, extendedLink] of this.instances.linksSet.extendedElementsMap) {
                const shouldDisable = extendedLink.isAnyManagerDisabled();
                if (extendedLink.isEnabled && shouldDisable) {
                    extendedLink.disable();
                }
                else if (!extendedLink.isEnabled && !shouldDisable) {
                    extendedLink.enable();
                }
            }
        }
    }

    // ================================= TAGS ==================================

    // TAGS

    private onNodeInteractiveTypesAdded(key: string, colorMaps: Map<string, Color.Color>) {
        // Update UI
        if (this.instances.legendUI) {
            for (const [type, color] of colorMaps) {
                this.instances.legendUI.add(key, type, color);
            }
        }
        // Update Graph is needed
        this.instances.nodesSet.resetArcs(key);
        this.instances.renderer.changed();
    }

    private onNodeInteractiveTypesRemoved(key: string, types: Set<string> | string[]) {
        this.instances.legendUI?.remove(key, types);

        // Update Graph is needed
        this.instances.nodesSet.resetArcs(key);
        this.instances.renderer.changed();
    }

    private onNodeInteractiveColorChanged(key: string, type: string, color: Color.Color) {
        this.instances.nodesSet.updateTypeColor(key, type, color);
        this.instances.legendUI?.update(key, type, color);
        this.instances.renderer.changed();
    }

    // ================================= LINKS =================================

    private onLinkTypesAdded(colorMaps: Map<string, Color.Color>) {
        // Update UI
        if (this.instances.legendUI) {
            for (const [type, color] of colorMaps) {
                this.instances.legendUI.add(LINK_KEY, type, color);
            }
        }
        // Update Graph is needed
        if (this.instances.settings.interactiveSettings[LINK_KEY].enableByDefault) {
            colorMaps.forEach((color, type) => {
                this.instances.linksSet.updateTypeColor(LINK_KEY, type, color);
            });
            this.instances.renderer.changed();
        }
    }

    private onLinkTypesRemoved(types: Set<string> | string[]) {
        this.instances.legendUI?.remove(LINK_KEY, types);
    }

    private onLinkColorChanged(type: string, color: Color.Color) {
        this.instances.linksSet.updateTypeColor(LINK_KEY, type, color);
        this.instances.legendUI?.update(LINK_KEY, type, color);
        this.instances.renderer.changed();
    }

    // ================================ FOLDERS ================================

    private onFoldersAdded(colorMaps: Map<string, Color.Color>) {
        // Update UI
        if (this.instances.foldersUI) {
            for (const [path, color] of colorMaps) {
                this.instances.foldersUI.add(FOLDER_KEY, path, color);
            }
        }
        // Update Graph is needed
        if (this.instances.settings.interactiveSettings[FOLDER_KEY].enableByDefault && this.instances.foldersSet) {
            for (const [path, color] of colorMaps) {
                this.instances.foldersSet.loadFolder(FOLDER_KEY, path);
            }
            this.instances.renderer.changed();
        }
    }

    private onFoldersRemoved(paths: Set<string> | string[]) {
        this.instances.foldersUI?.remove(FOLDER_KEY, paths);

        for (const path of paths) {
            this.removeBBox(path);
        }
    }

    private onFolderColorChanged(path: string, color: Color.Color) {
        if (!this.instances.foldersSet) return;
        this.instances.foldersSet.updateColor(FOLDER_KEY, path);
        this.instances.foldersUI?.update(FOLDER_KEY, path, color);
        this.instances.renderer.changed();
    }

    private disableFolders(paths: string[]) {
        this.instances.graphEventsDispatcher.listenStage = false;
        for (const path of paths) {
            this.removeBBox(path);
        }
        this.instances.graphEventsDispatcher.listenStage = true;
    }

    private enableFolders(paths: string[]) {
        this.instances.graphEventsDispatcher.listenStage = false;
        for (const path of paths) {
            this.addBBox(path);
        }
        this.instances.graphEventsDispatcher.listenStage = true;
    }

    private addBBox(path: string) {
        if (!this.instances.foldersSet) return;
        this.instances.foldersSet.loadFolder(FOLDER_KEY, path);
        this.instances.renderer.changed();
    }

    private removeBBox(path: string) {
        if (!this.instances.foldersSet) return;
        this.instances.foldersSet.removeFolder(path);
        this.instances.renderer.changed();
    }
}