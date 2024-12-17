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
        this.data.disabledLinks = graph.linksSet.linksManager.getTypes().filter(type => !graph.linksSet.linksManager.isActive(type));
        this.data.disabledTags = graph.nodesSet.tagsManager.getTypes().filter(type => !graph.nodesSet.tagsManager.isActive(type));
    }

    loadGraph(graph: Graph) {
        graph.nodesSet.tagsManager.disable(this.data.disabledTags);
        graph.linksSet.linksManager.disable(this.data.disabledLinks);
    }
}