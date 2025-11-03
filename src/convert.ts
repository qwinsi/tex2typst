import { TexNode, TexToken, TexTokenType, TexFuncCall, TexGroup, TexSupSub,
    TexText, TexBeginEnd, TexLeftRight, TexTerminal} from "./tex-types";
import type { Tex2TypstOptions } from "./exposed-types";
import { TypstFraction, TypstFuncCall, TypstGroup, TypstLeftright, TypstMarkupFunc, TypstMatrixLike, TypstNode, TypstSupsub, TypstTerminal } from "./typst-types";
import { TypstNamedParams } from "./typst-types";
import { TypstSupsubData } from "./typst-types";
import { TypstToken } from "./typst-types";
import { TypstTokenType } from "./typst-types";
import { symbolMap, reverseSymbolMap } from "./map";
import { array_includes, array_intersperse, array_split } from "./generic";
import { assert } from "./util";
import { TEX_BINARY_COMMANDS, TEX_UNARY_COMMANDS } from "./tex-tokenizer";


export class ConverterError extends Error {
    node: TexNode | TypstNode | TexToken | TypstToken | null;

    constructor(message: string, node: TexNode | TypstNode | TexToken | TypstToken | null = null) {
        super(message);
        this.name = "ConverterError";
        this.node = node;
    }
}

const TYPST_NONE = TypstToken.NONE.toNode();

// native textual operators in Typst
const TYPST_INTRINSIC_OP = [
    'dim',
    'id',
    'im',
    'mod',
    'Pr',
    'sech',
    'csch',
    // 'sgn
];

function _tex_token_str_to_typst(token: string): string | null {
    if (/^[a-zA-Z0-9]$/.test(token)) {
        return token;
    } else if (token === '/') {
        return '\\/';
    } else if (['\\\\', '\\{', '\\}', '\\%'].includes(token)) {
        return token.substring(1);
    } else if (['\\$', '\\#', '\\&', '\\_'].includes(token)) {
        return token;
    } else if (token.startsWith('\\')) {
        const symbol = token.slice(1);
        if (symbolMap.has(symbol)) {
            return symbolMap.get(symbol)!;
        } else {
            // Fall back to the original macro.
            // This works for \alpha, \beta, \gamma, etc.
            // If this.nonStrict is true, this also works for all unknown macros.
            return null;
        }
    }
    return token;
}

function tex_token_to_typst(token: TexToken, options: Tex2TypstOptions): TypstToken {
    let token_type: TypstTokenType;
    switch (token.type) {
        case TexTokenType.EMPTY:
            return TypstToken.NONE;
        case TexTokenType.COMMAND:
            token_type = TypstTokenType.SYMBOL;
            break;
        case TexTokenType.ELEMENT:
            token_type = TypstTokenType.ELEMENT;
            break;
        case TexTokenType.LITERAL:
            // This happens, for example, node={type: 'literal', content: 'myop'} as in `\operatorname{myop}`
            token_type = TypstTokenType.LITERAL;
            break;
        case TexTokenType.COMMENT:
            token_type = TypstTokenType.COMMENT;
            break;
        case TexTokenType.SPACE:
            token_type = TypstTokenType.SPACE;
            break;
        case TexTokenType.NEWLINE:
            token_type = TypstTokenType.NEWLINE;
            break;
        case TexTokenType.CONTROL: {
            if (token.value === '\\\\') {
                // \\ -> \
                return new TypstToken(TypstTokenType.CONTROL, '\\');
            } else if (token.value === '\\!') {
                // \! -> #h(-math.thin.amount)
                return new TypstToken(TypstTokenType.SYMBOL, '#h(-math.thin.amount)');
            } else if (symbolMap.has(token.value.substring(1))) {
                // node.content is one of \, \: \;
                const typst_symbol = symbolMap.get(token.value.substring(1))!;
                return new TypstToken(TypstTokenType.SYMBOL, typst_symbol);
            } else {
                throw new Error(`Unknown control sequence: ${token.value}`);
            }
        }
        default:
            throw Error(`Unknown token type: ${token.type}`);
    }

    const typst_str = _tex_token_str_to_typst(token.value);
    if (typst_str === null) {
        if (options.nonStrict) {
            return new TypstToken(token_type, token.value.substring(1));
        } else {
            throw new ConverterError(`Unknown token: ${token.value}`, token);
        }
    }
    return new TypstToken(token_type, typst_str);
}

