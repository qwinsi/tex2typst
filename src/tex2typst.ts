/**
 * This file is the entry point for bundling the .js file for the browser.
 */

import { tex2typst } from './index';

if(typeof window !== 'undefined') {
    (window as any).tex2typst = tex2typst;
}
