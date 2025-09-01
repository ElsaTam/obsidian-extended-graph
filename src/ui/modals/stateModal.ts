import { ButtonComponent, ExtraButtonComponent, Modal, SearchComponent, Setting, TFile } from "obsidian";
import { ExtendedElementsSuggester, getFile, GraphInstances, GraphState, NodeShape, ExtendedGraphInstances, strCompare, t, CSSBridge } from "../../internal";

type TableType = 'nodes' | 'links' | 'pinned';

export class GraphStateModal extends Modal {
    state: GraphState;
    instances: GraphInstances;
    sortableTables: Partial<Record<TableType, {
        asc: (boolean | undefined)[],
        sortIndex: number,
        table: HTMLTableElement,
        rows: { id: string, el: HTMLTableRowElement }[],
        page: number,
        pagination: HTMLDivElement,
        maxRows: number
    }>> = {};
    defaultMaxRows: number = 10;
    target?: {
        tableID: TableType,
        elementID: string
    };

    constructor(instances: GraphInstances) {
        super(ExtendedGraphInstances.app);
        this.instances = instances;
        this.state = new GraphState("");
        this.state.saveGraph(instances);
        this.setTitle(t("states.graphState"));
        this.modalEl.addClass("graph-modal-graph-state");
    }

    setTarget(tableID: TableType, elementID: string) {
        this.target = { tableID, elementID };
    }

    override open() {
        super.open();
        this.modalEl.querySelectorAll('input').forEach(input => input.blur());
    }

    onOpen() {
        this.addNodes();
        this.addLinks();
        this.addPinnedNodes();
        this.focusOnTarget();
    }

    private addNodes() {
        const hasRows = this.instances.nodesSet.extendedElementsMap.size > 0;
        const nodesSelected = Object.keys(this.instances.nodesSet.selectedNodes).length > 0;

        this.createHeading(t("plugin.nodes"), "nodes", hasRows);

        const table = this.contentEl.createEl("table");
        const colgroup = table.createEl("colgroup");

        const thead = table.createTHead();
        const tr_thead = thead.insertRow();

        let cell: HTMLTableCellElement;
        cell = tr_thead.insertCell(); cell.setText(t("plugin.folder"));
        colgroup.createEl("col").addClass("col-folder");
        cell = tr_thead.insertCell(); cell.setText(t("plugin.nodeName"));
        colgroup.createEl("col").addClass("col-filename");
        cell = tr_thead.insertCell(); cell.setText(t("controls.enabled"));
        colgroup.createEl("col").addClass("col-enabled");
        if (nodesSelected) {
            cell = tr_thead.insertCell(); cell.setText(t("inputs.selected"));
            colgroup.createEl("col").addClass("col-selected");
        }
        for (const [key, manager] of this.instances.nodesSet.managers) {
            cell = tr_thead.insertCell(); cell.setText(key);
            colgroup.createEl("col").addClass("col-key-" + key);
        }
        if (this.instances.settings.enableFeatures[this.instances.type]['shapes']) {
            cell = tr_thead.insertCell(); cell.setText(t("features.shape"));
            colgroup.createEl("col").addClass("col-shape");
        }
        if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats']) {
            cell = tr_thead.insertCell(); cell.setText(t("features.size"));
            colgroup.createEl("col").addClass("col-size");
        }

        if (!hasRows) return;

        const tbody = table.createTBody();
        const ids: string[] = [];