// \overset{X}{Y} -> limits(Y)^X
// and with special case \overset{\text{def}}{=} -> eq.def
function convert_overset(node: TexFuncCall, options: Tex2TypstOptions): TypstNode {
    const [sup, base] = node.args;

    if (options.optimize) {
        // \overset{\text{def}}{=} or \overset{def}{=} are considered as eq.def
        if (["\\overset{\\text{def}}{=}", "\\overset{d e f}{=}"].includes(node.toString())) {
            return new TypstToken(TypstTokenType.SYMBOL, 'eq.def').toNode();
        }
    }
    const limits_call = new TypstFuncCall(
        new TypstToken(TypstTokenType.SYMBOL, 'limits'),
        [convert_tex_node_to_typst(base, options)]
    );
    return new TypstSupsub({
            base: limits_call,
            sup: convert_tex_node_to_typst(sup, options),
            sub: null,
    });
}

// \underset{X}{Y} -> limits(Y)_X
function convert_underset(node: TexFuncCall, options: Tex2TypstOptions): TypstNode {
    const [sub, base] = node.args;

    const limits_call = new TypstFuncCall(
        new TypstToken(TypstTokenType.SYMBOL, 'limits'),
        [convert_tex_node_to_typst(base, options)]
    );
    return new TypstSupsub({
            base: limits_call,
            sub: convert_tex_node_to_typst(sub, options),
            sup: null,
    });
}

function convert_tex_array_align_literal(alignLiteral: string): TypstNamedParams {
    const np: TypstNamedParams = {};
    const alignMap: Record<string, string> = { l: '#left', c: '#center', r: '#right' };
    const chars = Array.from(alignLiteral);

    const vlinePositions: number[] = [];
    let columnIndex = 0;
    for (const c of chars) {
        if (c === '|') {
            vlinePositions.push(columnIndex);
        } else if (c === 'l' || c === 'c' || c === 'r') {
            columnIndex++;
        }
    }

    if (vlinePositions.length > 0) {
        let augment_str: string;
        if (vlinePositions.length === 1) {
            augment_str = `#${vlinePositions[0]}`;
        } else {
            augment_str = `#(vline: (${vlinePositions.join(', ')}))`;
        }

        np['augment'] = new TypstToken(TypstTokenType.LITERAL, augment_str).toNode();
    }

    const alignments = chars
        .map(c => alignMap[c])
        .filter((x) => x !== undefined)
        .map(s => new TypstToken(TypstTokenType.LITERAL, s!).toNode());

    if (alignments.length > 0) {
        const all_same = alignments.every(item => item.eq(alignments[0]));
        np['align'] = all_same ? alignments[0] : new TypstToken(TypstTokenType.LITERAL, '#center').toNode();
    }
    return np;
}

const TYPST_LEFT_PARENTHESIS: TypstToken = new TypstToken(TypstTokenType.ELEMENT, '(');
const TYPST_RIGHT_PARENTHESIS: TypstToken = new TypstToken(TypstTokenType.ELEMENT, ')');

function is_delimiter(c: TypstNode): boolean {
    return c.head.type === TypstTokenType.ELEMENT && ['(', ')', '[', ']', '{', '}', '|', '⌊', '⌋', '⌈', '⌉'].includes(c.head.value);
}

function appendWithBracketsIfNeeded(node: TypstNode): TypstNode {
    let need_to_wrap = ['group', 'supsub', 'matrixLike', 'fraction','empty'].includes(node.type);

    if (node.type === 'group') {
        const group = node as TypstGroup;
        if (group.items.length === 0) {
            // e.g. TeX `P_{}` converts to Typst `P_()`
            need_to_wrap = true;
        } else {
            const first = group.items[0];
            const last = group.items[group.items.length - 1];
            if (is_delimiter(first) && is_delimiter(last)) {
                need_to_wrap = false;
            }
        }
    }

    if (need_to_wrap) {
        return new TypstLeftright(null, {
            left: TYPST_LEFT_PARENTHESIS,
            right: TYPST_RIGHT_PARENTHESIS,
            body: node,

        });
    } else {
        return node;
    }
}

