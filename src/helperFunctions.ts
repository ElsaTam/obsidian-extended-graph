export function getTheme() : string {
    const body = document.getElementsByTagName("body")[0];
    const classes = body.classList.toString().split(" ");
    if (classes.contains("theme-light")) return "moonstone";
    if (classes.contains("theme-dark")) return "obsidian";
    return "";
}