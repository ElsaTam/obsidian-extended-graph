import { Graph } from "src/graph/graph";
import { GraphViewData } from "./viewData";
import { InteractiveManager } from "src/graph/interactiveManager";

export class GraphView {
    data = new GraphViewData();

    constructor(name: string) {
        this.data.name = name;
    }

    saveGraph(graph: Graph) {
        this.data.disconnectedLinks = Array.from(graph.disconnectedRelationships);
        this.data.disabledTags = Array.from(graph.disabledTags);
    }

    loadGraph(graph: Graph) {
        let tagsManager = graph.interactiveManagers.get("tag");
        (tagsManager) && tagsManager.disable(this.data.disabledTags);

        let relationshipsManager = graph.interactiveManagers.get("relationship");
        (relationshipsManager) && relationshipsManager.disable(this.data.disconnectedLinks);
    }
}