export function convert_tex_node_to_typst(abstractNode: TexNode, options: Tex2TypstOptions = {}): TypstNode {
    switch (abstractNode.type) {
        case 'terminal': {
            const node = abstractNode as TexTerminal;
            return tex_token_to_typst(node.head, options).toNode();
        }
        case 'text': {
            const node = abstractNode as TexText;
            if ((/[^\x00-\x7F]+/).test(node.head.value) && options.nonAsciiWrapper !== "") {
                return new TypstFuncCall(
                    new TypstToken(TypstTokenType.SYMBOL, options.nonAsciiWrapper!),
                    [new TypstToken(TypstTokenType.TEXT, node.head.value).toNode()]
                );
            }
            return new TypstToken(TypstTokenType.TEXT, node.head.value).toNode();
        }
        case 'ordgroup':
            const node = abstractNode as TexGroup;
            return new TypstGroup(
                node.items.map((n) => convert_tex_node_to_typst(n, options))
            );
        case 'supsub': {
            const node = abstractNode as TexSupSub;
            let { base, sup, sub } = node;

            // special hook for overbrace
            // \overbrace{X}^{Y} -> overbrace(X, Y)
            if (base && base.type === 'funcCall' && base.head.value === '\\overbrace' && sup) {
                return new TypstFuncCall(
                    new TypstToken(TypstTokenType.SYMBOL, 'overbrace'),
                    [convert_tex_node_to_typst((base as TexFuncCall).args[0], options), convert_tex_node_to_typst(sup, options)]
                );
            } else if (base && base.type === 'funcCall' && base.head.value === '\\underbrace' && sub) {
                return new TypstFuncCall(
                    new TypstToken(TypstTokenType.SYMBOL, 'underbrace'),
                    [convert_tex_node_to_typst((base as TexFuncCall).args[0], options), convert_tex_node_to_typst(sub, options)]
                );
            }

            const data: TypstSupsubData = {
                base: convert_tex_node_to_typst(base, options),
                sup: sup? convert_tex_node_to_typst(sup, options) : null,
                sub: sub? convert_tex_node_to_typst(sub, options) : null,
            };

            data.base = appendWithBracketsIfNeeded(data.base);
            if (data.sup) {
                data.sup = appendWithBracketsIfNeeded(data.sup);
            }
            if (data.sub) {
                data.sub = appendWithBracketsIfNeeded(data.sub);
            }

            return new TypstSupsub(data);
        }
        case 'leftright': {
            const node = abstractNode as TexLeftRight;
            const { left, right } = node;

            const typ_body = convert_tex_node_to_typst(node.body, options);

            if (options.optimize) {
                // optimization off: "lr(bar.v.double a + 1/2 bar.v.double)"
                // optimization on : "norm(a + 1/2)"
                if (left !== null && right !== null) {
                    const typ_left = tex_token_to_typst(left, options);
                    const typ_right = tex_token_to_typst(right, options);
                    if (left.value === '\\|' && right.value === '\\|') {
                        return new TypstFuncCall(new TypstToken(TypstTokenType.SYMBOL, 'norm'), [typ_body]);
                    }

                    // These pairs will be handled by Typst compiler by default. No need to add lr()
                    if ([
                        "[]", "()", "\\{\\}",
                        "\\lfloor\\rfloor",
                        "\\lceil\\rceil",
                        "\\lfloor\\rceil",
                    ].includes(left.value + right.value)) {
                        return new TypstGroup([typ_left.toNode(), typ_body, typ_right.toNode()]);
                    }
                }
            }

            // "\left\{ a + \frac{1}{3} \right." -> "lr(\{ a + 1/3)"
            // "\left. a + \frac{1}{3} \right\}" -> "lr( a + 1/3 \})"
            // Note that: In lr(), if one side of delimiter doesn't present (i.e. derived from "\\left." or "\\right."),
            // "(", ")", "{", "[", should be escaped with "\" to be the other side of delimiter.
            // Simple "lr({ a+1/3)" doesn't compile in Typst.
            const escape_curly_or_paren = function(s: TypstToken): TypstToken {
                if (["(", ")", "{", "["].includes(s.value)) {
                    return new TypstToken(TypstTokenType.ELEMENT, "\\" + s.value);
                } else {
                    return s;
                }
            };

            let typ_left = left? tex_token_to_typst(left, options) : null;
            let typ_right = right? tex_token_to_typst(right, options) : null;
            if (typ_left === null && typ_right !== null) { // left.
                typ_right = escape_curly_or_paren(typ_right);
            }
            if (typ_right === null && typ_left !== null) { // right.
                typ_left = escape_curly_or_paren(typ_left);
            }

            return new TypstLeftright(
                new TypstToken(TypstTokenType.SYMBOL, 'lr'),
                { body: typ_body, left: typ_left, right: typ_right }
            );
        }
        case 'funcCall': {
            const node = abstractNode as TexFuncCall;
            const arg0 = convert_tex_node_to_typst(node.args[0], options);
            // \sqrt[3]{x} -> root(3, x)
            if (node.head.value === '\\sqrt' && node.data) {
                const data = convert_tex_node_to_typst(node.data, options); // the number of times to take the root
                return new TypstFuncCall(
                    new TypstToken(TypstTokenType.SYMBOL, 'root'),
                    [data, arg0]
                );
            }
            // \mathbf{a} -> upright(bold(a))
            if (node.head.value === '\\mathbf') {
                const inner: TypstNode = new TypstFuncCall(
                    new TypstToken(TypstTokenType.SYMBOL, 'bold'),
                    [arg0]
                );
                return new TypstFuncCall(
                    new TypstToken(TypstTokenType.SYMBOL, 'upright'),
                    [inner]
                );
            }
            // \overrightarrow{AB} -> arrow(A B)
            if (node.head.value === '\\overrightarrow') {
                return new TypstFuncCall(
                    new TypstToken(TypstTokenType.SYMBOL, 'arrow'),
                    [arg0]
                );
            }
            // \overleftarrow{AB} -> accent(A B, arrow.l)
            if (node.head.value === '\\overleftarrow') {
                return new TypstFuncCall(
                    new TypstToken(TypstTokenType.SYMBOL, 'accent'),
                    [arg0, new TypstToken(TypstTokenType.SYMBOL, 'arrow.l').toNode()]
                );
            }
            // \operatorname{opname} -> op("opname")
            if (node.head.value === '\\operatorname') {
                // arg0 must be of type 'literal' in this situation
                if (options.optimize) {
                    if (TYPST_INTRINSIC_OP.includes(arg0.head.value)) {
                        return new TypstToken(TypstTokenType.SYMBOL, arg0.head.value).toNode();
                    }
                }
                return new TypstFuncCall(new TypstToken(TypstTokenType.SYMBOL, 'op'), [new TypstToken(TypstTokenType.TEXT, arg0.head.value).toNode()]);
            }

            // \textcolor{red}{2y} -> #text(fill: red)[$2y$]
            if (node.head.value === '\\textcolor') {
                const res = new TypstMarkupFunc(
                    new TypstToken(TypstTokenType.SYMBOL, `#text`),
                    [convert_tex_node_to_typst(node.args[1], options)]
                );
                res.setOptions({ fill: arg0 });
                return res;
            }

            // \substack{a \\ b} -> a \ b
            // as in translation from \sum_{\substack{a \\ b}} to sum_(a \ b)
            if (node.head.value === '\\substack') {
                return arg0;
            }

            // \set{a, b, c} -> {a, b, c}
            if (node.head.value === '\\set') {
                return new TypstLeftright(
                    null,
                    { body: arg0, left: TypstToken.LEFT_BRACE, right: TypstToken.RIGHT_BRACE }
                );
            }

            if (node.head.value === '\\overset') {
                return convert_overset(node, options);
            }
            if (node.head.value === '\\underset') {
                return convert_underset(node, options);
            }

            // \frac{a}{b} -> a / b
            if (node.head.value === '\\frac') {
                if (options.fracToSlash) {
                    return new TypstFraction(node.args.map((n) => convert_tex_node_to_typst(n, options)).map(appendWithBracketsIfNeeded));
                }
            }

            if(options.optimize) {
                // \mathbb{R} -> RR
                if (node.head.value === '\\mathbb' && /^\\mathbb{[A-Z]}$/.test(node.toString())) {
                    return new TypstToken(TypstTokenType.SYMBOL, arg0.head.value.repeat(2)).toNode();
                }
                // \mathrm{d} -> dif
                if (node.head.value === '\\mathrm' && node.toString() === '\\mathrm{d}') {
                    return new TypstToken(TypstTokenType.SYMBOL, 'dif').toNode();
                }
            }

            // generic case
            return new TypstFuncCall(
                tex_token_to_typst(node.head, options),
                node.args.map((n) => convert_tex_node_to_typst(n, options))
            );
        }
        case 'beginend': {
            const node = abstractNode as TexBeginEnd;
            const matrix = node.matrix.map((row) => row.map((n) => convert_tex_node_to_typst(n, options)));

            if (node.head.value.startsWith('align')) {
                // align, align*, alignat, alignat*, aligned, etc.
                return new TypstMatrixLike(null, matrix);
            }
            if (node.head.value === 'cases') {
                return new TypstMatrixLike(TypstMatrixLike.CASES, matrix);
            }
            if (node.head.value === 'subarray') {
                if (node.data) {
                    const align_node = node.data;
                    switch (align_node.head.value) {
                        case 'r':
                            matrix.forEach(row => row.push(TypstToken.EMPTY.toNode()));
                            break;
                        case 'l':
                            matrix.forEach(row => row.unshift(TypstToken.EMPTY.toNode()));
                            break;
                        default:
                            break;
                    }
                }
                return new TypstMatrixLike(null, matrix);
            }
            if (node.head.value === 'array') {
                const np: TypstNamedParams = { 'delim': TYPST_NONE };

                assert(node.data !== null && node.head.type === TexTokenType.LITERAL);
                const np_new = convert_tex_array_align_literal(node.data!.head.value);
                Object.assign(np, np_new);

                const res = new TypstMatrixLike(TypstMatrixLike.MAT, matrix);
                res.setOptions(np);
                return res;
            }
            if (node.head.value.endsWith('matrix')) {
                const res = new TypstMatrixLike(TypstMatrixLike.MAT, matrix);
                let delim: TypstToken;
                switch (node.head.value) {
                    case 'matrix':
                        delim = TypstToken.NONE;
                        break;
                    case 'pmatrix':
                        // delim = new TypstToken(TypstTokenType.TEXT, '(');
                        // break;
                        return res; // typst mat use delim:"(" by default
                    case 'bmatrix':
                        delim = new TypstToken(TypstTokenType.TEXT, '[');
                        break;
                    case 'Bmatrix':
                        delim = new TypstToken(TypstTokenType.TEXT, '{');
                        break;
                    case 'vmatrix':
                        delim = new TypstToken(TypstTokenType.TEXT, '|');
                        break;
                    case 'Vmatrix': {
                        delim = new TypstToken(TypstTokenType.SYMBOL, 'bar.v.double');
                        break;
                    }
                    default:
                        throw new ConverterError(`Unimplemented beginend: ${node.head}`, node);
                }
                res.setOptions({ 'delim': delim.toNode()});
                return res;
            }
            throw new ConverterError(`Unimplemented beginend: ${node.head}`, node);
        }
        default:
            throw new ConverterError(`Unimplemented node type: ${abstractNode.type}`, abstractNode);
    }
}


