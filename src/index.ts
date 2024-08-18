import { parseTex } from "./parser";
import { Tex2TypstOptions } from "./types";
import { TypstWriter } from "./writer";


export function tex2typst(tex: string, options?: Tex2TypstOptions): string {
    const opt: Tex2TypstOptions = {
        nonStrict: false,
        preferTypstIntrinsic: true,
        customTexMacros: {}
    };
    if (options) {
        if (options.nonStrict) {
            opt.nonStrict = options.nonStrict;
        }
        if (options.preferTypstIntrinsic) {
            opt.preferTypstIntrinsic = options.preferTypstIntrinsic;
        }
        if (options.customTexMacros) {
            opt.customTexMacros = options.customTexMacros;
        }
    }
    const t = parseTex(tex, opt.customTexMacros!);
    const writer = new TypstWriter(opt.nonStrict!, opt.preferTypstIntrinsic!);
    writer.append(t);
    return writer.finalize();
}


if(typeof window !== 'undefined') {
    (window as any).tex2typst = tex2typst;
}

export { Tex2TypstOptions };
