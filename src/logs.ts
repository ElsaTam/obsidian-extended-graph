import { App } from 'obsidian';

export function logToFile(app: App, message: string) {
    let path = app.vault.configDir + "/plugins/extended-graph/logs.txt";
    let data = `[${new Date(Date.now()).toISOString()}] ${message}\n`;
    app.vault.adapter.append(path, data);
}