        for (const [id, extendedNode] of this.instances.nodesSet.extendedElementsMap) {
            const nodeData = this.getNodeData(id);

            const tr = tbody.insertRow();
            ids.push(id);
            let cell: HTMLTableCellElement;
            cell = tr.insertCell(); cell.setText(nodeData.path);
            cell = tr.insertCell(); nodeData.link ? cell.appendChild(nodeData.link) : cell.setText(id);
            cell = tr.insertCell(); if (!extendedNode.isAnyManagerDisabled()) cell.setText("✓");
            if (nodesSelected) {
                cell = tr.insertCell(); if (id in this.instances.nodesSet.selectedNodes) cell.setText("✓");
            }

            for (const [key, manager] of this.instances.nodesSet.managers) {
                cell = tr.insertCell();
                cell.addClass("column-interactives");
                const types = extendedNode.types.get(key);
                if (types) {
                    for (const type of types) {
                        const span = cell.createEl("span");
                        span.addClass("tag");
                        if (!manager.isActive(type)) span.addClass("is-disabled");
                        span.style.setProperty("--interactive-color", CSSBridge.getCSSSplitRGB(manager.getColor(type)));
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

        this.prepareTable("nodes", table, ids);
    }

    private addLinks() {
        const hasRows = this.instances.linksSet.extendedElementsMap.size > 0;

        this.createHeading("Links", "links", hasRows);

        const table = this.contentEl.createEl("table");
        const colgroup = table.createEl("colgroup");

        const thead = table.createTHead();
        const tr_thead = thead.insertRow();
        let cell: HTMLTableCellElement;

        cell = tr_thead.insertCell(); cell.setText(`${t("plugin.folder")} (${t("plugin.source")})`);
        colgroup.createEl("col").addClasses(["col-folder", "col-folder-source"]);
        cell = tr_thead.insertCell(); cell.setText(`${t("plugin.nodeName")} (${t("plugin.source")})`);
        colgroup.createEl("col").addClasses(["col-filename", "col-filename-source"]);
        cell = tr_thead.insertCell(); cell.setText(`${t("plugin.folder")} (${t("plugin.target")})`);
        colgroup.createEl("col").addClasses(["col-folder", "col-folder-target"]);
        cell = tr_thead.insertCell(); cell.setText(`${t("plugin.nodeName")} (${t("plugin.target")})`);
        colgroup.createEl("col").addClasses(["col-filename", "col-filename-target"]);
        cell = tr_thead.insertCell(); cell.setText(t("controls.enabled"));
        colgroup.createEl("col").addClass("col-enabled");
        for (const [key, manager] of this.instances.linksSet.managers) {
            cell = tr_thead.insertCell(); cell.setText(key);
            colgroup.createEl("col").addClass("col-key-" + key);
        }
        if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats']) {
            cell = tr_thead.insertCell(); cell.setText(t("features.size"));
            colgroup.createEl("col").addClass("col-size");
        }

        if (!hasRows) return;

        const tbody = table.createTBody();
        const ids: string[] = [];

        for (const [id, extendedLink] of this.instances.linksSet.extendedElementsMap) {
            const nodeSourceData = this.getNodeData(extendedLink.coreElement.source.id);
            const nodeTargetData = this.getNodeData(extendedLink.coreElement.target.id);

            const tr = tbody.insertRow();
            ids.push(id);
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
                        const span = cell.createEl("span");
                        span.addClass("tag");
                        if (!manager.isActive(type)) span.addClass("is-disabled");
                        span.style.setProperty("--interactive-color", CSSBridge.getCSSSplitRGB(manager.getColor(type)));
                        span.setText(type);
                    }
                }
            }

            if (this.instances.settings.enableFeatures[this.instances.type]['elements-stats']) {
                cell = tr.insertCell(); cell.setText(extendedLink.getThicknessScale().toFixed(2));
            }
        }

