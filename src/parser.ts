import { TexNode, LatexParseNode, TexSupsubData } from "./types";

const UNARY_COMMANDS = [
    'sqrt',
    'text',

    'arccos',
    'arcsin',
    'arctan',
    'arg',
    'bar',
    'bold',
    'boldsymbol',
    'ddot',
    'det',
    'dim',
    'dot',
    'exp',
    'gcd',
    'hat',
    'ker',
    'mathbb',
    'mathbf',
    'mathcal',
    'mathscr',
    'mathsf',
    'mathtt',
    'mathrm',
    'max',
    'min',
    'mod',
    'operatorname',
    'overbrace',
    'overline',
    'pmb',
    'sup',
    'rm',
    'tilde',
    'underbrace',
    'underline',
    'vec',
    'widehat',
    'widetilde',
]

const BINARY_COMMANDS = [
    'frac',
    'tfrac',
    'binom',
    'dbinom',
    'dfrac',
    'tbinom',
]

const EMPTY_NODE = { 'type': 'empty', 'content': '' }

function assert(condition: boolean, message: string = ''): void {
    if (!condition) {
        throw new LatexParserError(message);
    }
}


function get_command_param_num(command: string): number {
    if (UNARY_COMMANDS.includes(command)) {
        return 1;
    } else if (BINARY_COMMANDS.includes(command)) {
        return 2;
    } else {
        return 0;
    }
}

function find_closing_curly_bracket(latex: string, start: number): number {
    assert(latex[start] === '{');
    let count = 1;
    let pos = start + 1;

    while (count > 0) {
        if (pos >= latex.length) {
            throw new LatexParserError('Unmatched curly brackets');
        }
        if(pos + 1 < latex.length && (['\\{', '\\}'].includes(latex.substring(pos, pos + 2)))) {
            pos += 2;
            continue;
        }
        if (latex[pos] === '{') {
            count += 1;
        } else if (latex[pos] === '}') {
            count -= 1;
        }
        pos += 1;
    }

    return pos - 1;
}

function find_closing_square_bracket(latex: string, start: number): number {
    assert(latex[start] === '[');
    let count = 1;
    let pos = start + 1;

    while (count > 0) {
        if (pos >= latex.length) {
            throw new LatexParserError('Unmatched square brackets');
        }
        if (latex[pos] === '[') {
            count += 1;
        } else if (latex[pos] === ']') {
            count -= 1;
        }
        pos += 1;
    }

    return pos - 1;
}


function isalpha(char: string): boolean {
    return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(char);
}

function isdigit(char: string): boolean {
    return '0123456789'.includes(char);
}



function find_command(latex: string, start: number, command_name: string): number {
    const len_slash_command = 1 + command_name.length;
    let pos = start;

    while (pos < latex.length) {
        pos = latex.indexOf('\\' + command_name, pos);
        if (pos === -1) {
            return -1;
        }
        if (pos + len_slash_command >= latex.length || !isalpha(latex[pos + len_slash_command])) {
            return pos;
        } else {
            pos += len_slash_command;
        }
    }

    return -1;
}

function find_closing_right_command(latex: string, start: number): number {
    let count = 1;
    let pos = start;

    while (count > 0) {
        if (pos >= latex.length) {
            return -1;
        }
        const left_idx = find_command(latex, pos, 'left');
        const right_idx = find_command(latex, pos, 'right');

        if (right_idx === -1) {
            return -1;
        }

        if (left_idx === -1 || left_idx > right_idx) {
            // a \right is ahead
            count -= 1;
            pos = right_idx + '\\right'.length;
        } else {
            // a \left is ahead
            count += 1;
            pos = left_idx + '\\left'.length;
        }
    }

    return pos - '\\right'.length;
}

function find_closing_end_command(latex: string, start: number): number {
    let count = 1;
    let pos = start;

    while (count > 0) {
        if (pos >= latex.length) {
            return -1;
        }
        const begin_idx = find_command(latex, pos, 'begin');
        const end_idx = find_command(latex, pos, 'end');

        if (end_idx === -1) {
            return -1;
        }

        if (begin_idx === -1 || begin_idx > end_idx) {
            // an \end is ahead
            count -= 1;
            pos = end_idx + '\\end'.length;
        } else {
            // a \begin is ahead
            count += 1;
            pos = begin_idx + '\\begin'.length;
        }
    }

    return pos - '\\end'.length;
}

