import { AbstractInputSuggest } from "obsidian";
import { ExtendedGraphNode, FOLDER_KEY } from "../internal";
import { GraphInstances, ExtendedGraphInstances } from "../pluginInstances";

type SetType = 'nodes' | 'pinned' | 'folders';

export class ExtendedElementsSuggester extends AbstractInputSuggest<string> {
    instances: GraphInstances;
    set: SetType;
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, instances: GraphInstances, set: SetType, callback: (value: string) => void) {
        super(ExtendedGraphInstances.app, textInputEl);
        this.instances = instances;
        this.set = set;
        this.callback = callback;
    }

    protected getSuggestions(query: string): string[] {
        switch (this.set) {
            case 'nodes':
                return [...this.instances.nodesSet.extendedElementsMap.keys()]
                    .filter(id => new RegExp(query, "i").exec(id))
            case 'pinned':
                return [...this.instances.nodesSet.extendedElementsMap.values()]
                    .reduce((acc: string[], curr: ExtendedGraphNode) => {
                        if (curr.isPinned && new RegExp(query, "i").exec(curr.id)) acc.push(curr.id);
                        return acc;
                    }, []);
            case 'folders':
                if (!this.instances.foldersSet) return [];
                const manager = this.instances.foldersSet.managers.get(FOLDER_KEY);
                if (!manager) return [];

                return manager.getTypesWithoutNone()
                    .filter(id => new RegExp(query, "i").exec(id));
        }
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.textContent = value;
    }

    selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
        this.setValue(value);
        this.callback(value);
        this.close();
    }
}