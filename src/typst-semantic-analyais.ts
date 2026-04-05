import { parseTypst } from "./typst-parser";
import { TypstNode, TypstTokenType } from "./typst-types";


const TEX_PREDEFINED_VARIABLES: Map<string, string> = new Map([
    ["dif", "upright(d)"],
    ["eq.def", 'limits(=)^"def"'],
    ["oo", "infinity"],
    ["comma", ","],
    ["hyph", '"-"'],
    ["hyph.minus", '"-"'],

    /*
    ["AA", "bb(A)"],
    ["BB", "bb(B)"],
    ["CC", "bb(C)"],
    */
]);

function _expand_typst_predefined_variables(node: TypstNode): TypstNode {
    switch (node.type) {
        case "terminal": {
            if (node.head.type === TypstTokenType.SYMBOL) {
                if (TEX_PREDEFINED_VARIABLES.has(node.head.value)) {
                    const target_str = TEX_PREDEFINED_VARIABLES.get(node.head.value)!;
                    return parseTypst(target_str);
                }
            }
        }
        case "funcCall":
        default:
            return node;
    }
}

export function expand_typst_predefined_variables(node: TypstNode): TypstNode {
    return node.bottomTopTraversalTransform(_expand_typst_predefined_variables);
}