/*
const TYPST_UNARY_FUNCTIONS: string[] = [
    'sqrt',
    'bold',
    'arrow',
    'upright',
    'lr',
    'op',
    'macron',
    'dot',
    'dot.double',
    'hat',
    'tilde',
    'overline',
    'underline',
    'bb',
    'cal',
    'frak',
    'floor',
    'ceil',
    'norm',
    'limits',
    '#h',
];

const TYPST_BINARY_FUNCTIONS: string[] = [
    'frac',
    'root',
    'overbrace',
    'underbrace',
];
*/

function apply_escape_if_needed(c: TexToken): TexToken {
    if (['{', '}', '%'].includes(c.value)) {
        return new TexToken(TexTokenType.ELEMENT, '\\' + c.value);
    }
    return c;
}


function typst_token_to_tex(token: TypstToken): TexToken {
    switch (token.type) {
        case TypstTokenType.NONE:
            // e.g. Typst `#none^2` is converted to TeX `^2`
            return TexToken.EMPTY;
        case TypstTokenType.SYMBOL: {
            const _typst_symbol_to_tex = function(symbol: string): string {
                if (reverseSymbolMap.has(symbol)) {
                    return '\\' + reverseSymbolMap.get(symbol)!;
                } else {
                    return '\\' + symbol;
                }
            }
            return new TexToken(TexTokenType.COMMAND, _typst_symbol_to_tex(token.value));
        }
        case TypstTokenType.ELEMENT: {
            let value: string;
            if (['{', '}', '%'].includes(token.value)) {
                value = '\\' + token.value;
            } else {
                value = token.value;
            }
            return new TexToken(TexTokenType.ELEMENT, value);
        }
        case TypstTokenType.LITERAL:
            return new TexToken(TexTokenType.LITERAL, token.value);
        case TypstTokenType.TEXT:
            return new TexToken(TexTokenType.LITERAL, token.value);
        case TypstTokenType.COMMENT:
            return new TexToken(TexTokenType.COMMENT, token.value);
        case TypstTokenType.SPACE:
            return new TexToken(TexTokenType.SPACE, token.value);
        case TypstTokenType.CONTROL: {
            let value: string;
            switch(token.value) {
                case '\\':
                    value = '\\\\';
                    break;
                case '&':
                    value = '&';
                    break;
                default:
                        throw new Error(`[typst_token_to_tex]Unimplemented control sequence: ${token.value}`);
            }
            return new TexToken(TexTokenType.CONTROL, value);
        }
        case TypstTokenType.NEWLINE:
            return new TexToken(TexTokenType.NEWLINE, token.value);
        default:
            throw new Error(`Unimplemented token type: ${token.type}`);
    }
}


