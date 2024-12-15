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
        this.data.disabledLinks = Array.from(graph.disconnectedLinks);
        this.data.disabledTags = Array.from(graph.disabledTags);
    }

    loadGraph(graph: Graph) {
        let tagsManager = graph.interactiveManagers.get("tag");
        (tagsManager) && tagsManager.disable(this.data.disabledTags);

        let linksManager = graph.interactiveManagers.get("link");
        (linksManager) && linksManager.disable(this.data.disabledLinks);
    }
}