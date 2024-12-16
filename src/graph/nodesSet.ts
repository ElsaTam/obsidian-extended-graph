import { App, TFile, WorkspaceLeaf } from "obsidian";
import { Node, NodeWrapper } from "./node";
import { Renderer } from "./renderer";
import { ExtendedGraphSettings } from "src/settings";
import { InteractiveManager } from "./interactiveManager";
import { GraphViewData } from "src/views/viewData";
import { getBackgroundColor } from "src/helperFunctions";

export class NodesSet {
    nodesMap = new Map<string, NodeWrapper>();
    connectedNodes = new Set<string>();
    disconnectedNodes = new Set<string>();
    disabledTags = new Set<string>();
    
    spritesSize: number = 200;
    
    leaf: WorkspaceLeaf;
    renderer: Renderer;
    tagsManager: InteractiveManager

    constructor(leaf: WorkspaceLeaf, renderer: Renderer, tagsManager: InteractiveManager) {
        this.leaf = leaf;
        this.renderer = renderer;
        this.tagsManager = tagsManager;
    }

    load(app: App, settings: ExtendedGraphSettings) : Promise<void>[] {
        let requestList: Promise<void>[] = [];
        this.renderer.nodes.forEach((node: Node) => {
            let nodeWrapper = new NodeWrapper(node, app);
            let requestInit: Promise<void> = nodeWrapper.init(app, settings.imageProperty);
            requestList.push(requestInit.then(() => {
                this.nodesMap.set(node.id, nodeWrapper);
                this.connectedNodes.add(node.id);
            },
            () => {
                nodeWrapper.destroy();
            }));
        });
        return requestList;
    }

    get(id: string) : NodeWrapper {
        let node = this.nodesMap.get(id);
        if (!node) {
            throw new Error(`No node for id ${id}.`)
        }
        return node;
    }
    
    updateBackground() : void {
        this.nodesMap.forEach(container => {
            container.updateBackgroundColor(getBackgroundColor(this.renderer));
        });
    }

    checkRendererReady() : boolean {
        if (!(this.renderer.px
                && this.renderer.px.stage
                && this.renderer.px.stage.children
                && this.renderer.px.stage.children.length >= 2
                && this.renderer.px.stage.children[1].children)) {
            return false;
        }

        const stageChildren = this.renderer.px.stage.children[1].children;
        const stageNodes = stageChildren?.filter((child) => {
            let children = child.children;
            return (children) && (children.length > 0) && (children[0].constructor.name === "NodeWrapper");
        });
        if (!stageNodes) return true;

        for (const stageNode of stageNodes) {
            let correspondingNode = this.renderer.nodes.find(node => node.circle === stageNode);
            if (!correspondingNode) return false;
        }
        return true;
    }

    updateNodesFromEngine() {
        new Promise<void>((resolve) => {
            let timesRun = 0;
            const intervalId = setInterval(() => {
                timesRun += 1;
                if (this.checkRendererReady()) { clearInterval(intervalId); resolve(); }
                else if (timesRun === 10)      { clearInterval(intervalId); }
            }, 100);
        }).then(() => {
            const newNodesIDs = this.renderer.nodes.map(n => n.id);
            let nodesToAdd: string[] = [];
            let nodesToRemove: string[] = [];
            this.disconnectedNodes.forEach((_, id) => {
                if (newNodesIDs.includes(id)) {
                    nodesToAdd.push(id);
                }
            });
            this.connectedNodes.forEach((_, id) => {
                if (!newNodesIDs.includes(id)) {
                    nodesToRemove.push(id);
                }
            });
            for (const id of nodesToAdd) {
                let node = this.renderer.nodes.find(n => n.id === id);
                const nodeWrapper = this.nodesMap.get(id);
                if (!node) {
                    return;
                }
                if (!nodeWrapper) {
                    return;
                }
    
                nodeWrapper.node = node;
                nodeWrapper.waitReady().then(() => {
                    node.circle.addChild(nodeWrapper);
                });
    
                this.disconnectedNodes.delete(id);
                this.connectedNodes.add(id);
            };
            nodesToRemove.forEach(id => {
                this.connectedNodes.delete(id);
                this.disconnectedNodes.add(id);
            });
    
            (nodesToAdd.length > 0) && console.log("Nodes to add: ", nodesToAdd);
            (nodesToRemove.length > 0) && console.log("Nodes to remove: ", nodesToRemove);
        })
    }
    
