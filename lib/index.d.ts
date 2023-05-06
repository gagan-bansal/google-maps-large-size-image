/// <reference types="node" />
/// <reference types="geojson" />

import {BBox} from "@types/geojson";
import { Buffer } from "buffer";

export interface LargeMapOptions {
  maptype?: string,
  format?: string,
  scale?: number,
  maxTileSize?: number,
  style?: string,
  language?: string,
  region?: string;
};

export class LargeMap {
    constructor(googleApiKey: string, extent: BBox, options?: LargeMapOptions);
    googleApiKey: string;
    maptype: string;
    format: string;
    scale: number;
    maxTileSize: number;
    style: string;
    language: string;
    region: string;
    getImage(extent: Extent, zoom: number): Promise<Buffer>;
    getTiles(extent: Extent, zoom: number): {
        tiles: any[][];
        imageWidth: number;
        imageHeight: number;
    };
}
