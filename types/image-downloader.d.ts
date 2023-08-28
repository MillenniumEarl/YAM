// Copyright (c) 2021 MillenniumEarl
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

declare module "image-downloader" {
  interface Options {
    /**
     *  The image URL to download
     */
    url: string;
    /**
     * The image destination. Can be a directory or a filename.
     * If a directory is given, ID will automatically extract
     * the image filename from `options.url`
     */
    dest: string;
    /**
     * Boolean indicating whether the image filename will be automatically
     * extracted from `options.url` or not. Set to false to have `options.dest`
     * without a file extension for example. (default: `true`)
     */
    extractFilename?: boolean;
    /**
     * HTTP headers (default: {})
     */
    headers?: Record<string, unknown>;
    /**
     * Milliseconds before a request times out
     */
    timeout?: number;
  }
  async function image(options: Options): Promise<{ filename: string }>;

  export { image, Options };
}