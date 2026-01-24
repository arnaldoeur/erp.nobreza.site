
// Helper to convert hex to RGB
const hexToRgb = (hex: string) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    }
    return `${r} ${g} ${b}`;
};

// Very basic lighten/darken logic for demo purposes
// In a real app we might use 'culori' or 'color' library
// We will approximate tailwind scaling
const adjustColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;

    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

export const applyTheme = (hexColor: string, secondaryHexColor: string = '#6366f1') => {
    const root = document.documentElement;

    // Primary Palette
    root.style.setProperty('--color-primary-50', hexToRgb(adjustColor(hexColor, 180)));
    root.style.setProperty('--color-primary-100', hexToRgb(adjustColor(hexColor, 160)));
    root.style.setProperty('--color-primary-200', hexToRgb(adjustColor(hexColor, 120)));
    root.style.setProperty('--color-primary-300', hexToRgb(adjustColor(hexColor, 80)));
    root.style.setProperty('--color-primary-400', hexToRgb(adjustColor(hexColor, 40)));
    root.style.setProperty('--color-primary-500', hexToRgb(hexColor));
    root.style.setProperty('--color-primary-600', hexToRgb(adjustColor(hexColor, -20)));
    root.style.setProperty('--color-primary-700', hexToRgb(adjustColor(hexColor, -40)));
    root.style.setProperty('--color-primary-800', hexToRgb(adjustColor(hexColor, -60)));
    root.style.setProperty('--color-primary-900', hexToRgb(adjustColor(hexColor, -80)));
    root.style.setProperty('--color-primary-950', hexToRgb(adjustColor(hexColor, -100)));

    // Secondary Palette
    root.style.setProperty('--color-secondary-50', hexToRgb(adjustColor(secondaryHexColor, 180)));
    root.style.setProperty('--color-secondary-100', hexToRgb(adjustColor(secondaryHexColor, 160)));
    root.style.setProperty('--color-secondary-200', hexToRgb(adjustColor(secondaryHexColor, 120)));
    root.style.setProperty('--color-secondary-300', hexToRgb(adjustColor(secondaryHexColor, 80)));
    root.style.setProperty('--color-secondary-400', hexToRgb(adjustColor(secondaryHexColor, 40)));
    root.style.setProperty('--color-secondary-500', hexToRgb(secondaryHexColor));
    root.style.setProperty('--color-secondary-600', hexToRgb(adjustColor(secondaryHexColor, -20)));
    root.style.setProperty('--color-secondary-700', hexToRgb(adjustColor(secondaryHexColor, -40)));
    root.style.setProperty('--color-secondary-800', hexToRgb(adjustColor(secondaryHexColor, -60)));
    root.style.setProperty('--color-secondary-900', hexToRgb(adjustColor(secondaryHexColor, -80)));
    root.style.setProperty('--color-secondary-950', hexToRgb(adjustColor(secondaryHexColor, -100)));
};
