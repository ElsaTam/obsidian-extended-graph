import { GraphPluginOptions } from "./graphPluginInstance";

export interface GraphEngine {
    filterOptions: FilterOptions;
    getOptions: () => GraphPluginOptions;
    setOptions: (options: GraphPluginOptions | undefined) => void;
    updateSearch: () => void;
}

export interface FilterOptions {
    search: {
        inputEl: HTMLInputElement;
        getValue: () => string;
    };
}