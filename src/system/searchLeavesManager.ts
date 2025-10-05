import { Component, TFile, View } from "obsidian";
import { ExtendedGraphInstances } from "../pluginInstances";

export class SearchLeavesManager extends Component {
    observedSearched: Map<View, { childrenEl: HTMLDivElement, results: string[] }> = new Map();
    searchObserver: MutationObserver;

    override onload(): void {
        this.createSearchObserver();
    }

    private createSearchObserver(): void {
        this.searchObserver = new MutationObserver((mutationsList, obs) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    const entry = this.observedSearched.entries().find((entry) => {
                        return entry[1].childrenEl === mutation.target;
                    });
                    if (entry) {
                        this.computeSearchNodes(entry[0]);
                    }
                }
            }
        });
    }


    observeSearchViews(): void {
        const searchLeaves = ExtendedGraphInstances.app.workspace.getLeavesOfType("search");

        // Remove any observed search that is no longer valid
        for (const view of Array.from(this.observedSearched.keys())) {
            if (!searchLeaves.find(leaf => leaf.view === view && !leaf.isDeferred)) {
                this.observedSearched.delete(view);
            }
        }

        // Observe newly opened search leaves
        for (const leaf of searchLeaves) {
            const view = leaf.view;
            if (!("dom" in view && view.dom && typeof view.dom === "object")) continue;
            if (!("resultDomLookup" in view.dom && view.dom.resultDomLookup && view.dom.resultDomLookup instanceof Map)) return;
            if (!("childrenEl" in view.dom && view.dom.childrenEl && view.dom.childrenEl instanceof HTMLDivElement)) continue;

            const childrenEl = view.dom.childrenEl;

            if (!this.observedSearched.has(view) || this.observedSearched.get(view)?.childrenEl !== childrenEl) {
                this.searchObserver.observe(childrenEl, { childList: true });
                this.observedSearched.set(view, { childrenEl: childrenEl, results: [] });
            }
        }
    }

    private computeSearchNodes(view: View): void {
        if (view.getViewType() !== "search") return;
        if (view.leaf.isDeferred) return;

        const entry = this.observedSearched.get(view);
        if (!entry) return;

        if (!("dom" in view && view.dom && typeof view.dom === "object")) return;
        if (!("resultDomLookup" in view.dom && view.dom.resultDomLookup && view.dom.resultDomLookup instanceof Map)) return;
        const resultDomLookup = view.dom.resultDomLookup;

        // Find the current search results
        const newResults: string[] = [];
        for (const file of resultDomLookup.keys()) {
            if (file instanceof TFile) {
                newResults.push(file.path);
            }
        }

        // Update the nodes accordingly
        const nodesRemoved = entry.results.filter(id => !newResults.contains(id));
        const nodesAdded = newResults.filter(id => !entry.results.contains(id));
        if (nodesRemoved.length > 0 || nodesAdded.length > 0) {
            for (const instances of ExtendedGraphInstances.graphsManager.allInstances.values()) {
                if (!instances.settings.enableFeatures[instances.type].focus || !instances.settings.highlightSearchResults)
                    continue;
                let hasChanged = false;
                for (const id of nodesRemoved) {
                    const node = instances.nodesSet.extendedElementsMap.get(id);
                    if (node) {
                        node.toggleIsSearchResult(false);
                        hasChanged = true;
                    }
                }
                for (const id of nodesAdded) {
                    const node = instances.nodesSet.extendedElementsMap.get(id);
                    if (node) {
                        node.toggleIsSearchResult(true);
                        hasChanged = true;
                    }
                }
                if (hasChanged) {
                    instances.renderer.changed();
                }
            }
        }

        entry.results = newResults;
    }

    isSearchResult(path: string): boolean {
        for (const entry of this.observedSearched.values()) {
            if (entry.results.contains(path)) return true;
        }
        return false;
    }

    getSearchResults(): string[] {
        return this.observedSearched.values().reduce((acc: string[], entry) => {
            return acc.concat(entry.results);
        }, []);
    }
}