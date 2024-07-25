import { parseTex } from "./parser";
import { Tex2TypstSettings } from "./types";
import { TypstWriter } from "./writer";

export function tex2typst(tex: string, settings?: Tex2TypstSettings): string {
    if (!settings) {
        settings = {
            preferTypstIntrinsic: false,
        };
    }
    const t = parseTex(tex);
    const writer = new TypstWriter(settings.preferTypstIntrinsic);
    writer.append(t);
    return writer.finalize();
}