        this.prepareTable("links", table, ids);
    }

    private addPinnedNodes() {
        const hasRows = this.state.data.pinNodes && Object.entries(this.state.data.pinNodes).length > 0;

        this.createHeading(t("features.pinnedNodes"), "pinned", hasRows);

        const table = this.contentEl.createEl("table");
        const colgroup = table.createEl("colgroup");

        const thead = table.createTHead();
        const tr_thead = thead.insertRow();
        let cell;
        cell = tr_thead.insertCell(); cell.setText(t("plugin.folder"));
        colgroup.createEl("col").addClass("col-folder");
        cell = tr_thead.insertCell(); cell.setText(t("plugin.nodeName"));
        colgroup.createEl("col").addClass("col-filename");
        cell = tr_thead.insertCell(); cell.setText("X");
        colgroup.createEl("col").addClass("col-pos-x");
        cell = tr_thead.insertCell(); cell.setText("Y");
        colgroup.createEl("col").addClass("col-pos-y");

        if (!this.state.data.pinNodes || !hasRows) return;

        const tbody = table.createTBody();
        const ids: string[] = [];

        for (const [id, p] of Object.entries(this.state.data.pinNodes)) {
            const nodeData = this.getNodeData(id);

            const tr = tbody.insertRow();
            ids.push(id);
            let cell: HTMLTableCellElement;
            cell = tr.insertCell(); cell.setText(nodeData.path);
            cell = tr.insertCell(); nodeData.link ? cell.appendChild(nodeData.link) : cell.setText(id);
            cell = tr.insertCell(); cell.setText(p.x.toFixed(2));
            cell = tr.insertCell(); cell.setText(p.y.toFixed(2));
        }

        this.prepareTable("pinned", table, ids);
    }

    private createHeading(title: string, key: TableType, hasTable?: boolean) {
        const h = new Setting(this.contentEl)
            .setName(title)
            .setHeading();

        if (hasTable) {
            h.addText(cb => {
                cb.inputEl.insertAdjacentText('beforebegin', t("controls.show"));
                cb.setValue(this.defaultMaxRows.toString())
                    .onChange((value) => {
                        const table = this.sortableTables[key];
                        if (!table) return;

                        const intValue = parseInt(value);
                        if (!isNaN(intValue) && intValue > 0) {
                            const factor = table.maxRows / intValue;
                            table.maxRows = intValue;
                            table.page = Math.round(table.page * factor);
                            table.page = Math.clamp(table.page, 0, this.numberOfPages(key));
                            this.mountPagination(key);
                            this.showPageRows(key);
                        }
                    });
                cb.inputEl.insertAdjacentText('afterend', t("controls.rows"));
            });

            if (key === 'nodes' || key === 'pinned') {
                const search = new SearchComponent(h.settingEl)
                    .then(cb => {
                        const callback = (value: string) => {
                            this.setTarget(key, value);
                            this.focusOnTarget();
                        }
                        new ExtendedElementsSuggester(cb.inputEl, this.instances, key, callback);
                        cb.onChange(callback);
                    });
                h.infoEl.insertAdjacentElement('afterend', search.containerEl);
            }

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

    private prepareTable(key: TableType, table: HTMLTableElement, rowIds: string[], index: number = 1) {
        if (!table.tHead) return;

        this.sortableTables[key] = {
            table: table,
            rows: Array.from(table.tBodies[0].rows).map((row, i) => { return { id: rowIds[i], el: row } }),
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

    private mountPagination(key: TableType) {
        const table = this.sortableTables[key];
        if (!table) return;

        const pagination = table.pagination;
        pagination.replaceChildren();
        if (table.rows.length < table.maxRows) return;
        const nShow = 3;

        // First page
        if (table.page !== 0) {
            new ButtonComponent(pagination)
                .setIcon("chevrons-left")
                .setTooltip(t("controls.pageFirst"))
                .setClass("first-page")
                .onClick(() => {
                    this.showFirstPage(key);
                });
        }

        const paginationInner = pagination.createDiv("pagination-inner");

        if (table.page > nShow) {
            paginationInner.createSpan().setText("...");
        }

        // Previous pages
        for (let i = Math.max(0, table.page - nShow); i < table.page; ++i) {
            new ButtonComponent(paginationInner)
                .setButtonText(i.toString())
                .setTooltip(t("controls.page") + " " + i.toString())
                .onClick(() => {
                    this.showPreviousPage(key, table.page - i);
                });
        }

        // Current page
        new ButtonComponent(paginationInner)
            .setButtonText(table.page.toString())
            .setCta()
            .setTooltip(t("controls.pageCurrent"));

        // Following pages
        for (let i = table.page + 1; i < Math.min(table.page + nShow + 1, this.numberOfPages(key)); ++i) {
            new ButtonComponent(paginationInner)
                .setButtonText(i.toString())
                .setTooltip(t("controls.page") + " " + i.toString())
                .onClick(() => {
                    this.showNextPage(key, i - table.page);
                });
        }

        if (table.page < this.numberOfPages(key) - nShow - 1) {
            paginationInner.createSpan().setText("...");
        }

        // Last Page
        if (table.page !== this.numberOfPages(key) - 1) {
            new ButtonComponent(pagination)
                .setIcon("chevrons-right")
                .setTooltip(t("controls.pageLast"))
                .setClass("last-page")
                .onClick(() => {
                    this.showLastPage(key);
                });
        }
    }

    private makeSortable(key: TableType) {
        const sortableTable = this.sortableTables[key];
        const table = this.sortableTables[key]?.table;
        if (!sortableTable || !table?.tHead) return;

        let i = 0;
        Array.from(table.tHead.rows[0].cells)
            .forEach(td => {
                new ExtraButtonComponent(td)
                    .setIcon("chevron-down")
                    .onClick(() => {
                        if (!table.tHead) return;
                        sortableTable.sortIndex = Array.from(table.tHead.rows[0].cells).indexOf(td);
                        this.sortTable(key);
                    });

                i++;
            });

        this.sortTable(key);
    }

    private sortTable(key: TableType) {
        const table = this.sortableTables[key];
        if (!table) return;

        const asc = !table.asc[table.sortIndex];
        table.asc[table.sortIndex] = asc;
        table.rows
            .sort((a: { id: string, el: HTMLTableRowElement }, b: { id: string, el: HTMLTableRowElement }) => {
                const aText = a.el.cells[table.sortIndex].textContent ?? "";
                const bText = b.el.cells[table.sortIndex].textContent ?? "";
                return strCompare(aText, bText);
            });
        if (!asc) {
            table.rows.reverse();
        }
        this.showPageRows(key);
        for (let i = 0, n = table.asc.length; i < n; ++i) {
            if (i === table.sortIndex) {
                table.asc[i] = asc;
                table.table.tHead?.rows[0].cells[i].addClass(asc ? "sorted-asc" : "sorted-desc");
                table.table.tHead?.rows[0].cells[i].removeClass(!asc ? "sorted-asc" : "sorted-desc");
            }
            else {
                table.asc[i] = undefined;
                table.table.tHead?.rows[0].cells[i].removeClasses(["sorted-asc", "sorted-desc"]);
            }
        }
    }

    private showPageRows(key: TableType) {
        const table = this.sortableTables[key];
        if (!table) return;

        table.table.tBodies[0].replaceChildren();
        const page = table.page;
        for (let i = 0, n = table.rows.length; i < table.maxRows && page * table.maxRows + i < n; ++i) {
            table.table.tBodies[0].appendChild(table.rows[page * table.maxRows + i].el);
        }
        this.mountPagination(key);
    }

    private showFirstPage(key: TableType) {
        const table = this.sortableTables[key];
        if (!table) return;

        table.page = 0;
        this.showPageRows(key);
    }
    private showPreviousPage(key: TableType, shift: number) {
        const table = this.sortableTables[key];
        if (!table) return;

        table.page -= shift;
        if (table.page < 0) {
            this.showFirstPage(key);
        }
        else {
            this.showPageRows(key);
        }
    }
    private showNextPage(key: TableType, shift: number) {
        const table = this.sortableTables[key];
        if (!table) return;

        table.page += shift;
        if (table.page >= this.numberOfPages(key)) {
            this.showLastPage(key);
        }
        else {
            this.showPageRows(key);
        }
    }
    private showLastPage(key: TableType) {
        const table = this.sortableTables[key];
        if (!table) return;

        table.page = this.numberOfPages(key) - 1;
        this.showPageRows(key);
    }

    private numberOfPages(key: TableType): number {
        const table = this.sortableTables[key];
        if (!table) return 0;

        return Math.ceil(table.rows.length / table.maxRows);
    }

    private focusOnTarget(): void {
        if (!this.target) return;

        const table = this.sortableTables[this.target.tableID];
        if (!table) return;

        const rowIndex = table.rows.findIndex(row => row.id === this.target?.elementID);
        if (rowIndex === -1) return;

        table.page = Math.floor(rowIndex / table.maxRows);
        this.showPageRows(this.target.tableID);

        const row = table.rows[rowIndex].el;
        row.addClass("is-flashing");
        row.win.setTimeout((function () {
            return row.removeClass("is-flashing")
        }), 1500);
    }

    onClose(): void {
        this.contentEl.empty();
    }
}