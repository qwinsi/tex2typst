import { symbolMap } from "./map";
import { TexNode, TexSqrtData, TexSupsubData, TypstNode } from "./types";


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
    node: TexNode;

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

    public append(node: TexNode) {
        if (node.type === 'empty') {
            return;
        } else if (node.type === 'ordgroup') {
            // const index = this.startBlock();
            node.args!.forEach((arg) => this.append(arg));
            // this.endBlock(index);
        } else if (node.type === 'atom') {
            let content = node.content!;
            if (node.content === ',' && this.insideFunctionDepth > 0) {
                content = 'comma';
            }
            this.queue.push({ type: 'atom', content: content });
        } else if (node.type === 'symbol') {
            this.queue.push({ type: 'symbol', content: node.content });
        } else if (node.type === 'text') {
            this.queue.push(node as TypstNode)
        } else if (node.type === 'supsub') {
            let { base, sup, sub } = node.irregularData as TexSupsubData;

            // Special logic for overbrace
            if (base && base.type === 'unaryFunc' && base.content === '\\overbrace' && sup) {
                this.append({ type: 'binaryFunc', content: '\\overbrace', args: [base.args![0], sup] });
                return;
            } else if (base && base.type === 'unaryFunc' && base.content === '\\underbrace' && sub) {
                this.append({ type: 'binaryFunc', content: '\\underbrace', args: [base.args![0], sub] });
                return;

            }

            if (!base) {
                this.queue.push({ type: 'text', content: '' });
            } else {
                this.appendWithBracketsIfNeeded(base);
            }


            let trailing_space_needed = false;
            const has_prime = (sup && sup.type === 'symbol' && sup.content === '\\prime');
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
        } else if (node.type === 'leftright') {
            const [left, body, right] = node.args!;
            // These pairs will be handled by Typst compiler by default. No need to add lr()
            if (["[]", "()", "{}"].includes(left.content + right.content)) {
                this.append(left);
                this.append(body);
                this.append(right);
                return;
            }
            const func_symbol: TypstNode = { type: 'symbol', content: 'lr' };
            this.queue.push(func_symbol);
            this.insideFunctionDepth ++;
            this.queue.push({ type: 'atom', content: '('});
            this.append(left);
            this.append(body);
            this.append(right);
            this.queue.push({ type: 'atom', content: ')'});
            this.insideFunctionDepth --;
        } else if (node.type === 'binaryFunc') {
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
        } else if (node.type === 'unaryFunc') {
            const func_symbol: TypstNode = { type: 'symbol', content: node.content };
            const arg0 = node.args![0];
            if (node.content === '\\sqrt' && node.irregularData) {
                func_symbol.content = 'root';
                this.queue.push(func_symbol);
                this.insideFunctionDepth ++;
                this.queue.push({ type: 'atom', content: '('});
                this.append(node.irregularData as TexSqrtData); // the number of times to take the root
                this.queue.push({ type: 'atom', content: ','});
                this.append(arg0);
                this.queue.push({ type: 'atom', content: ')'});
                this.insideFunctionDepth --;
                return;
            } else if (node.content === '\\mathbb') {
                const body = node.args![0];
                if (body.type === 'symbol' && /^[A-Z]$/.test(body.content)) {
                    // \mathbb{R} -> RR
                    this.queue.push({ type: 'symbol', content: body.content + body.content});
                    return;
                }
                // Fall through
            } else if (node.content === '\\operatorname') {
                let body = node.args!;
                if (body.length === 1 && body[0].type == 'ordgroup') {
                    body = body[0].args!;
                }
                const text = body.reduce((buff, n) => {
                    // Hope convertToken() will not throw an error
                    // If it does, the input is bad.
                    buff += convertToken(n.content);
                    return buff;
                }, "" as string);

                if (this.preferTypstIntrinsic && TYPST_INTRINSIC_SYMBOLS.includes(text)) {
                    // e.g. we prefer just sech over op("sech")
                    this.queue.push({ type: 'symbol', content: text});
                } else if (text.startsWith('SyMb01-')) {
                    // special hacks made in parseTex()
                    this.queue.push({ type: 'symbol', content: '\\' + text.substring(7)});
                } else {
                    this.queue.push({ type: 'symbol', content: 'op' });
                    this.queue.push({ type: 'atom', content: '('});
                    this.queue.push({ type: 'text', content: text});
                    this.queue.push({ type: 'atom', content: ')'});
                }

                return;
            }
            this.queue.push(func_symbol);
            this.insideFunctionDepth ++;
            this.queue.push({ type: 'atom', content: '('});
            this.append(arg0);
            this.queue.push({ type: 'atom', content: ')'});
            this.insideFunctionDepth --;
        } else if (node.type === 'align') {
            const matrix = node.irregularData as TexNode[][];
            matrix.forEach((row, i) => {
                row.forEach((cell, j) => {
                    if (j > 0) {
                        this.queue.push({ type: 'atom', content: '&' });
                    }
                    this.append(cell);
                });
                if (i < matrix.length - 1) {
                    this.queue.push({ type: 'symbol', content: '\\\\' });
                }
            });
        } else if (node.type === 'matrix') {
            const matrix = node.irregularData as TexNode[][];
            this.queue.push({ type: 'symbol', content: 'mat' });
            this.insideFunctionDepth ++; 
            this.queue.push({ type: 'atom', content: '('});
            this.queue.push({type: 'symbol', content: 'delim: #none, '});
            matrix.forEach((row, i) => {
                row.forEach((cell, j) => {
                    // There is a leading & in row
                    if (cell.type === 'ordgroup' && cell.args!.length === 0) {
                        return;
                    }
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
        } else if (node.type === 'unknownMacro') {
            if (this.nonStrict) {
                this.queue.push({ type: 'symbol', content: node.content });
            } else {
                throw new TypstWriterError(`Unknown macro: ${node.content}`, node);
            }
        } else {
            throw new TypstWriterError(`Unimplemented node type to append: ${node.type}`, node);
        }
    }

    protected flushQueue() {
        this.queue.forEach((node) => {
            let str = "";
            switch (node.type) {
                case 'atom':
                    str = node.content;
                    break;
                case 'symbol':
                    str = convertToken(node.content);
                    break;
                case 'text':
                    str = `"${node.content}"`;
                    break;
                case 'softSpace':
                    this.needSpaceAfterSingleItemScript = true;
                    str = '';
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

    private appendWithBracketsIfNeeded(node: TexNode): boolean {
        const is_single_atom = (node.type === 'atom');
        const is_single_function = (node.type === 'unaryFunc' || node.type === 'binaryFunc' || node.type === 'leftright');     

        const is_single = ['atom', 'symbol', 'unaryFunc', 'binaryFunc', 'leftright'].includes(node.type);
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


function convertToken(token: string): string {
    if (/^[a-zA-Z0-9]$/.test(token)) {
        return token;
    } else if (token === '\\\\') {
        return '\\\n';
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

