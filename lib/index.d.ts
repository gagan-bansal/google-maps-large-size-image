/// <reference types="node" />
export class LargeMap {
    constructor(googleApiKey: any, options?: {});
    googleApiKey: any;
    maptype: any;
    format: any;
    scale: any;
    maxTileSize: any;
    style: any;
    language: any;
    region: any;
    getImage(extent: any, zoom: number, overlay: any): Promise<Buffer>;
    getTiles(extent: any, zoom?: number): {
        tiles: any[][];
        imageWidth: number;
        imageHeight: number;
    };
    getMarkers(): boolean;
    getPaths(extent: any): any;
}
import { Buffer } from "buffer";
