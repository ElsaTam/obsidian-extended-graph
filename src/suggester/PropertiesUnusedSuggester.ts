import { PropertiesSuggester } from "../internal";
import { ExtendedGraphInstances } from "../pluginInstances";

export class PropertiesUnusedSuggester extends PropertiesSuggester {
    protected getStringSuggestions(query: string): string[] {
        const properties = super.getStringSuggestions(query);
        return properties.filter(p => !(p in ExtendedGraphInstances.settings.additionalProperties))
    }
}