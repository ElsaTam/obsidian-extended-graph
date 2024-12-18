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
        this.data.filter = graph.leaf.view.dataEngine.filterOptions.search.inputEl.value;
        this.data.disabledLinks = graph.linksSet.linksManager.getTypes().filter(type => !graph.linksSet.linksManager.isActive(type));
        this.data.disabledTags = graph.nodesSet.tagsManager.getTypes().filter(type => !graph.nodesSet.tagsManager.isActive(type));
    }
}