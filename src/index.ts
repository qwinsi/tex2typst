import { parseTex } from "./parser";
import { Tex2TypstSettings } from "./types";
import { TypstWriter } from "./writer";

export function tex2typst(tex: string, settings?: Tex2TypstSettings): string {
    const DEFAULT_SETTINGS: Tex2TypstSettings = {
        preferTypstIntrinsic: false,
        customTexMacros: {}
    };
    if (!settings) {
        settings = DEFAULT_SETTINGS;
    } else {
        if (!settings.preferTypstIntrinsic) {
            settings.preferTypstIntrinsic = DEFAULT_SETTINGS.preferTypstIntrinsic;
        }
        if (!settings.customTexMacros) {
            settings.customTexMacros = DEFAULT_SETTINGS.customTexMacros;
        }
    }
    const t = parseTex(tex, settings.customTexMacros!);
    const writer = new TypstWriter(settings.preferTypstIntrinsic!);
    writer.append(t);
    return writer.finalize();
}
