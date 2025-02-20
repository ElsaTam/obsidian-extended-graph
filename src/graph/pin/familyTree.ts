import { BCAPI, dSeeder, getFile, Pinner, TreeNode } from "src/internal";
import { GraphInstances } from "src/pluginInstances";
import * as dTree from "d3-dtree";
import STRINGS from "src/Strings";

export class FamilyTree {
    instances: GraphInstances;
    bc: BCAPI;

    constructor(instances: GraphInstances) {
        this.instances = instances;
    }

    async create() {
        await this.prepareAPI();

        if (!this.checkSettings()) return;

        this.filterOutNodes();

        const {treeNodes, nodeMap} = this.getTreeNodes();
        if (treeNodes.length === 0) return;

        const seededData = this.getSeededData(treeNodes);
        const pins = this.getPinData(seededData, nodeMap);
        this.pinFamilyTree(pins);
    }

    private async prepareAPI() {
        // @ts-ignore
        this.bc = window.BCAPI as BCAPI;
        console.log(this.bc);
        await this.bc.refreshIndex();
        this.bc.buildObsGraph();
    }

    private getTreeNodes(): {treeNodes: TreeNode[], nodeMap: Map<number, string>} {
        const nodes = Object.fromEntries([...this.instances.nodesSet.extendedElementsMap.values()]
            .filter(n => n.id.includes("Family"))
            .map(node => [getFile(node.id)?.basename ?? node.id, node]));
        console.log(nodes);
    
        const data: TreeNode[] = [];
        const map = new Map<number, string>();
        let i = 0;
        for (const [basename, node] of Object.entries(nodes)) {
            data.push(new TreeNode({id: i, name: basename, depthOffset: 0}));
            map.set(i, node.id);
            i++;
        }
        return {
            treeNodes: data,
            nodeMap: map,
        };
    }

    private getSeededData(treeNodes: TreeNode[]): TreeNode[] {
        let upperId: number | undefined = treeNodes[0].id;
        for (const treeNode of treeNodes) {
            const neighbors = this.bc.getMatrixNeighbours(treeNode.name);
            const index = treeNodes.findIndex(d => d.name === treeNode.name);
            if (index == -1 || treeNodes[index].id === undefined) continue;

            for (const up of neighbors.up.reals) {
                if (treeNodes[index].parent1Id) {
                    if (treeNodes[index].parent2Id) {
                        break;
                    }
                    treeNodes[index].parent2Id = treeNodes.find(d => d.name === up.to)?.id ?? null;
                }
                else {
                    treeNodes[index].parent1Id = treeNodes.find(d => d.name === up.to)?.id ?? null;
                    if (treeNodes[index].parent1Id) upperId = treeNodes[index].parent1Id;
                }
            }

            for (const down of neighbors.down.reals) {
                const childIndex = treeNodes.findIndex(d => d.name === down.to);
                if (!childIndex) continue;

                if (treeNodes[childIndex].parent1Id) {
                    if (treeNodes[childIndex].parent2Id) {
                        continue;
                    }
                    treeNodes[childIndex].parent2Id = treeNodes[index].id;
                }
                else {
                    treeNodes[childIndex].parent1Id = treeNodes[index].id;
                    upperId = treeNodes[index].id;
                }
            }
        }
        return dSeeder.seed(treeNodes, upperId ?? 0, {preserveParentIds: true});
    }

    private getPinData(seededData: TreeNode[], nodeMap: Map<number, string>): {id: string, x: number, y: number}[] {
        const container = createDiv();
        document.body.insertAdjacentElement('afterbegin', container);
        container.id = "tree-" + this.instances.view.leaf.id;

        const pins: {id: string, x: number, y: number}[] = [];

        const tree = dTree.init(seededData, {
            target: "#tree-" + this.instances.view.leaf.id,
            debug: true,
            width: 900,
            height: 600,
            callbacks: {
                nodeRenderer: function(name: string, x: number, y: number, height: number, width: number, extra: any, id: number, nodeClass: string, textClass: string, textRenderer: any) {
                    const extendedNodeId = [...nodeMap.values()].find(path => getFile(path)?.basename === name);
                    if (extendedNodeId) pins.push({id: extendedNodeId, x: x, y: y});
                    let node = '';
                    node += '<div ';
                    node += 'style="height:100%;width:100%;" ';
                    node += 'class="' + nodeClass + '" ';
                    node += 'id="node' + id + '">\n';
                    node += name;
                    node += '</div>';
                    return node;
                }
            }
        });

        container.remove();

        return pins;
    }

    private pinFamilyTree(nodes: {id: string, x: number, y: number}[]) {
        setTimeout(() => {
            const pinner = new Pinner(this.instances);
            for (const node of nodes) {
                pinner.pinNode(node.id, node.x, node.y);
            }
        }, 1000)
    }

    private checkSettings(): boolean {
        const hiearchy = this.bc.plugin.settings.userHiers[0];

        const upKey = hiearchy.up[0];
        const downKey = hiearchy.down[0];

        let valid = true;
        if (!this.instances.settings.additionalProperties[upKey]) {
            console.error(`${STRINGS.features.familyTree.noUpKey} (${upKey}). ${STRINGS.features.familyTree.impossibleToBuild}`);
            valid = false;
        }
        if (!this.instances.settings.additionalProperties[downKey]) {
            console.error(`${STRINGS.features.familyTree.noUpKey} (${downKey}). ${STRINGS.features.familyTree.impossibleToBuild}`);
            valid = false;
        }

        return valid;
    }

    private filterOutNodes() {
        const hiearchy = this.bc.plugin.settings.userHiers[0];
        
        const upKey = hiearchy.up[0];
        const downKey = hiearchy.down[0];
        this.instances.interactiveManagers.get(upKey)?.disable([this.instances.settings.interactiveSettings[upKey].noneType]);
        this.instances.interactiveManagers.get(downKey)?.disable([this.instances.settings.interactiveSettings[downKey].noneType]);
    }
}