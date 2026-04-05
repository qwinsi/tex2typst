import { parseTex } from "./tex-parser";
import { TexNode, TexTerminal, TexToken, TexTokenType } from "./tex-types";

const TEX_PREDEFINED_MACROS: Map<string, string> = new Map([
// https://github.com/KaTeX/KaTeX/blob/434d4b8aef4c3311ebfd3405a9f0cce18ead953b/src/macros.ts#L351-L367
    ["\\varGamma", "\\mathit{\\Gamma}"],
    ["\\varDelta", "\\mathit{\\Delta}"],
    ["\\varTheta", "\\mathit{\\Theta}"],
    ["\\varLambda", "\\mathit{\\Lambda}"],
    ["\\varXi", "\\mathit{\\Xi}"],
    ["\\varPi", "\\mathit{\\Pi}"],
    ["\\varSigma", "\\mathit{\\Sigma}"],
    ["\\varUpsilon", "\\mathit{\\Upsilon}"],
    ["\\varPhi", "\\mathit{\\Phi}"],
    ["\\varPsi", "\\mathit{\\Psi}"],
    ["\\varOmega", "\\mathit{\\Omega}"],
]);

function _expand_tex_predefined_macros(node: TexNode): TexNode {
    switch (node.type) {
        case "terminal": {
            if (node.head.type === TexTokenType.COMMAND) {
                if (TEX_PREDEFINED_MACROS.has(node.head.value)) {
                    const target_str = TEX_PREDEFINED_MACROS.get(node.head.value)!;
                    return parseTex(target_str);
                }
            }
        }
        case "funcCall":
        default:
            return node;
    }
}

export function expand_tex_predefined_macros(node: TexNode): TexNode {
    return node.bottomTopTraversalTransform(_expand_tex_predefined_macros);
}