function eat_whitespaces(latex: string, start: number): string {
    let pos = start;
    while (pos < latex.length && [' ', '\t', '\n'].includes(latex[pos])) {
        pos += 1;
    }
    return latex.substring(start, pos);
}

function eat_spaces(latex: string, start: number): string {
    let pos = start;
    while (pos < latex.length && latex[pos] === ' ') {
        pos += 1;
    }
    return latex.substring(start, pos);
}

function eat_command_name(latex: string, start: number): string {
    let pos = start;
    while (pos < latex.length && isalpha(latex[pos])) {
        pos += 1;
    }
    return latex.substring(start, pos);
}

function eat_parenthesis(latex: string, start: number): string | null {
    if ('()[]|'.includes(latex[start])) {
        return latex[start];
    } else if (start + 1 < latex.length && ['\\{', '\\}'].includes(latex.substring(start, start + 2))) {
        return latex.substring(start, start + 2);
    } else if (start + 6 < latex.length && ['\\lfloor', '\\rfloor'].includes(latex.substring(start, start + 7))) {
        return latex.substring(start, start + 7);
    } else if (start + 5 < latex.length && ['\\lceil', '\\rceil'].includes(latex.substring(start, start + 6))) {
        return latex.substring(start, start + 6);
    } else if (start + 6 < latex.length && ['\\langle', '\\rangle'].includes(latex.substring(start, start + 7))) {
        return latex.substring(start, start + 7);
    } else {
        return null;
    }
}

function eat_primes(latex: string, start: number): number {
    let pos = start;
    while (pos < latex.length && latex[pos] === "'") {
        pos += 1;
    }
    return pos - start;
}


class LatexParserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'LatexParserError';
    }
}


type ParseResult = [LatexParseNode, number];

export class LatexParser {
    space_sensitive: boolean;
    newline_sensitive: boolean;

    constructor(space_sensitive: boolean = false, newline_sensitive: boolean = true) {
        this.space_sensitive = space_sensitive;
        this.newline_sensitive = newline_sensitive;
    }

    parse(latex: string): LatexParseNode {
        const results: LatexParseNode[] = [];
        let pos = 0;

        while (pos < latex.length) {
            const [res, newPos] = this.parseNextExpr(latex, pos);
            pos = newPos;
            if (!this.space_sensitive && res.type === 'whitespace') {
                continue;
            }
            if (!this.newline_sensitive && res.type === 'newline') {
                continue;
            }
            if (res.type === 'control' && res.content === '&') {
                throw new LatexParserError('Unexpected & outside of an alignment');
            }
            results.push(res);
        }

        if (results.length === 0) {
            return EMPTY_NODE;
        } else if (results.length === 1) {
            return results[0];
        } else {
            return { type: 'ordgroup', args: results };
        }
    }

    parseNextExpr(latex: string, start: number): ParseResult {
        let [base, pos] = this.parseNextExprWithoutSupSub(latex, start);
        let sub: LatexParseNode | null = null;
        let sup: LatexParseNode | null = null;
        let num_prime = 0;

        num_prime += eat_primes(latex, pos);
        pos += num_prime;
        if (pos < latex.length && latex[pos] === '_') {
            [sub, pos] = this.parseNextExprWithoutSupSub(latex, pos + 1);
            num_prime += eat_primes(latex, pos);
            pos += num_prime;
            if (pos < latex.length && latex[pos] === '^') {
                [sup, pos] = this.parseNextExprWithoutSupSub(latex, pos + 1);
                if (eat_primes(latex, pos) > 0) {
                    throw new LatexParserError('Double superscript');
                }
            }
        } else if (pos < latex.length && latex[pos] === '^') {
            [sup, pos] = this.parseNextExprWithoutSupSub(latex, pos + 1);
            if (eat_primes(latex, pos) > 0) {
                throw new LatexParserError('Double superscript');
            }
            if (pos < latex.length && latex[pos] === '_') {
                [sub, pos] = this.parseNextExprWithoutSupSub(latex, pos + 1);
                if (eat_primes(latex, pos) > 0) {
                    throw new LatexParserError('Double superscript');
                }
            }
        }

        if (sub !== null || sup !== null || num_prime > 0) {
            const res = { type: 'supsub', base } as LatexParseNode;
            if (sub) {
                res.sub = sub;
            }
            if (num_prime > 0) {
                res.sup = { type: 'ordgroup', args:  [] };
                for (let i = 0; i < num_prime; i++) {
                    res.sup.args!.push({ type: 'command', content: 'prime' });
                }
                if (sup) {
                    res.sup.args!.push(sup);
                }
                if (res.sup.args!.length === 1) {
                    res.sup = res.sup.args![0];
                }
            } else if (sup) {
                res.sup = sup;
            }
            return [res, pos];
        } else {
            return [base, pos];
        }
    }

