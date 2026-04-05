import { parseTex } from "./tex-parser";
import type { Tex2TypstOptions, Typst2TexOptions } from "./exposed-types";
import { TypstWriter } from "./typst-writer";
import { type TypstWriterOptions } from "./typst-types";
import { convert_tex_node_to_typst, convert_typst_node_to_tex } from "./convert";
import { symbolMap } from "./map";
import { parseTypst } from "./typst-parser";
import { TexWriter } from "./tex-writer";
import { shorthandMap } from "./typst-shorthands";
import { expand_tex_predefined_macros } from "./tex-semantic-analysis";


export function tex2typst(tex: string, options: Partial<Tex2TypstOptions> = {}): string {
    const opt: Tex2TypstOptions = {
        nonStrict: true,
        preferShorthands: true,
        keepSpaces: false,
        fracToSlash: true,
        inftyToOo: false,
        optimize: true,
        customTexMacros: {}
    };

    if (typeof options !== 'object') {
        throw new Error("options must be an object");
    }
    for (const key in opt) {
        if (key in options) {
            opt[key as keyof Tex2TypstOptions] = options[key as keyof Tex2TypstOptions] as any;
        }
    }

    const texTree = parseTex(tex, opt.customTexMacros!);
    const preprocessedTexTree = expand_tex_predefined_macros(texTree);
    const typstTree = convert_tex_node_to_typst(preprocessedTexTree, opt);
    const writer = new TypstWriter(opt as TypstWriterOptions);
    writer.serialize(typstTree);
    return writer.finalize();
}

export function typst2tex(typst: string, options: Partial<Typst2TexOptions> = {}): string {
    const opt: Typst2TexOptions = {
        blockMathMode: true,
    };

    if (typeof options !== 'object') {
        throw new Error("options must be an object");
    }
    for (const key in opt) {
        if (key in options) {
            opt[key as keyof Typst2TexOptions] = options[key as keyof Typst2TexOptions] as any;
        }
    }

    const typstTree = parseTypst(typst);
    const texTree = convert_typst_node_to_tex(typstTree, opt);
    const writer = new TexWriter();
    writer.append(texTree);
    return writer.finalize();
}

export { symbolMap, shorthandMap };
