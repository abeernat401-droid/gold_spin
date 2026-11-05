export const WHEEL_LABEL_COLOR = '#F6CD59';

export function isDarkColor(hex: string): boolean {
  const value = hex.replace(/^#/, '');
  const rgb = value.length === 3 || value.length === 4
    ? value.slice(0, 3).split('').map(digit => parseInt(digit + digit, 16))
    : [0, 2, 4].map(offset => parseInt(value.slice(offset, offset + 2), 16));

  if (rgb.some(channel => !Number.isFinite(channel))) return false;
  return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000 < 150;
}