    getNodeWrapperFromFile(file: TFile) : NodeWrapper {
        let foundContainer = null;
        this.nodesMap.forEach((container: NodeWrapper) => {
            if (container.file === file) {
                foundContainer = container;
                return;
            }
        });
        throw new Error(`No node wrapper found for file ${file.name}.`);
    }

    getAllTagTypesFromCache(app: App) : Set<string> {
        let types = new Set<string>();

        this.nodesMap.forEach(container => {
            let nodeTypes = container.getTagsTypes(app);
            nodeTypes.forEach(type => types.add(type));
        });

        if (types.size == 0) {
            types.add("none");
        }
        
        return types;
    }
    
    disableTag(type: string) : void {
        this.disabledTags.add(type);
        let disabledNodes: string[] = [];
        this.nodesMap.forEach((wrapper: NodeWrapper, id: string) => {
            if (!wrapper.hasTagType(type)) return;

            const wasActive = wrapper.isActive;
            wrapper.updateArcState(type, this.tagsManager);
            if(wrapper.isActive != wasActive && !wrapper.isActive) {
                disabledNodes.push(id);
            }
        });

        (disabledNodes.length > 0) && this.disableNodes(disabledNodes);
    }

    enableTag(type: string) : void {
        this.disabledTags.delete(type);
        let enabledNodes: string[] = [];
        this.nodesMap.forEach((wrapper: NodeWrapper, id: string) => {
            if (!wrapper.hasTagType(type)) return;
            
            const wasActive = wrapper.isActive;
            wrapper.updateArcState(type, this.tagsManager);
            if(wrapper.isActive != wasActive) {
                (wrapper.isActive) && enabledNodes.push(id);
            }
        });
        (enabledNodes.length > 0) && this.enableNodes(enabledNodes);
    }
    
    resetArcs() : void {
        this.nodesMap.forEach((wrapper: NodeWrapper) => {
            wrapper.removeArcs();
            wrapper.addArcs(this.tagsManager);
        });
    }

    removeArcs(ids?: string[]) : void {
        this.nodesMap.forEach(w => w.removeArcs(ids));
    }

    updateArcsColor(type: string, color: Uint8Array) : void {
        this.nodesMap.forEach(c => c.updateArc(type, color, this.tagsManager));
    }

    disableNodes(ids: string[]) : void {
        let newFilter = "";
        for(const id of [...this.disconnectedNodes].concat(ids)) {
            newFilter += ` -path:"${id}"`
        }
        this.applyAdditionalFilter(newFilter);
    }

    enableNodes(ids: string[]) : void {
        let newFilter = "";
        let disconnectedNodes = [...this.disconnectedNodes].filter(id => !ids.includes(id));
        for(const id of disconnectedNodes) {
            newFilter += ` -path:"${id}"`
        }
        this.applyAdditionalFilter(newFilter);
    }

    private applyAdditionalFilter(newFilter: string) {
        // @ts-ignore
        let engine: any = this.leaf.view.dataEngine;
        let query = [];
        let filter = engine.filterOptions.search.getValue();
        filter += newFilter;
        (filter) && query.push({
            query: filter,
            color: null
        }),
        query = query.concat(engine.colorGroupOptions.getColoredQueries()),
        engine.setQuery(query),
        engine.onOptionsChange();
    }
    
    loadView(viewData: GraphViewData) : void {
        // Enable/Disable tags
        let tagsToDisable: string[] = [];
        let tagsToEnable: string[] = [];
        this.tagsManager.getTypes().forEach(type => {
            if (this.tagsManager.isActive(type) && viewData?.disabledTags.includes(type)) {
                tagsToDisable.push(type);
            }
            else if (!this.tagsManager.isActive(type) && !viewData?.disabledTags.includes(type)) {
                tagsToEnable.push(type);
            }
        });
        this.tagsManager.disable(tagsToDisable);
        this.tagsManager.enable(tagsToEnable);
    }
}