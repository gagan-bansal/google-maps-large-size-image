declare type xy = [number, number];
export const resolutions: number[];
export function reprojectToImageCoord(coord: xy, imgTopLeft: xy, zoom: number, scale: number): number[];
export function rasterCoord(coord: xy, zoom: number): xy[] ;
