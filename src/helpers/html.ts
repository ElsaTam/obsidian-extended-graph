export function getSVGNode(n: string, v?: any): SVGElement {
    const svgNode = document.createElementNS("http://www.w3.org/2000/svg", n);
    for (const p in v)
        svgNode.setAttributeNS(null, p.replace(/[A-Z]/g, function(m, p, o, s) { return "-" + m.toLowerCase(); }), v[p]);
    return svgNode;
}

export function setPluginIcon(parent: HTMLElement): void {
    parent.replaceChildren();
    parent.insertAdjacentHTML('afterbegin', `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon git-fork-sparkles"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/><path d="m 20.509365,13.686388 v 4"/><path d="m 22.509365,15.686388 h -4"/><path d="m 18.125575,20.191752 v 2"/><path d="m 19.125575,21.191752 h -2"/><path d="m 3.6865316,13.537545 v 2"/><path d="m 4.6865316,14.537545 h -2"/></svg>`);
}