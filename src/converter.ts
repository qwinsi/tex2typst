import { parseTex } from "./parser";
import { TypstWriter } from "./writer";

export function tex2typst(tex: string): string {
    const t = parseTex(tex);
    const writer = new TypstWriter();
    writer.append(t);
    return writer.finalize();
}