    parseNextExprWithoutSupSub(latex: string, start: number): ParseResult {
        const firstChar = latex[start];
        if (firstChar === '{') {
            const posClosingBracket = find_closing_curly_bracket(latex, start);
            const exprInside = latex.slice(start + 1, posClosingBracket);
            return [this.parse(exprInside), posClosingBracket + 1];
        } else if (firstChar === '\\') {
            if (start + 1 >= latex.length) {
                throw new LatexParserError('Expecting command name after \\');
            }
            const firstTwoChars = latex.slice(start, start + 2);
            if (firstTwoChars === '\\\\') {
                return [{ type: 'control', content: '\\\\' }, start + 2];
            } else if (firstTwoChars === '\\{' || firstTwoChars === '\\}') {
                return [{ type: 'token-parenthesis', content: firstTwoChars }, start + 2];
            } else if (['\\%', '\\$', '\\&', '\\#', '\\_'].includes(firstTwoChars)) {
                return [{ type: 'token', content: firstTwoChars }, start + 2];
            } else if (latex.slice(start).startsWith('\\begin{')) {
                return this.parseBeginEndExpr(latex, start);
            } else if (latex.slice(start).startsWith('\\left') && (start + 5 >= latex.length || !isalpha(latex[start + 5]))) {
                return this.parseLeftRightExpr(latex, start);
            } else {
                return this.parseCommandExpr(latex, start);
            }
        } else if (firstChar === '%') {
            let pos = start + 1;
            while (pos < latex.length && latex[pos] !== '\n') {
                pos += 1;
            }
            return [{ type: 'comment', content: latex.slice(start + 1, pos) }, pos];
        } else if (isdigit(firstChar)) {
            let pos = start;
            while (pos < latex.length && isdigit(latex[pos])) {
                pos += 1;
            }
            return [{ type: 'token-number', content: latex.slice(start, pos) }, pos];
        } else if (isalpha(firstChar)) {
            return [{ type: 'token-letter-var', content: firstChar }, start + 1];
        } else if ('+-*/=<>!'.includes(firstChar)) {
            return [{ type: 'token-operator', content: firstChar }, start + 1];
        } else if ('.,;?'.includes(firstChar)) {
            return [{ type: 'atom', content: firstChar }, start + 1];
        } else if ('()[]'.includes(firstChar)) {
            return [{ type: 'token-parenthesis', content: firstChar }, start + 1];
        } else if (firstChar === '_') {
            let [sub, pos] = this.parseNextExpr(latex, start + 1);
            let sup: LatexParseNode | undefined = undefined;
            if (pos < latex.length && latex[pos] === '^') {
                [sup, pos] = this.parseNextExpr(latex, pos + 1);
            }
            return [{ type: 'supsub', base: EMPTY_NODE, sub, sup }, pos];
        } else if (firstChar === '^') {
            let [sup, pos] = this.parseNextExpr(latex, start + 1);
            let sub: LatexParseNode | undefined = undefined;
            if (pos < latex.length && latex[pos] === '_') {
                [sub, pos] = this.parseNextExpr(latex, pos + 1);
            }
            return [{ type: 'supsub', base: EMPTY_NODE, sub, sup }, pos];
        } else if (firstChar === ' ') {
            let pos = start;
            while (pos < latex.length && latex[pos] === ' ') {
                pos += 1;
            }
            return [{ type: 'whitespace', content: latex.slice(start, pos) }, pos];
        } else if (firstChar === '\n') {
            return [{ type: 'newline', content: '\n' }, start + 1];
        } else if (firstChar === '\r') {
            if (start + 1 < latex.length && latex[start + 1] === '\n') {
                return [{ type: 'newline', content: '\n' }, start + 2];
            } else {
                return [{ type: 'newline', content: '\n' }, start + 1];
            }
        } else if (firstChar === '&') {
            return [{ type: 'control', content: '&' }, start + 1];
        } else {
            return [{ type: 'unknown', content: firstChar }, start + 1];
        }
    }

