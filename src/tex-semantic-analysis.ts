import { parseTex } from "./tex-parser";
import {
    TexGroup,
    TexFontSwitch,
    TexHeightStyle,
    TexNode,
    TexStyleSpan,
    TexTokenType,
} from "./tex-types";

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

    ["\\doteq", "\\dot{=}"],
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

function is_style_command(node: TexNode): boolean {
    return node.type === "terminal"
        && node.head.type === TexTokenType.COMMAND
        && ['\\displaystyle', '\\textstyle', '\\rm', '\\it'].includes(node.head.value);
}

function process_styled_group(node: TexNode): TexNode {
    if (node.type !== "ordgroup") {
        return node;
    }

    const items = (node as TexGroup).items;
    if (!items.some(is_style_command)) {
        return node;
    }

    const result: TexNode[] = [];
    let height_style: TexHeightStyle | null = null;
    let font_switch: TexFontSwitch | null = null;
    let bucket: TexNode[] = [];

    const flush_bucket = () => {
        if (bucket.length === 0) {
            return;
        }

        const content = bucket.length === 1 ? bucket[0] : new TexGroup(bucket);
        const has_style = height_style !== null || font_switch !== null;
        result.push(has_style
            ? new TexStyleSpan(content, height_style, font_switch)
            : content
        );
        bucket = [];
    };

    for (const item of items) {
        if (is_style_command(item)) {
            let next_height_style: TexHeightStyle | null = height_style;
            let next_font_switch: TexFontSwitch | null = font_switch;
            switch (item.head.value) {
                case '\\displaystyle':
                    next_height_style = 'displaystyle';
                    break;
                case '\\textstyle':
                    next_height_style = 'textstyle';
                    break;
                case '\\rm':
                    next_font_switch = 'rm';
                    break;
                case '\\it':
                    next_font_switch = 'it';
                    break;
            }
            if (next_height_style !== height_style
                || next_font_switch !== font_switch) {
                flush_bucket();
                height_style = next_height_style;
                font_switch = next_font_switch;
            }
        } else {
            bucket.push(item);
        }
    }
    flush_bucket();

    return result.length === 1 ? result[0] : new TexGroup(result);
}

/**
 * Apply TeX style declarations to the remainder of their current group.
 * A later style declaration starts a new styled section.
 */
export function process_tex_styles(node: TexNode): TexNode {
    const processed = node.bottomTopTraversalTransform(process_styled_group);

    // Preserve the previous behavior for an input containing only a style
    // declaration, which semantically produces an empty group.
    return is_style_command(processed) ? new TexGroup([]) : processed;
}

export function analyze_tex(node: TexNode): TexNode {
    const expanded = expand_tex_predefined_macros(node);
    return process_tex_styles(expanded);
}
