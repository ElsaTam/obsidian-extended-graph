
import { App, Component, WorkspaceLeaf } from 'obsidian';
import { Renderer } from './renderer';
import { ExtendedGraphSettings } from '../settings';
import { InteractiveManager } from './interactiveManager';
import { GraphView } from 'src/views/view';
import { GraphViewData } from 'src/views/viewData';
import { NodesSet } from './nodesSet';
import { LinksSet } from './linksSet';
import { NONE_TYPE } from 'src/globalVariables';

export class Graph extends Component {
    nodesSet: NodesSet;
    linksSet: LinksSet;
    linkTypesMap = new Map<string, Set<string>>(); // key: link id / value: types
    interactiveManagers = new Map<string, InteractiveManager>();

    renderer: Renderer;
    app: App;
    leaf: WorkspaceLeaf;
    settings: ExtendedGraphSettings;

    constructor(renderer: Renderer, leaf: WorkspaceLeaf, app: App, settings: ExtendedGraphSettings) {
        super();
        this.renderer = renderer;
        this.app = app;
        this.leaf = leaf;
        this.settings = settings;

        // Initialize nodes and links sets
        this.nodesSet = new NodesSet(leaf, this.renderer, new InteractiveManager(leaf, this.settings, "tag"));
        this.linksSet = new LinksSet(leaf, this.renderer, new InteractiveManager(leaf, this.settings, "link"));
        this.interactiveManagers.set("tag", this.nodesSet.tagsManager);
        this.interactiveManagers.set("link", this.linksSet.linksManager);
        this.addChild(this.nodesSet.tagsManager);
        this.addChild(this.linksSet.linksManager);
    }

    onload() {
        let requestList: Promise<void>[] = [];
        requestList = requestList.concat(this.nodesSet.load(this.app, this.settings));
        requestList = requestList.concat(this.linksSet.load());

        Promise.all(requestList).then(res => {
            // Create link types
            this.linksSet.linksMap.forEach((linkWrapper, linkID) => {
                const sourceFile = this.nodesSet.get(linkWrapper.sourceID).file;

                this.linkTypesMap.set(linkID, new Set<string>());

                const forwardLinks = this.app.metadataCache.getFileCache(sourceFile)?.frontmatterLinks;
                if (!forwardLinks) return;

                // For each link in the frontmatters, check if target matches
                forwardLinks.forEach(linkCache => {
                    const linkType = linkCache.key.split('.')[0];
                    const targetID = linkCache.link + ".md";
                    if (targetID == linkWrapper.targetID) {
                        // Set the pair
                        this.linkTypesMap.get(linkID)?.add(linkType);
                    }
                })

                if (this.linkTypesMap.get(linkID)?.size == 0) {
                    this.linkTypesMap.get(linkID)?.add(NONE_TYPE);
                }

                const types = this.linkTypesMap.get(linkID);
                (types) && this.linksSet.get(linkID)?.setTypes(types);
            });

            // Initialize colors for each node/link type
            this.nodesSet.tagsManager.update(this.nodesSet.getAllTagTypesFromCache(this.app));
            this.linksSet.linksManager.update(this.getAllLinkTypes());

            this.leaf.trigger('extended-graph:graph-ready');
        });
    }

    getAllLinkTypes() : Set<string> {
        let types = new Set<string>();
        this.linkTypesMap.forEach(linkTypes => {
            types = new Set([...types, ...linkTypes]);
        });
        return types;
    }
    
    updateWorker() : void {
        this.renderer.worker.postMessage({
            nodes: this.renderer.nodes.map(node => [node.x, node.y]),
            links: this.renderer.links.map(link => [link.source.id, link.target.id]),
            alpha: .3,
            run: !0
        });
    }

    loadView(viewData: GraphViewData) : void {
        this.nodesSet.loadView(viewData);
        this.linksSet.loadView(viewData);
    }

    newView(name: string) : void {
        let view = new GraphView(name);
        view.setID();
        view.saveGraph(this);
        this.app.workspace.trigger('extended-graph:view-needs-saving', view.data);
    }

    saveView(id: string) : void {
        let viewData = this.settings.views.find(v => v.id == id);
        if (!viewData) return;
        let view = new GraphView(viewData?.name);
        view.setID(id);
        view.saveGraph(this);
        this.app.workspace.trigger('extended-graph:view-needs-saving', view.data);
    }


    test() : void {
        
    }
}
