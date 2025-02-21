import { ButtonComponent, ExtraButtonComponent, Modal, Setting, TFile } from "obsidian";
import { getFile, GraphInstances, GraphState, NodeShape, PluginInstances } from "src/internal";
import STRINGS from "src/Strings";

export class GraphStateModal extends Modal {
    state: GraphState;
    instances: GraphInstances;
    sortableTables: Record<string, {
        asc: (boolean | undefined)[],
        sortIndex: number,
        table: HTMLTableElement,
        rows: HTMLTableRowElement[],
        page: number,
        pagination: HTMLDivElement,
        maxRows: number
    }> = {};
    defaultMaxRows: number = 10;

    constructor(instances: GraphInstances) {
        super(PluginInstances.app);
        this.instances = instances;
        this.state = new GraphState("");
        this.state.saveGraph(instances);
        this.setTitle(STRINGS.states.graphState);
        this.modalEl.addClass("graph-modal-graph-state");
    }

    onOpen() {
        this.addNodes();
        this.addLinks();
        this.addPinnedNodes();
    }

    private addNodes() {
        const hasRows = this.instances.nodesSet.extendedElementsMap.size > 0;

        this.createHeading(STRINGS.plugin.nodes, "nodes", hasRows);

        const table = this.contentEl.createEl("table");
        const colgroup = table.createEl("colgroup");

        const thead = table.createTHead();
        const tr_thead = thead.insertRow();

        let cell: HTMLTableCellElement;
        cell = tr_thead.insertCell(); cell.setText(STRINGS.plugin.folder);
        colgroup.createEl("col").addClass("col-folder");
        cell = tr_thead.insertCell(); cell.setText(STRINGS.plugin.nodeName);
        colgroup.createEl("col").addClass("col-filename");
        cell = tr_thead.insertCell(); cell.setText(STRINGS.controls.enabled);
        colgroup.createEl("col").addClass("col-enabled");
        for (const [key, manager] of this.instances.nodesSet.managers) {
            cell = tr_thead.insertCell(); cell.setText(key);
            colgroup.createEl("col").addClass("col-key-" + key);
        }
        if (this.instances.settings.enableFeatures[this.instances.type]['shapes']) {
            cell = tr_thead.insertCell(); cell.setText(STRINGS.features.shape);
            colgroup.createEl("col").addClass("col-shape");
        }
        if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats']) {
            cell = tr_thead.insertCell(); cell.setText(STRINGS.features.size);
            colgroup.createEl("col").addClass("col-size");
        }

        if (!hasRows) return;

        const tbody = table.createTBody();

