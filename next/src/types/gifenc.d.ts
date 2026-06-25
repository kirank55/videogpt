declare module "gifenc" {
  export interface GIFEncoderOptions {
    auto?: boolean;
  }
  export interface WriteFrameOptions {
    palette: number[][];
    delay?: number;
    dispose?: number;
  }
  export interface GIFEncoder {
    writeFrame: (index: Uint8Array, width: number, height: number, opts?: WriteFrameOptions) => void;
    finish: () => void;
    bytes: () => Uint8Array;
  }
  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoder;
  export function quantize(rgba: Uint8ClampedArray | Uint8Array, colors: number): number[][];
  export function applyPalette(rgba: Uint8ClampedArray | Uint8Array, palette: number[][]): Uint8Array;
}