const TEX_NODE_COMMA = new TexToken(TexTokenType.ELEMENT, ',').toNode();

export function convert_typst_node_to_tex(abstractNode: TypstNode): TexNode {
    switch (abstractNode.type) {
        case 'terminal': {
            const node = abstractNode as TypstTerminal;
            if (node.head.type === TypstTokenType.SYMBOL) {
                // special hook for eq.def
                if (node.head.value === 'eq.def') {
                    return new TexFuncCall(new TexToken(TexTokenType.COMMAND, '\\overset'), [
                        new TexText(new TexToken(TexTokenType.LITERAL, 'def')),
                        new TexToken(TexTokenType.ELEMENT, '=').toNode()
                    ]);
                }
                // special hook for comma
                if(node.head.value === 'comma') {
                    return new TexToken(TexTokenType.ELEMENT, ',').toNode();
                }
                // special hook for dif
                if(node.head.value === 'dif') {
                    return new TexFuncCall(new TexToken(TexTokenType.COMMAND, '\\mathrm'), [new TexToken(TexTokenType.ELEMENT, 'd').toNode()]);
                }
                // special hook for hyph and hyph.minus
                if(node.head.value === 'hyph' || node.head.value === 'hyph.minus') {
                    return new TexText(new TexToken(TexTokenType.LITERAL, '-'));
                }
                // special hook for mathbb{R} <-- RR
                if(/^([A-Z])\1$/.test(node.head.value)) {
                    return new TexFuncCall(new TexToken(TexTokenType.COMMAND, '\\mathbb'), [
                        new TexToken(TexTokenType.ELEMENT, node.head.value[0]).toNode()
                    ]);
                }
            }
            if (node.head.type === TypstTokenType.TEXT) {
                return new TexText(new TexToken(TexTokenType.LITERAL, node.head.value));
            }
            return typst_token_to_tex(node.head).toNode();
        }

        case 'group': {
            const node = abstractNode as TypstGroup;
            const args = node.items.map(convert_typst_node_to_tex);
            const alignment_char = new TexToken(TexTokenType.CONTROL, '&').toNode();
            const newline_char = new TexToken(TexTokenType.CONTROL, '\\\\').toNode();
            if (array_includes(args, alignment_char)) {
                // wrap the whole math formula with \begin{aligned} and \end{aligned}
                const rows = array_split(args, newline_char);
                const matrix: TexNode[][] = [];
                for(const row of rows) {
                    const cells = array_split(row, alignment_char);
                    matrix.push(cells.map(cell => new TexGroup(cell)));
                }
                return new TexBeginEnd(new TexToken(TexTokenType.LITERAL, 'aligned'), matrix);
            }
            return new TexGroup(args);
        }
        case 'leftright': {
            const node = abstractNode as TypstLeftright;
            const body = convert_typst_node_to_tex(node.body);
            let left = node.left? typst_token_to_tex(node.left) : new TexToken(TexTokenType.ELEMENT, '.');
            let right = node.right? typst_token_to_tex(node.right) : new TexToken(TexTokenType.ELEMENT, '.');
            // const is_over_high = node.isOverHigh();
            // const left_delim = is_over_high ? '\\left(' : '(';
            // const right_delim = is_over_high ? '\\right)' : ')';
            if (node.isOverHigh()) {
                left.value = '\\left' + left.value;
                right.value = '\\right' + right.value;
            }
            // TODO: should be TeXLeftRight(...)
            // But currently writer will output `\left |` while people commonly prefer `\left|`.
            return new TexGroup([left.toNode(), body, right.toNode()]);
        }
        case 'funcCall': {
            const node = abstractNode as TypstFuncCall;
            switch (node.head.value) {
                // special hook for norm
                // `\| a  \|` <- `norm(a)`
                // `\left\| a + \frac{1}{3} \right\|` <- `norm(a + 1/3)`
                case 'norm': {
                    const arg0 = node.args[0];
                    const body = convert_typst_node_to_tex(arg0);
                    if (node.isOverHigh()) {
                        return new TexLeftRight({
                            body: body,
                            left: new TexToken(TexTokenType.COMMAND, "\\|"),
                            right: new TexToken(TexTokenType.COMMAND, "\\|")
                        });
                    } else {
                        return body;
                    }
                }
                // special hook for floor, ceil
                // `\lfloor a \rfloor` <- `floor(a)`
                // `\lceil a \rceil` <- `ceil(a)`
                // `\left\lfloor a \right\rfloor` <- `floor(a)`
                // `\left\lceil a \right\rceil` <- `ceil(a)`
                case 'floor':
                case 'ceil': {
                    const left = "\\l" + node.head.value;
                    const right = "\\r" + node.head.value;
                    const arg0 = node.args[0];
                    const body = convert_typst_node_to_tex(arg0);
                    const left_node = new TexToken(TexTokenType.COMMAND, left);
                    const right_node = new TexToken(TexTokenType.COMMAND, right);
                    if (node.isOverHigh()) {
                        return new TexLeftRight({
                            body: body,
                            left: left_node,
                            right: right_node
                        });
                    } else {
                        return new TexGroup([left_node.toNode(), body, right_node.toNode()]);
                    }
                }
                // special hook for root
                case 'root': {
                    const [degree, radicand] = node.args;
                    const data = convert_typst_node_to_tex(degree);
                    return new TexFuncCall(new TexToken(TexTokenType.COMMAND, '\\sqrt'), [convert_typst_node_to_tex(radicand)], data);
                }
                // special hook for overbrace and underbrace
                case 'overbrace':
                case 'underbrace': {
                    const [body, label] = node.args;
                    const base = new TexFuncCall(typst_token_to_tex(node.head), [convert_typst_node_to_tex(body)]);
                    const script = convert_typst_node_to_tex(label);
                    const data = node.head.value === 'overbrace' ? { base, sup: script, sub: null } : { base, sub: script, sup: null };
                    return new TexSupSub(data);
                }
                // special hook for vec
                // "vec(a, b, c)" -> "\begin{pmatrix}a\\ b\\ c\end{pmatrix}"
                case 'vec': {
                    const tex_matrix = node.args.map(convert_typst_node_to_tex).map((n) => [n]);
                    return new TexBeginEnd(new TexToken(TexTokenType.LITERAL, 'pmatrix'), tex_matrix);
                }
                // special hook for op
                case 'op': {
                    const arg0 = node.args[0];
                    assert(arg0.head.type === TypstTokenType.TEXT);
                    return new TexFuncCall(typst_token_to_tex(node.head), [new TexToken(TexTokenType.LITERAL, arg0.head.value).toNode()]);
                }
                // general case
                default: {
                    const func_name_tex = typst_token_to_tex(node.head);
                    const is_known_func = TEX_UNARY_COMMANDS.includes(func_name_tex.value.substring(1))
                                            || TEX_BINARY_COMMANDS.includes(func_name_tex.value.substring(1));
                    if (func_name_tex.value.length > 0 && is_known_func) {
                        return new TexFuncCall(func_name_tex, node.args.map(convert_typst_node_to_tex));
                    } else {
                        return new TexGroup([
                            typst_token_to_tex(node.head).toNode(),
                            new TexToken(TexTokenType.ELEMENT, '(').toNode(),
                            ...array_intersperse(node.args.map(convert_typst_node_to_tex), TEX_NODE_COMMA),
                            new TexToken(TexTokenType.ELEMENT, ')').toNode()
                        ]);
                    }
                }
            }
        }
        case 'markupFunc': {
            const node = abstractNode as TypstMarkupFunc;
            switch (node.head.value) {
                case '#text': {
                    // `\textcolor{red}{2y}` <- `#text(fill: red)[$2 y$]`
                    if (node.options && node.options['fill']) {
                        const color = node.options['fill'];
                        return new TexFuncCall(
                            new TexToken(TexTokenType.COMMAND, '\\textcolor'),
                            [convert_typst_node_to_tex(color), convert_typst_node_to_tex(node.fragments[0])]
                        )
                    }
                }
                case '#heading':
                default:
                    throw new Error(`Unimplemented markup function: ${node.head.value}`);
            }
        }
        case 'supsub': {
            const node = abstractNode as TypstSupsub;
            const { base, sup, sub } = node;
            const sup_tex = sup? convert_typst_node_to_tex(sup) : null;
            const sub_tex = sub? convert_typst_node_to_tex(sub) : null;

            // special hook for limits
            // `limits(+)^a` -> `\overset{a}{+}`
            // `limits(+)_a` -> `\underset{a}{+}`
            // `limits(+)_a^b` -> `\overset{b}{\underset{a}{+}}`
            if (base.head.eq(new TypstToken(TypstTokenType.SYMBOL, 'limits'))) {
                const limits = base as TypstFuncCall;
                const body_in_limits = convert_typst_node_to_tex(limits.args[0]);
                if (sup_tex !== null && sub_tex === null) {
                    return new TexFuncCall(new TexToken(TexTokenType.COMMAND, '\\overset'), [sup_tex, body_in_limits]);
                } else if (sup_tex === null && sub_tex !== null) {
                    return new TexFuncCall(new TexToken(TexTokenType.COMMAND, '\\underset'), [sub_tex, body_in_limits]);
                } else {
                    const underset_call = new TexFuncCall(new TexToken(TexTokenType.COMMAND, '\\underset'), [sub_tex!, body_in_limits]);
                    return new TexFuncCall(new TexToken(TexTokenType.COMMAND, '\\overset'), [sup_tex!, underset_call]);
                }
            }

            const base_tex = convert_typst_node_to_tex(base);

            const res = new TexSupSub({
                base: base_tex,
                sup: sup_tex,
                sub: sub_tex
            });
            return res;
        }
        case 'matrixLike': {
            const node = abstractNode as TypstMatrixLike;
            const tex_matrix = node.matrix.map(row => row.map(convert_typst_node_to_tex));
            if (node.head.eq(TypstMatrixLike.MAT)) {
                let env_type = 'pmatrix'; // typst mat use delim:"(" by default
                if (node.options) {
                    if ('delim' in node.options) {
                        const delim = node.options.delim;
                        switch (delim.head.value) {
                            case '#none':
                                env_type = 'matrix';
                                break;
                            case '[':
                            case ']':
                                env_type = 'bmatrix';
                                break;
                            case '(':
                            case ')':
                                env_type = 'pmatrix';
                                break;
                            case '{':
                            case '}':
                                env_type = 'Bmatrix';
                                break;
                            case '|':
                                env_type = 'vmatrix';
                                break;
                            case 'bar':
                            case 'bar.v':
                                env_type = 'vmatrix';
                                break;
                            case 'bar.v.double':
                                env_type = 'Vmatrix';
                                break;
                            default:
                                throw new Error(`Unexpected delimiter ${delim.head}`);
                        }
                    }
                }
                return new TexBeginEnd(new TexToken(TexTokenType.LITERAL, env_type), tex_matrix);
            } else if (node.head.eq(TypstMatrixLike.CASES)) {
                return new TexBeginEnd(new TexToken(TexTokenType.LITERAL, 'cases'), tex_matrix);
            } else {
                throw new Error(`Unexpected matrix type ${node.head}`);
            }
        }
        case 'fraction': {
            const node = abstractNode as TypstFraction;
            const [numerator, denominator] = node.args;
            const num_tex = convert_typst_node_to_tex(numerator);
            const den_tex = convert_typst_node_to_tex(denominator);
            return new TexFuncCall(new TexToken(TexTokenType.COMMAND, '\\frac'), [num_tex, den_tex]);
        }
        default:
            throw new Error('[convert_typst_node_to_tex] Unimplemented type: ' + abstractNode.type);
    }
}

