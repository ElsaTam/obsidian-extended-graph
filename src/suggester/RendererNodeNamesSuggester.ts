import { AbstractInputSuggest } from "obsidian";
import { GraphRenderer } from "obsidian-typings";
import { ExtendedGraphInstances } from "../pluginInstances";

export class RendererNodeNamesSuggester extends AbstractInputSuggest<string> {
    renderer: GraphRenderer;
    callback: (value: string) => void;

    constructor(textInputEl: HTMLInputElement | HTMLDivElement, renderer: GraphRenderer, callback: (value: string) => void) {
        super(ExtendedGraphInstances.app, textInputEl);
        this.renderer = renderer;
        this.callback = callback;
    }

    protected getSuggestions(query: string): string[] {
        return this.renderer.nodes.filter(node => new RegExp(query, "i").exec(node.id)).map(node => node.id);
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