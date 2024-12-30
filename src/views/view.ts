import { Graph } from "src/graph/graph";
import { EngineOptions, GraphViewData } from "./viewData";

export class GraphView {
    data = new GraphViewData();

    constructor(name: string) {
        this.data.name = name;
    }

    setID(id?: string) {
        this.data.id = id ? id : crypto.randomUUID();
    }

    saveGraph(graph: Graph) {
        this.data.disabledTypes["link"] = graph.linksSet.linksManager ? graph.linksSet.linksManager.getTypes().filter(type => !graph.linksSet.linksManager?.isActive(type)) : [];
        for (const [key, manager] of graph.nodesSet.managers) {
            this.data.disabledTypes[key] = manager.getTypes().filter(type => !manager.isActive(type));
        }
        this.data.engineOptions = new EngineOptions(graph.engine.getOptions());
        this.data.engineOptions.search = graph.engine.filterOptions.search.inputEl.value;
    }
}