import { Modal, Setting, TFile } from "obsidian";
import { ExtendedGraphInstances, QueryData, QueryMatcher, t } from "../../internal";

export class QueryMatchesModal extends Modal {
    matcher: QueryMatcher;

    constructor(queryData: QueryData) {
        super(ExtendedGraphInstances.app);

        this.matcher = new QueryMatcher(queryData);
        const files = this.matcher.getMatches();

        this.setTitle(t("query.matchingFiles"));

        this.addQueryStringHeader();
        this.addQueryString();

        this.addFilesHeader(files.length);
        for (const file of files) {
            this.addFile(file);
        }
    }

    private addQueryStringHeader(): void {
        new Setting(this.contentEl)
            .setName(t("query.query"))
            .setHeading();
    }

    private addQueryString(): void {
        new Setting(this.contentEl)
            .setName(this.matcher.toString());
    }

    private addFilesHeader(n: number): void {
        new Setting(this.contentEl)
            .setName(`${t("query.files")} (${n})`)
            .setHeading();
    }

    private addFile(file: TFile): void {
        new Setting(this.contentEl)
            .setName(file.path);
    }
}