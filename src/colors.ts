import * as cm from './colormaps';

export function getColor(palette: string, x: number) : Uint8Array {
    return new Uint8Array(cm.evaluate_cmap(x, palette, false));
}

export function int2rgb(int: number): Uint8Array {
    return new Uint8Array([
        (int >> 16) & 0xFF,
        (int >> 8) & 0xFF,
        int & 0xFF,
    ]);
}

export function rgb2hsv(rgb: Uint8Array) : { h: number, s: number, v: number } {
    let r = rgb[0], g = rgb[1], b = rgb[2];
    r /= 255, g /= 255, b /= 255;
  
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;
  
    var d = max - min;
    s = max == 0 ? 0 : d / max;
  
    if (max == min) {
      h = 0; // achromatic
    }
    else {
        switch (max) {
            case r:  h = (g - b) / d + (g < b ? 6 : 0); break;
            case g:  h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
  
    return {h: Math.floor(h * 360), s: Math.floor(s * 100), v: Math.floor(v * 100)};
}

export function hsv2rgb(hsv: {h: number, s: number, v: number}) : Uint8Array {
    hsv.h /= 360; hsv.s /= 100; hsv.v /= 100;
    var r, g, b;
  
    var i = Math.floor(hsv.h * 6);
    var f = hsv.h * 6 - i;
    var p = hsv.v * (1 - hsv.s);
    var q = hsv.v * (1 - f * hsv.s);
    var t = hsv.v * (1 - (1 - f) * hsv.s);
  
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

export function rgb2hex(rgb: Uint8Array) : number {
    const binaryRGB = rgb[0] << 16 | rgb[1] << 8 | rgb[2];      
    return binaryRGB;
}

export function randomColor(baseColor?: {h: number, s: number, v: number}) {
    const newH = Math.floor(360 * Math.random());

    if (baseColor) {
        return hsv2rgb({
            h: newH,
            s: baseColor.s,
            v: baseColor.v
        });
    }
    else {
        const body = document.getElementsByTagName("body")[0];
        const s = body.classList.contains("theme-dark") ? 90 : 100;
        const v = body.classList.contains("theme-dark") ? 100 : 60;

        return hsv2rgb({
            h: newH,
            s: s,
            v: v
        });
    }
}