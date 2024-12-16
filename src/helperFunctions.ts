import { Renderer } from "./graph/renderer";

export function getTheme() : string {
    const body = document.getElementsByTagName("body")[0];
    const classes = body.classList.toString().split(" ");
    if (classes.contains("theme-light")) return "moonstone";
    if (classes.contains("theme-dark")) return "obsidian";
    return "";
}

export function getBackgroundColor(renderer: Renderer) : Uint8Array {
    let bg = window.getComputedStyle(renderer.interactiveEl).backgroundColor;
    let el: Element = renderer.interactiveEl;
    while (bg.startsWith("rgba(") && bg.endsWith(", 0)") && el.parentElement) {
        el = el.parentElement as Element;
        bg = window.getComputedStyle(el).backgroundColor;
    }
    bg = bg.replace("rgba", "").replace("rgb", "").replace("(", "").replace(")", "");
    const RGB = bg.split(", ").map(c => parseInt(c));
    return Uint8Array.from(RGB);
}