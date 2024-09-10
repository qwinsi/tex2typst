import { symbolMap } from "./map";
import { TexNode, TexSqrtData, TexSupsubData, TypstNode, TypstSupsubData } from "./types";


// symbols that are supported by Typst but not by KaTeX
const TYPST_INTRINSIC_SYMBOLS = [
    'dim',
    'id',
    'im',
    'mod',
    'Pr',
    'sech',
    'csch',
    // 'sgn
];

export class TypstWriterError extends Error {
    node: TexNode | TypstNode;

    constructor(message: string, node: TexNode | TypstNode) {
        super(message);
        this.name = "TypstWriterError";
        this.node = node;
    }
}

export class TypstWriter {
    private nonStrict: boolean;
    private preferTypstIntrinsic: boolean;

    protected buffer: string = "";
    protected queue: TypstNode[] = [];

    private needSpaceAfterSingleItemScript = false;
    private insideFunctionDepth = 0;

    constructor(nonStrict: boolean, preferTypstIntrinsic: boolean) {
        this.nonStrict = nonStrict;
        this.preferTypstIntrinsic = preferTypstIntrinsic;
    }


    private writeBuffer(str: string) {
        if (this.needSpaceAfterSingleItemScript && /^[0-9a-zA-Z\(]/.test(str)) {
            this.buffer += ' ';
        } else {
            let no_need_space = false;
            // starting clause
            no_need_space ||= /[\(\|]$/.test(this.buffer) && /^\w/.test(str);
            // putting punctuation
            no_need_space ||= /^[}()_^,;!\|]$/.test(str);
            // putting a prime
            no_need_space ||= str === "'";
            // continue a number
            no_need_space ||= /[0-9]$/.test(this.buffer) && /^[0-9]/.test(str);
            // leading sign
            no_need_space ||= /[\(\[{]\s*(-|\+)$/.test(this.buffer) || this.buffer === "-" || this.buffer === "+";
            // new line
            no_need_space ||= str.startsWith('\n');
            // buffer is empty
            no_need_space ||= this.buffer === "";
            // other cases
            no_need_space ||= /[\s"_^{\(]$/.test(this.buffer);
            if(!no_need_space) {
                this.buffer += ' ';
            }
        }

        if (this.needSpaceAfterSingleItemScript) {
            this.needSpaceAfterSingleItemScript = false;
        }

        this.buffer += str;
    }

    public append(node: TypstNode) {
        switch (node.type) {
            case 'empty':
                break;
            case 'symbol': {
                let content = node.content!;
                if (node.content === ',' && this.insideFunctionDepth > 0) {
                    content = 'comma';
                }
                this.queue.push({ type: 'symbol', content: content });
                break;
            }
            case 'text':
            case 'comment':
            case 'newline':
                this.queue.push(node);
                break;
            case 'group':
                for (const item of node.args!) {
                    this.append(item);
                }
                break;
            case 'supsub': {
                let { base, sup, sub } = node.data as TypstSupsubData;
                this.appendWithBracketsIfNeeded(base);

                let trailing_space_needed = false;
                const has_prime = (sup && sup.type === 'symbol' && sup.content === '\'');
                if (has_prime) {
                    // Put prime symbol before '_'. Because $y_1'$ is not displayed properly in Typst (so far)
                    // e.g. 
                    // y_1' -> y'_1
                    // y_{a_1}' -> y'_{a_1}
                    this.queue.push({ type: 'atom', content: '\''});
                    trailing_space_needed = false;
                }
                if (sub) {
                    this.queue.push({ type: 'atom', content: '_'});
                    trailing_space_needed = this.appendWithBracketsIfNeeded(sub);
                }
                if (sup && !has_prime) {
                    this.queue.push({ type: 'atom', content: '^'});
                    trailing_space_needed = this.appendWithBracketsIfNeeded(sup);
                }
                if (trailing_space_needed) {
                    this.queue.push({ type: 'softSpace', content: ''});
                }
                break;
            }
            case 'binaryFunc': {
                const func_symbol: TypstNode = { type: 'symbol', content: node.content };
                const [arg0, arg1] = node.args!;
                this.queue.push(func_symbol);
                this.insideFunctionDepth ++;
                this.queue.push({ type: 'atom', content: '('});
                this.append(arg0);
                this.queue.push({ type: 'atom', content: ','});
                this.append(arg1);
                this.queue.push({ type: 'atom', content: ')'});
                this.insideFunctionDepth --;
                break;
            }
            case 'unaryFunc': {
                const func_symbol: TypstNode = { type: 'symbol', content: node.content };
                const arg0 = node.args![0];
                this.queue.push(func_symbol);
                this.insideFunctionDepth ++;
                this.queue.push({ type: 'atom', content: '('});
                this.append(arg0);
                this.queue.push({ type: 'atom', content: ')'});
                this.insideFunctionDepth --;
                break;
            }
            case 'align': {
                const matrix = node.data as TypstNode[][];
                matrix.forEach((row, i) => {
                    row.forEach((cell, j) => {
                        if (j > 0) {
                            this.queue.push({ type: 'atom', content: '&' });
                        }
                        this.append(cell);
                    });
                    if (i < matrix.length - 1) {
                        this.queue.push({ type: 'symbol', content: '\\' });
                    }
                });
                break;
            }
            case 'matrix': {
                const matrix = node.data as TypstNode[][];
                this.queue.push({ type: 'symbol', content: 'mat' });
                this.insideFunctionDepth ++; 
                this.queue.push({ type: 'atom', content: '('});
                this.queue.push({type: 'symbol', content: 'delim: #none, '});
                matrix.forEach((row, i) => {
                    row.forEach((cell, j) => {
                        // There is a leading & in row
                        // if (cell.type === 'ordgroup' && cell.args!.length === 0) {
                            // this.queue.push({ type: 'atom', content: ',' });
                            // return;
                        // }
                        // if (j == 0 && cell.type === 'newline' && cell.content === '\n') {
                            // return;
                        // }
                        this.append(cell);
                        // cell.args!.forEach((n) => this.append(n));
                        if (j < row.length - 1) {
                            this.queue.push({ type: 'atom', content: ',' });
                        } else {
                            if (i < matrix.length - 1) {
                                this.queue.push({ type: 'atom', content: ';' });
                            }
                        }
                    });
                });
                this.queue.push({ type: 'atom', content: ')'});
                this.insideFunctionDepth --;
                break;
            }
            case 'unknown': {
                if (this.nonStrict) {
                    this.queue.push({ type: 'symbol', content: node.content });
                } else {
                    throw new TypstWriterError(`Unknown macro: ${node.content}`, node);
                }
                break;
            }
            default:
                throw new TypstWriterError(`Unimplemented node type to append: ${node.type}`, node);
        }
    }

    private appendWithBracketsIfNeeded(node: TypstNode): boolean {
        const is_single = !['group', 'supsub', 'empty'].includes(node.type);
        if (is_single) {
            this.append(node);
        } else {
            this.queue.push({
                type: 'atom',
                content: '('
            });
            this.append(node);
            this.queue.push({
                type: 'atom',
                content: ')'
            });
        }
        return is_single;
    }

    protected flushQueue() {
        this.queue.forEach((node) => {
            let str = "";
            switch (node.type) {
                case 'atom':
                case 'symbol':
                    str = node.content;
                    break;
                case 'text':
                    str = `"${node.content}"`;
                    break;
                case 'softSpace':
                    this.needSpaceAfterSingleItemScript = true;
                    str = '';
                    break;
                case 'comment':
                    str = `//${node.content}`;
                    break;
                case 'newline':
                    str = '\n';
                    break;
                default:
                    throw new TypstWriterError(`Unexpected node type to stringify: ${node.type}`, node)
            }
            if (str !== '') {
                this.writeBuffer(str);
            }
        });
        this.queue = [];
    }

    public finalize(): string {
        this.flushQueue();
        const smartFloorPass = function (input: string): string {
            // Use regex to replace all "⌊ xxx ⌋" with "floor(xxx)"
            let res = input.replace(/⌊\s*(.*?)\s*⌋/g, "floor($1)");
            // Typst disallow "floor()" with empty argument, so add am empty string inside if it's empty.
            res = res.replace(/floor\(\)/g, 'floor("")');
            return res;
        };
        const smartCeilPass = function (input: string): string {
            // Use regex to replace all "⌈ xxx ⌉" with "ceil(xxx)"
            let res = input.replace(/⌈\s*(.*?)\s*⌉/g, "ceil($1)");
            // Typst disallow "ceil()" with empty argument, so add an empty string inside if it's empty.
            res = res.replace(/ceil\(\)/g, 'ceil("")');
            return res;
        }
        this.buffer = smartFloorPass(this.buffer);
        this.buffer = smartCeilPass(this.buffer);
        return this.buffer;
    }
}

export function convertTree(node: TexNode): TypstNode {
    switch (node.type) {
        case 'empty':
        case 'whitespace':
            return { type: 'empty', content: '' };
        case 'ordgroup':
            return {
                type: 'group',
                content: '',
                args: node.args!.map(convertTree),
            };
        case 'element':
        case 'symbol':
            return { type: 'symbol', content: convertToken(node.content) };
        case 'text':
            return { type: 'text', content: node.content };
        case 'comment':
            return { type: 'comment', content: node.content };
        case 'supsub': {
            let { base, sup, sub } = node.data as TexSupsubData;

            // Special logic for overbrace
            if (base && base.type === 'unaryFunc' && base.content === '\\overbrace' && sup) {
                return {
                    type: 'binaryFunc',
                    content: 'overbrace',
                    args: [convertTree(base.args![0]), convertTree(sup)],
                };
            } else if (base && base.type === 'unaryFunc' && base.content === '\\underbrace' && sub) {
                return {
                    type: 'binaryFunc',
                    content: 'underbrace',
                    args: [convertTree(base.args![0]), convertTree(sub)],
                };
            }

            const data: TypstSupsubData = {
                base: convertTree(base),
            };
            if (data.base.type === 'empty') {
                data.base = { type: 'text', content: '' };
            }

            if (sup) {
                data.sup = convertTree(sup);
            }

            if (sub) {
                data.sub = convertTree(sub);
            }

            return {
                type: 'supsub',
                content: '',
                data: data,
            };
        }
        case 'leftright': {
            const [left, body, right] = node.args!;
            // These pairs will be handled by Typst compiler by default. No need to add lr()
            const group: TypstNode = {
                type: 'group',
                content: '',
                args: node.args!.map(convertTree),
            };                
            if (["[]", "()", "\\{\\}", "\\lfloor\\rfloor", "\\lceil\\rceil"].includes(left.content + right.content)) {
                return group;
            }
            return {
                type: 'unaryFunc',
                content: 'lr',
                args: [group],
            };
        }
        case 'binaryFunc': {
            return {
                type: 'binaryFunc',
                content: convertToken(node.content),
                args: node.args!.map(convertTree),
            };
        }
        case 'unaryFunc': {
            const arg0 = convertTree(node.args![0]);
            // \sqrt{3}{x} -> root(3, x)
            if (node.content === '\\sqrt' && node.data) {
                const data = convertTree(node.data as TexSqrtData); // the number of times to take the root
                return {
                    type: 'binaryFunc',
                    content: 'root',
                    args: [data, arg0],
                };
            }
            // \mathbf{a} -> upright(mathbf(a))
            if (node.content === '\\mathbf') {
                const inner: TypstNode = {
                    type: 'unaryFunc',
                    content: 'bold',
                    args: [arg0],
                };
                return {
                    type: 'unaryFunc',
                    content: 'upright',
                    args: [inner],
                };
            }
            // \mathbb{R} -> RR
            if (node.content === '\\mathbb' && arg0.type === 'symbol' && /^[A-Z]$/.test(arg0.content)) {
                return {
                    type: 'symbol',
                    content: arg0.content + arg0.content,
                };
            }
            // \operatorname{opname} -> op("opname")
            if (node.content === '\\operatorname') {
                const body = node.args!;
                if (body.length !== 1 || body[0].type !== 'text') {
                    throw new TypstWriterError(`Expecting body of \\operatorname to be text but got`, node);
                }
                const text = body[0].content;

                if (TYPST_INTRINSIC_SYMBOLS.includes(text)) {
                    return {
                        type: 'symbol',
                        content: text,
                    };
                } else {
                    return {
                        type: 'unaryFunc',
                        content: 'op',
                        args: [{ type: 'text', content: text }],
                    };
                }
            }

            // generic case
            return {
                type: 'unaryFunc',
                content: convertToken(node.content),
                args: node.args!.map(convertTree),
            };
        }
        case 'newline':
            return { type: 'newline', content: '\n' };
        case 'beginend': {
            const matrix = node.data as TexNode[][];
            const data = matrix.map((row) => row.map(convertTree));

            if (node.content!.startsWith('align')) {
                // align, align*, alignat, alignat*, aligned, etc.
                return {
                    type: 'align',
                    content: '',
                    data: data,
                };
            } else {
                return {
                    type: 'matrix',
                    content: 'mat',
                    data: data,
                };
            }
        }
        case 'unknownMacro':
            return { type: 'unknown', content: convertToken(node.content) };
        case 'control':
            if (node.content === '\\\\') {
                return { type: 'symbol', content: '\\' };
            } else if (node.content === '\\,') {
                return { type: 'symbol', content: 'thin' };
            } else {
                throw new TypstWriterError(`Unknown control sequence: ${node.content}`, node);
            }
        default:
            throw new TypstWriterError(`Unimplemented node type: ${node.type}`, node);
    }
}


function convertToken(token: string): string {
    if (/^[a-zA-Z0-9]$/.test(token)) {
        return token;
    } else if (token === '\\\\') {
        return '\\';
    } else if (token == '/') {
        return '\\/';
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
            return symbol;
        }
    }
    return token;
}

