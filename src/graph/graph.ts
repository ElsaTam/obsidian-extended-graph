
import { App, Component, WorkspaceLeaf } from 'obsidian';
import { Renderer } from './renderer';
import { ExtendedGraphSettings } from '../settings';
import { InteractiveManager } from './interactiveManager';
import { GraphView } from 'src/views/view';
import { NodesSet } from './nodesSet';
import { LinksSet } from './linksSet';
import { FUNC_NAMES, NONE_TYPE } from 'src/globalVariables';

export class Graph extends Component {
    nodesSet: NodesSet;
    linksSet: LinksSet;
    linkTypesMap = new Map<string, Set<string>>(); // key: type / value: link ids
    interactiveManagers = new Map<string, InteractiveManager>();

    renderer: Renderer;
    app: App;
    leaf: WorkspaceLeaf;
    settings: ExtendedGraphSettings;

    constructor(renderer: Renderer, leaf: WorkspaceLeaf, app: App, settings: ExtendedGraphSettings) {
        FUNC_NAMES && console.log("[Graph] new");
        super();
        this.renderer = renderer;
        this.app = app;
        this.leaf = leaf;
        this.settings = settings;

        // Initialize nodes and links sets
        this.nodesSet = new NodesSet(leaf, this.renderer, new InteractiveManager(leaf, this.settings, "tag"), app, settings);
        this.linksSet = new LinksSet(leaf, this.renderer, new InteractiveManager(leaf, this.settings, "link"));
        this.interactiveManagers.set("tag", this.nodesSet.tagsManager);
        this.interactiveManagers.set("link", this.linksSet.linksManager);
        this.addChild(this.nodesSet.tagsManager);
        this.addChild(this.linksSet.linksManager);
    }

    onload() {
        FUNC_NAMES && console.log("[Graph] onload");
        let requestList: Promise<void>[] = [];
        requestList = requestList.concat(this.nodesSet.load());
        requestList = requestList.concat(this.linksSet.load());

        Promise.all(requestList).then(res => {
            // Create link types
            this.linksSet.linksMap.forEach((linkWrapper, linkID) => {
                const sourceFile = this.nodesSet.get(linkWrapper.sourceID).file;

                let types = new Set<string>();

                const frontmatterLinks = this.app.metadataCache.getFileCache(sourceFile)?.frontmatterLinks;
                if (frontmatterLinks) {
                    // For each link in the frontmatters, check if target matches
                    frontmatterLinks.forEach(linkCache => {
                        const linkType = linkCache.key.split('.')[0];
                        const targetID = linkCache.link + ".md";
                        if (targetID == linkWrapper.targetID) {
                            // Set the pair
                            (!this.linkTypesMap.get(linkType)) &&  this.linkTypesMap.set(linkType, new Set<string>());
                            this.linkTypesMap.get(linkType)?.add(linkID);
                            types.add(linkType);
                        }
                    });
                }
                if (!frontmatterLinks || types.size === 0) {
                    (!this.linkTypesMap.get(NONE_TYPE)) &&  this.linkTypesMap.set(NONE_TYPE, new Set<string>());
                    this.linkTypesMap.get(NONE_TYPE)?.add(linkID);
                    types.add(NONE_TYPE);
                }

                linkWrapper.setTypes(types);
            });

            // Initialize colors for each node/link type
            this.nodesSet.tagsManager.update(this.nodesSet.getAllTagTypesFromCache(this.app));
            this.linksSet.linksManager.update(this.getAllLinkTypes());

            this.leaf.trigger('extended-graph:graph-ready');
        });
    }

    getAllLinkTypes() : Set<string> {
        FUNC_NAMES && console.log("[Graph] getAllLinkTypes");
        return new Set<string>(this.linkTypesMap.keys());
    }

    getLinks(types: string[]) : Set<string> {
        let links = new Set<string>();
        types.forEach(type => {
            this.linkTypesMap.get(type)?.forEach(linkID => {
                links.add(linkID);
            })
        });
        return links;
    }

    disableLinkTypes(types: string[]) {
        FUNC_NAMES && console.log("[LinksSet] disableLinkTypes");
        if (this.linksSet.disableLinks(this.getLinks(types))) {
            this.leaf.trigger('extended-graph:engine-needs-update');
        }
    }

    enableLinkTypes(types: string[]) {
        FUNC_NAMES && console.log("[LinksSet] enableLinkTypes");
        if (this.linksSet.enableLinks(this.getLinks(types))) {
            this.leaf.trigger('extended-graph:engine-needs-update');
        }
    }
        
    updateWorker() : void {
        FUNC_NAMES && console.log("[LinksSet] updateWorker");
        let nodes: any = {};
        this.nodesSet.connectedNodes.forEach(id => {
            nodes[id] = [this.nodesSet.get(id).node.x, this.nodesSet.get(id).node.y];
        });

        let links: any = [];
        this.linksSet.connectedLinks.forEach(id => {
            links.push([this.linksSet.get(id).sourceID, this.linksSet.get(id).targetID]);
        });

        this.renderer.worker.postMessage({
            nodes: nodes,
            links: links,
            alpha: .3,
            run: !0
        });
    }

    newView(name: string) : void {
        FUNC_NAMES && console.log("[Graph] newView");
        let view = new GraphView(name);
        view.setID();
        view.saveGraph(this);
        this.app.workspace.trigger('extended-graph:view-needs-saving', view.data);
    }

    saveView(id: string) : void {
        FUNC_NAMES && console.log("[Graph] saveView");
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