    parseCommandExpr(latex: string, start: number): ParseResult {
        assert(latex[start] === '\\');
        let pos = start + 1;
        const command = eat_command_name(latex, pos);
        pos += command.length;
        const paramNum = get_command_param_num(command);
        if (paramNum === 0) {
            return [{ type: 'command', content: command }, pos];
        } else if (paramNum === 1) {
            if (command === 'sqrt' && pos < latex.length && latex[pos] === '[') {
                const posLeftSquareBracket = pos;
                const posRightSquareBracket = find_closing_square_bracket(latex, pos);
                const exprInside = latex.slice(posLeftSquareBracket + 1, posRightSquareBracket);
                const exponent = this.parse(exprInside);
                const [arg1, newPos] = this.parseNextExprWithoutSupSub(latex, posRightSquareBracket + 1);
                return [{ type: 'command', content: command, arg1, exponent }, newPos];
            } else if (command === 'text') {
                assert(latex[pos] === '{');
                const posClosingBracket = find_closing_curly_bracket(latex, pos);
                const text = latex.slice(pos + 1, posClosingBracket);
                return [{ type: 'text', content: text }, posClosingBracket + 1];
            } else {
                let [arg1, newPos] = this.parseNextExprWithoutSupSub(latex, pos);
                return [{ type: 'command', content: command, arg1 }, newPos];
            }
        } else if (paramNum === 2) {
            const [arg1, pos1] = this.parseNextExprWithoutSupSub(latex, pos);
            const [arg2, pos2] = this.parseNextExprWithoutSupSub(latex, pos1);
            return [{ type: 'command', content: command, arg1, arg2 }, pos2];
        } else {
            throw new Error( 'Invalid number of parameters');
        }
    }

    parseLeftRightExpr(latex: string, start: number): ParseResult {
        assert(latex.slice(start, start + 5) === '\\left');
        let pos = start + '\\left'.length;
        pos += eat_whitespaces(latex, pos).length;
        if (pos >= latex.length) {
            throw new LatexParserError('Expecting delimiter after \\left');
        }
        const leftDelimiter = eat_parenthesis(latex, pos);
        if (leftDelimiter === null) {
            throw new LatexParserError('Invalid delimiter after \\left');
        }
        pos += leftDelimiter.length;
        const exprInsideStart = pos;
        const idx = find_closing_right_command(latex, pos);
        if (idx === -1) {
            throw new LatexParserError('No matching \\right');
        }
        const exprInsideEnd = idx;
        pos = idx + '\\right'.length;
        pos += eat_whitespaces(latex, pos).length;
        if (pos >= latex.length) {
            throw new LatexParserError('Expecting delimiter after \\right');
        }
        const rightDelimiter = eat_parenthesis(latex, pos);
        if (rightDelimiter === null) {
            throw new LatexParserError('Invalid delimiter after \\right');
        }
        pos += rightDelimiter.length;
        const exprInside = latex.slice(exprInsideStart, exprInsideEnd);
        const body = this.parse(exprInside);
        const res = { type: 'leftright', left: leftDelimiter, right: rightDelimiter, body };
        return [res, pos];
    }