        for (const [id, extendedNode] of this.instances.nodesSet.extendedElementsMap) {
            const nodeData = this.getNodeData(id);

            const tr = tbody.insertRow();
            let cell: HTMLTableCellElement;
            cell = tr.insertCell(); cell.setText(nodeData.path);
            cell = tr.insertCell(); nodeData.link ? cell.appendChild(nodeData.link) : cell.setText(id);
            cell = tr.insertCell(); if (!extendedNode.isAnyManagerDisabled()) cell.setText("✓");

            for (const [key, manager] of this.instances.nodesSet.managers) {
                cell = tr.insertCell();
                cell.addClass("column-interactives");
                const types = extendedNode.types.get(key);
                if (types) {
                    for (const type of types) {
                        const color = manager.getColor(type);
                        const span = cell.createEl("span");
                        span.addClass("tag");
                        if (!manager.isActive(type)) span.addClass("is-disabled");
                        span.style.setProperty("--interactive-color", `${color[0]}, ${color[1]}, ${color[2]}`);
                        span.setText(type);
                    }
                }
            }

            if (this.instances.settings.enableFeatures[this.instances.type]['shapes'] && extendedNode.graphicsWrapper) {
                cell = tr.insertCell();
                cell.createDiv().appendChild(NodeShape.getSVG(extendedNode.graphicsWrapper.shape)).addClass("shape-svg");
            }

            if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats']) {
                cell = tr.insertCell(); cell.setText(extendedNode.getSizeWithoutScaling().toFixed(2));
            }
        }

        this.prepareTable("nodes", table);
    }

    private addLinks() {
        const hasRows = this.instances.linksSet.extendedElementsMap.size > 0;

        this.createHeading("Links", "links", hasRows);

        const table = this.contentEl.createEl("table");
        const colgroup = table.createEl("colgroup");

        const thead = table.createTHead();
        const tr_thead = thead.insertRow();
        let cell: HTMLTableCellElement;

        cell = tr_thead.insertCell(); cell.setText(`${STRINGS.plugin.folder} (${STRINGS.plugin.source})`);
        colgroup.createEl("col").addClasses(["col-folder", "col-folder-source"]);
        cell = tr_thead.insertCell(); cell.setText(`${STRINGS.plugin.nodeName} (${STRINGS.plugin.source})`);
        colgroup.createEl("col").addClasses(["col-filename", "col-filename-source"]);
        cell = tr_thead.insertCell(); cell.setText(`${STRINGS.plugin.folder} (${STRINGS.plugin.target})`);
        colgroup.createEl("col").addClasses(["col-folder", "col-folder-target"]);
        cell = tr_thead.insertCell(); cell.setText(`${STRINGS.plugin.nodeName} (${STRINGS.plugin.target})`);
        colgroup.createEl("col").addClasses(["col-filename", "col-filename-target"]);
        cell = tr_thead.insertCell(); cell.setText(STRINGS.controls.enabled);
        colgroup.createEl("col").addClass("col-enabled");
        for (const [key, manager] of this.instances.linksSet.managers) {
            cell = tr_thead.insertCell(); cell.setText(key);
            colgroup.createEl("col").addClass("col-key-" + key);
        }
        if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats']) {
            cell = tr_thead.insertCell(); cell.setText(STRINGS.features.size);
            colgroup.createEl("col").addClass("col-size");
        }

        if (!hasRows) return;

        const tbody = table.createTBody();

        for (const [id, extendedLink] of this.instances.linksSet.extendedElementsMap) {
            const nodeSourceData = this.getNodeData(extendedLink.coreElement.source.id);
            const nodeTargetData = this.getNodeData(extendedLink.coreElement.target.id);

            const tr = tbody.insertRow();
            let cell: HTMLTableCellElement;
            cell = tr.insertCell(); cell.setText(nodeSourceData.path);
            cell = tr.insertCell(); nodeSourceData.link ? cell.appendChild(nodeSourceData.link) : cell.setText(extendedLink.coreElement.source.id);
            cell = tr.insertCell(); cell.setText(nodeTargetData.path);
            cell = tr.insertCell(); nodeTargetData.link ? cell.appendChild(nodeTargetData.link) : cell.setText(extendedLink.coreElement.target.id);
            cell = tr.insertCell(); if (!extendedLink.isAnyManagerDisabled()) cell.setText("✓");

            for (const [key, manager] of this.instances.linksSet.managers) {
                cell = tr.insertCell();
                cell.addClass("column-interactives");
                const types = extendedLink.types.get(key);
                if (types) {
                    for (const type of types) {
                        const color = manager.getColor(type);
                        const span = cell.createEl("span");
                        span.addClass("tag");
                        if (!manager.isActive(type)) span.addClass("is-disabled");
                        span.style.setProperty("--interactive-color", `${color[0]}, ${color[1]}, ${color[2]}`);
                        span.setText(type);
                    }
                }
            }

            if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats']) {
                cell = tr.insertCell(); cell.setText(extendedLink.getThicknessScale().toFixed(2));
            }
        }

        this.prepareTable("links", table);
    }

    private addPinnedNodes() {
        const hasRows = this.state.data.pinNodes && Object.entries(this.state.data.pinNodes).length > 0;

        this.createHeading(STRINGS.features.pinnedNodes, "pinned", hasRows);

        const table = this.contentEl.createEl("table");
        const colgroup = table.createEl("colgroup");

        const thead = table.createTHead();
        const tr_thead = thead.insertRow();
        let cell;
        cell = tr_thead.insertCell(); cell.setText(STRINGS.plugin.folder);
        colgroup.createEl("col").addClass("col-folder");
        cell = tr_thead.insertCell(); cell.setText(STRINGS.plugin.nodeName);
        colgroup.createEl("col").addClass("col-filename");
        cell = tr_thead.insertCell(); cell.setText("X");
        colgroup.createEl("col").addClass("col-pos-x");
        cell = tr_thead.insertCell(); cell.setText("Y");
        colgroup.createEl("col").addClass("col-pos-y");

        if (!this.state.data.pinNodes || !hasRows) return;

        const tbody = table.createTBody();

        for (const [id, p] of Object.entries(this.state.data.pinNodes)) {
            const nodeData = this.getNodeData(id);

            const tr = tbody.insertRow();
            let cell: HTMLTableCellElement;
            cell = tr.insertCell(); cell.setText(nodeData.path);
            cell = tr.insertCell(); nodeData.link ? cell.appendChild(nodeData.link) : cell.setText(id);
            cell = tr.insertCell(); cell.setText(p.x.toFixed(2));
            cell = tr.insertCell(); cell.setText(p.y.toFixed(2));
        }

        this.prepareTable("pinned", table);
    }

    private createHeading(title: string, key: string, hasTable?: boolean) {
        const h = new Setting(this.contentEl)
            .setName(title)
            .setHeading();

        if (hasTable) {
            h.addText(cb => {
                cb.inputEl.insertAdjacentText('beforebegin', STRINGS.controls.show);
                cb.setValue(this.defaultMaxRows.toString())
                    .onChange((value) => {
                        const intValue = parseInt(value);
                        if (!isNaN(intValue) && intValue > 0) {
                            const factor = this.sortableTables[key].maxRows / intValue;
                            this.sortableTables[key].maxRows = intValue;
                            this.sortableTables[key].page = Math.round(this.sortableTables[key].page * factor);
                            this.sortableTables[key].page = Math.clamp(this.sortableTables[key].page, 0, this.numberOfPages(key));
                            this.mountPagination(key);
                            this.showPageRows(key);
                        }
                    });
                cb.inputEl.insertAdjacentText('afterend', STRINGS.controls.rows);
            });
            h.controlEl.addClass("number-of-rows");
        }
    }

    private getNodeData(id: string): { file?: TFile, path: string, link?: HTMLSpanElement } {
        const file = getFile(id);
        const path = this.getPath(file);
        const link = this.getLink(file);
        return {
            file: file ?? undefined,
            path: path,
            link: link
        }
    }

    private getPath(file: TFile | null): string {
        let path = "";
        if (file) path = file.parent?.path ?? "";
        return path;
    }

    private getLink(file: TFile | null): HTMLSpanElement | undefined {
        if (file) {
            let link = createEl("a");
            link.setText(file.basename);
            link.onclick = (ev) => {
                this.close();
                this.app.workspace.getLeaf(true).openFile(file);
            }
            let ext = createEl("code");
            ext.setText(file.extension);
            
            let span = createEl("span");
            span.appendChild(link);
            span.insertAdjacentText("beforeend", " ");
            span.appendChild(ext);
            return span;
        }
        return;
    }

    private prepareTable(key: string, table: HTMLTableElement, index: number = 1) {
        if (!table.tHead) return;

        this.sortableTables[key] = {
            table: table,
            rows: Array.from(table.tBodies[0].rows),
            sortIndex: index,
            asc: Array.from(table.tHead.rows[0].cells).map(el => undefined),
            page: 0,
            pagination: createDiv(),
            maxRows: this.defaultMaxRows,
        };

        table.insertAdjacentElement('afterend', this.sortableTables[key].pagination);
        this.sortableTables[key].pagination.addClass("pagination");

        this.mountPagination(key);
        this.makeSortable(key);
    }

    private mountPagination(key: string) {
        const pagination = this.sortableTables[key].pagination;
        pagination.replaceChildren();
        if (this.sortableTables[key].rows.length < this.sortableTables[key].maxRows) return;
        const nShow = 3;

        // First page
        if (this.sortableTables[key].page !== 0) {
            new ButtonComponent(pagination)
                .setIcon("chevrons-left")
                .setTooltip(STRINGS.controls.pageFirst)
                .setClass("first-page")
                .onClick(() => {
                    this.showFirstPage(key);
                });
        }

        const paginationInner = pagination.createDiv("pagination-inner");

        if (this.sortableTables[key].page > nShow) {
            paginationInner.createSpan().setText("...");
        }
        
        // Previous pages
        for (let i = Math.max(0, this.sortableTables[key].page - nShow); i < this.sortableTables[key].page; ++i) {
            new ButtonComponent(paginationInner)
                .setButtonText(i.toString())
                .setTooltip(STRINGS.controls.page + " " + i.toString())
                .onClick(() => {
                    this.showPreviousPage(key, this.sortableTables[key].page - i);
                });
        }

        // Current page
        new ButtonComponent(paginationInner)
            .setButtonText(this.sortableTables[key].page.toString())
            .setCta()
            .setTooltip(STRINGS.controls.pageCurrent);
        
        // Following pages
        for (let i = this.sortableTables[key].page + 1; i < Math.min(this.sortableTables[key].page + nShow + 1, this.numberOfPages(key)); ++i) {
            new ButtonComponent(paginationInner)
                .setButtonText(i.toString())
                .setTooltip(STRINGS.controls.page + " " + i.toString())
                .onClick(() => {
                    this.showNextPage(key, i - this.sortableTables[key].page);
                });
        }

        if (this.sortableTables[key].page < this.numberOfPages(key) - nShow - 1) {
            paginationInner.createSpan().setText("...");
        }

        // Last Page
        if (this.sortableTables[key].page !== this.numberOfPages(key) - 1) {
            new ButtonComponent(pagination)
                .setIcon("chevrons-right")
                .setTooltip(STRINGS.controls.pageLast)
                .setClass("last-page")
                .onClick(() => {
                    this.showLastPage(key);
                });
        }
    }

    private makeSortable(key: string) {
        const table = this.sortableTables[key].table;
        if (!table.tHead) return;

        let i = 0;
        Array.from(table.tHead.rows[0].cells)
            .forEach(td => {
                new ExtraButtonComponent(td)
                    .setIcon("chevron-down")
                    .onClick(() => {
                        if (!table.tHead) return;
                        this.sortableTables[key].sortIndex = Array.from(table.tHead.rows[0].cells).indexOf(td);
                        this.sortTable(key);
                    });

                i++;
            });

        this.sortTable(key);
    }

    private sortTable(key: string) {
        const asc = !this.sortableTables[key].asc[this.sortableTables[key].sortIndex];
        this.sortableTables[key].asc[this.sortableTables[key].sortIndex] = asc;
        this.sortableTables[key].rows
            .sort((a: HTMLTableRowElement, b: HTMLTableRowElement) => {
                const aText = a.cells[this.sortableTables[key].sortIndex].textContent ?? "";
                const bText = b.cells[this.sortableTables[key].sortIndex].textContent ?? "";
                if (asc) {
                    return aText.localeCompare(bText);
                }
                else {
                    return bText.localeCompare(aText);
                }
            });
        this.showPageRows(key);
        for (let i = 0, n = this.sortableTables[key].asc.length; i < n; ++i) {
            if (i === this.sortableTables[key].sortIndex) {
                this.sortableTables[key].asc[i] = asc;
                this.sortableTables[key].table.tHead?.rows[0].cells[i].addClass(asc ? "sorted-asc" : "sorted-desc");
                this.sortableTables[key].table.tHead?.rows[0].cells[i].removeClass(!asc ? "sorted-asc" : "sorted-desc");
            }
            else {
                this.sortableTables[key].asc[i] = undefined;
                this.sortableTables[key].table.tHead?.rows[0].cells[i].removeClasses(["sorted-asc", "sorted-desc"]);
            }
        }
    }

    private showPageRows(key: string) {
        this.sortableTables[key].table.tBodies[0].replaceChildren();
        const page = this.sortableTables[key].page;
        for (let i = 0, n = this.sortableTables[key].rows.length; i < this.sortableTables[key].maxRows && page * this.sortableTables[key].maxRows + i < n; ++i) {
            this.sortableTables[key].table.tBodies[0].appendChild(this.sortableTables[key].rows[page * this.sortableTables[key].maxRows + i]);
        }
        this.mountPagination(key);
    }

    private showFirstPage(key: string) {
        this.sortableTables[key].page = 0;
        this.showPageRows(key);
    }
    private showPreviousPage(key: string, shift: number) {
        this.sortableTables[key].page -= shift;
        if (this.sortableTables[key].page < 0) {
            this.showFirstPage(key);
        }
        else {
            this.showPageRows(key);
        }
    }
    private showNextPage(key: string, shift: number) {
        this.sortableTables[key].page += shift;
        if (this.sortableTables[key].page >= this.numberOfPages(key)) {
            this.showLastPage(key);
        }
        else {
            this.showPageRows(key);
        }
    }
    private showLastPage(key: string) {
        this.sortableTables[key].page = this.numberOfPages(key) - 1;
        this.showPageRows(key);
    }

    private numberOfPages(key: string): number {
        return Math.ceil(this.sortableTables[key].rows.length / this.sortableTables[key].maxRows);
    }
    
	onClose(): void {
		this.contentEl.empty();
	}
}