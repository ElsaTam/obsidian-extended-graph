import { HexString } from 'obsidian';
import * as cm from './colormaps';
import { evaluate_cmap } from './colormaps';

export function getColor(palette: string, x: number): Uint8Array {
    return new Uint8Array(cm.evaluate_cmap(x, palette, false));
}

export function rgb2int(rgb: Uint8Array): number {
    return rgb[0] * (256*256) + rgb[1] * 256 + rgb[2];
}

export function int2hex(n: number): HexString {
    return "#" + n.toString(16);
}

export function int2rgb(n: number): Uint8Array {
    return hex2rgb(int2hex(n));
}

/**
 * Convert HSV to RGB
 * @param hsv h: 0-360, s: 0-100, v: 0-100
 * @returns RGB 8 bit array
 */
export function hsv2rgb(hsv: {h: number, s: number, v: number}): Uint8Array {
    hsv.h /= 360; hsv.s /= 100; hsv.v /= 100;
    let r, g, b;
  
    const i = Math.floor(hsv.h * 6);
    const f = hsv.h * 6 - i;
    const p = hsv.v * (1 - hsv.s);
    const q = hsv.v * (1 - f * hsv.s);
    const t = hsv.v * (1 - (1 - f) * hsv.s);
  
    switch (i % 6) {
      case 0:  r = hsv.v, g = t, b = p; break;
      case 1:  r = q, g = hsv.v, b = p; break;
      case 2:  r = p, g = hsv.v, b = t; break;
      case 3:  r = p, g = q, b = hsv.v; break;
      case 4:  r = t, g = p, b = hsv.v; break;
      default: r = hsv.v, g = p, b = q; break;
    }
  
    return new Uint8Array([ r * 255, g * 255, b * 255 ]);
}

export function hex2int(hex: string): number {
    return rgb2int(hex2rgb(hex));
}

/**
 * Convert a hex color to an RGB array
 * @param hex format: #RRGGBB
 * @returns RGB 8 bit array
 */
export function hex2rgb(hex: string): Uint8Array {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return new Uint8Array([0, 0, 0]);
    return new Uint8Array([
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ]);
}

export function componentToHex(c: number): string {
    let result = c.toString(16);
    if (result.length === 1) {
        result = '0' + result;
    }
    return result;
}

export function rgb2hex(rgb: Uint8Array): string {
    return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
}

export function plot_colormap(canvas: HTMLCanvasElement, name: string, reverse: boolean) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    for (let x = 0; x <= 256; x++) {
        const color = evaluate_cmap(x / 256, name, reverse);
        const r = color[0];
        const g = color[1];
        const b = color[2];
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(x * canvas.width / 256, 0, canvas.width / 256, canvas.height);
    }
}

export function randomColor(): HexString {
    return GoldenColor.random(50, 95);
}

class GoldenColor {
    private static goldenRatioConjugate: number = 0.618033988749895;
    private static h: number = Math.random();

    private constructor() { }

    public static random(s: number = 50, v: number = 95): string {
        GoldenColor.h += GoldenColor.goldenRatioConjugate;
        GoldenColor.h %= 1;
        const color = hsv2rgb({h: Math.floor(GoldenColor.h * 360), s: s, v: v});
        return rgb2hex(color);
    }
}