    parseBeginEndExpr(latex: string, start: number): ParseResult {
        assert(latex.slice(start, start + 7) === '\\begin{');
        let pos = start + '\\begin'.length;
        const idx = find_closing_curly_bracket(latex, pos);
        if (idx === -1) {
            throw new LatexParserError('No matching } after \\begin{');
        }
        const envName = latex.slice(pos + 1, idx);
        pos = idx + 1;
        pos += eat_whitespaces(latex, pos).length; // ignore whitespaces and '\n' after \begin{envName}
        const exprInsideStart = pos;
        const endIdx = find_closing_end_command(latex, pos);
        if (endIdx === -1) {
            throw new LatexParserError('No matching \\end');
        }
        const exprInsideEnd = endIdx;
        pos = endIdx + '\\end'.length;
        const closingIdx = find_closing_curly_bracket(latex, pos);
        if (closingIdx === -1) {
            throw new LatexParserError('No matching } after \\end{');
        }
        if (latex.slice(pos + 1, closingIdx) !== envName) {
            throw new LatexParserError('Mismatched \\begin and \\end environments');
        }
        let exprInside = latex.slice(exprInsideStart, exprInsideEnd);
        exprInside = exprInside.trimEnd(); // ignore whitespaces and '\n' before \end{envName}
        const body = this.parseAligned(exprInside);
        const res = { type: 'beginend', content: envName, body };
        return [res, closingIdx + 1];
    }

    parseAligned(latex: string): LatexParseNode[][] {
        let pos = 0;
        const allRows: LatexParseNode[][] = [];
        let row: LatexParseNode[] = [];
        allRows.push(row);
        let group: LatexParseNode = { type: 'ordgroup', args: [] };
        row.push(group);

        while (pos < latex.length) {
            const [res, newPos] = this.parseNextExpr(latex, pos);
            pos = newPos;
            if (res.type === 'whitespace') {
                continue;
            } else if (res.type === 'newline' && !this.newline_sensitive) {
                continue;
            } else if (res.type === 'control' && res.content === '\\\\') {
                row = [];
                group = { type: 'ordgroup', args: [] };
                row.push(group);
                allRows.push(row);
            } else if (res.type === 'control' && res.content === '&') {
                group = { type: 'ordgroup', args: [] };
                row.push(group);
            } else {
                group.args!.push(res);
            }
        }

        return allRows;
    }
}

// Split tex into a list of tex strings and comments.
// Each item in the returned list is either a tex snippet or a comment.
// Each comment item is a string starting with '%'.
function splitTex(tex: string): string[] {
    const lines = tex.split("\n");
    const out_tex_list: string[] = [];
    let current_tex = "";
    // let inside_begin_depth = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // if (line.includes('\\begin{')) {
            // inside_begin_depth += line.split('\\begin{').length - 1;
        // }

        let index = -1;
        while (index + 1 < line.length) {
            index = line.indexOf('%', index + 1);
            if (index === -1) {
                // No comment in this line
                break;
            }
            if (index === 0 || line[index - 1] !== '\\') {
                // Found a comment
                break;
            }
        }
        if (index !== -1) {
            current_tex += line.substring(0, index);
            const comment = line.substring(index);
            out_tex_list.push(current_tex);
            current_tex = "";
            out_tex_list.push(comment);
        } else {
            current_tex += line;
        }
        if (i < lines.length - 1) {
            const has_begin_command = line.includes('\\begin{');
            const followed_by_end_command = lines[i + 1].includes('\\end{');
            if(!has_begin_command && !followed_by_end_command) {
                current_tex += '\n';
            }
        }

        // if (line.includes('\\end{')) {
            // inside_begin_depth -= line.split('\\end{').length - 1;
        // }
    }

    if (current_tex.length > 0) {
        out_tex_list.push(current_tex);
    }

    return out_tex_list;
}

export class LatexNodeToTexNodeError extends Error {
    node: LatexParseNode;

    constructor(message: string, node: LatexParseNode) {
        super(message);
        this.name = "LatexNodeToTexNodeError";
        this.node = node;
    }
}

