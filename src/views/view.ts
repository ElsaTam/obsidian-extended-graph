import { Graph } from "src/graph/graph";
import { GraphViewData } from "./viewData";

export class GraphView {
    data = new GraphViewData();

    constructor(name: string) {
        this.data.name = name;
    }

    setID(id?: string) {
        this.data.id = id ? id : crypto.randomUUID();
    }

    saveGraph(graph: Graph) {
        // @ts-ignore
        let engine: any = this.leaf.view.dataEngine ? this.leaf.view.dataEngine : this.leaf.view.engine;
        this.data.filter = engine.filterOptions.search.inputEl.value;
        this.data.disabledLinks = graph.linksSet.linksManager.getTypes().filter(type => !graph.linksSet.linksManager.isActive(type));
        this.data.disabledTags = graph.nodesSet.tagsManager.getTypes().filter(type => !graph.nodesSet.tagsManager.isActive(type));
    }
}