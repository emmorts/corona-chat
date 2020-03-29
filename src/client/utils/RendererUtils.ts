export  function hexToRgba(hex: number, alpha?: number): string {
  const color = hex.toString(16).padStart(6, "0");
  const transparency = alpha ? alpha.toString(16).padStart(2, "0") : "";

  return `#${color}${transparency}`;
}