function latexNodeToTexNode(node: LatexParseNode): TexNode {
    try {
        let res = {} as TexNode;
        switch (node.type) {
            case 'ordgroup':
                res.type = 'ordgroup';
                res.args = (node.args as LatexParseNode[]).map((n: LatexParseNode) => latexNodeToTexNode(n));
                if (res.args!.length === 1) {
                    res = res.args![0] as TexNode;
                }
                break;
            case 'empty':
                res.type = 'empty';
                res.content = '';
                break;
            case 'atom':
                res.type = 'atom';
                res.content = node.content!;
                break;
            case 'token':
            case 'token-letter-var':
            case 'token-number':
            case 'token-operator':
            case 'token-parenthesis':
                res.type = 'symbol';
                res.content = node.content!;
                break;
            case 'supsub':
                res.type = 'supsub';
                res.irregularData = {} as TexSupsubData;
                if (node['base']) {
                    res.irregularData.base = latexNodeToTexNode(node['base']);
                }
                if (node['sup']) {
                    res.irregularData.sup = latexNodeToTexNode(node['sup']);
                }
                if (node['sub']) {
                    res.irregularData.sub = latexNodeToTexNode(node['sub']);
                }
                break;
            case 'leftright':
                res.type = 'leftright';
                
                const body = latexNodeToTexNode(node.body as LatexParseNode);

                let left: string = node['left']!;
                if (left === "\\{") {
                    left = "{";
                }
                let right: string = node['right']!;
                if (right === "\\}") {
                    right = "}";
                }
                const is_atom = (str:string) => (['(', ')', '[', ']', '{', '}'].includes(str));
                res.args = [
                    { type: is_atom(left)? 'atom': 'symbol', content: left },
                    body,
                    { type: is_atom(right)? 'atom': 'symbol', content: right}
                ];
                break;
            case 'beginend':
                if (node.content?.startsWith('align')) {
                    // align, align*, alignat, alignat*, aligned, etc.
                    res.type = 'align';
                } else {
                    res.type = 'matrix';
                }
                res.content = node.content!;
                res.irregularData = (node.body as LatexParseNode[][]).map((row: LatexParseNode[]) => {
                    return row.map((n: LatexParseNode) => latexNodeToTexNode(n));
                });
                break;
            case 'command':
                const num_args = get_command_param_num(node.content!);
                res.content = '\\' + node.content!;
                if (num_args === 0) {
                    res.type = 'symbol';
                } else if (num_args === 1) {
                    res.type = 'unaryFunc';
                    res.args = [
                        latexNodeToTexNode(node.arg1 as LatexParseNode)
                    ]
                    if (node.content === 'sqrt') {
                        if (node.exponent) {
                            res.irregularData = latexNodeToTexNode(node.exponent) as TexNode;
                        }
                    }
                } else if (num_args === 2) {
                    res.type = 'binaryFunc';
                    res.args = [
                        latexNodeToTexNode(node.arg1 as LatexParseNode),
                        latexNodeToTexNode(node.arg2 as LatexParseNode)
                    ]
                } else {
                    throw new LatexNodeToTexNodeError('Invalid number of arguments', node);
                }
                break;
            case 'text': 
                res.type = 'text';
                res.content = node.content!;
                break;
            case 'comment':
                res.type = 'comment';
                res.content = node.content!;
                break;
            case 'whitespace':
                res.type = 'empty';
                break;
            case 'newline':
                res.type = 'newline';
                res.content = '\n';
                break;
            case 'control':
                if (node.content === '\\\\') {
                    res.type = 'symbol';
                    res.content = node.content!;
                    break;
                } else {
                    throw new LatexNodeToTexNodeError(`Unknown control sequence: ${node.content}`, node);
                }
                break;
            default:
                throw new LatexNodeToTexNodeError(`Unknown node type: ${node.type}`, node);
        }
        return res as TexNode;
    } catch (e) {
        throw e;
    }
}

export function parseTex(tex: string, customTexMacros: {[key: string]: string}): TexNode {
    const parser = new LatexParser();
    for (const [macro, replacement] of Object.entries(customTexMacros)) {
        tex = tex.replaceAll(macro, replacement);
    }
    const node = parser.parse(tex);
    return latexNodeToTexNode(node);
}
