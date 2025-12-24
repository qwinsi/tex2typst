import { TexBeginEnd, TexFuncCall, TexLeftRight, TexNode, TexGroup, TexSupSub, TexSupsubData, TexText, TexToken, TexTokenType } from "./tex-types";
import { assert } from "./utils";
import { array_join, array_split } from "./generic";
import { TEX_BINARY_COMMANDS, TEX_UNARY_COMMANDS, tokenize_tex } from "./tex-tokenizer";

const IGNORED_COMMANDS = [
    'bigl', 'bigr', 'bigm',
    'biggl', 'biggr', 'biggm',
    'Bigl', 'Bigr', 'Bigm',
    'Biggl', 'Biggr', 'Biggm'
];

const EMPTY_NODE: TexNode = TexToken.EMPTY.toNode();

function get_command_param_num(command: string): number {
    if (TEX_UNARY_COMMANDS.includes(command)) {
        return 1;
    } else if (TEX_BINARY_COMMANDS.includes(command)) {
        return 2;
    } else {
        return 0;
    }
}

const LEFT_CURLY_BRACKET: TexToken = new TexToken(TexTokenType.CONTROL, '{');
const RIGHT_CURLY_BRACKET: TexToken = new TexToken(TexTokenType.CONTROL, '}');


const LEFT_SQUARE_BRACKET: TexToken = new TexToken(TexTokenType.ELEMENT, '[');
const RIGHT_SQUARE_BRACKET: TexToken = new TexToken(TexTokenType.ELEMENT, ']');

function eat_whitespaces(tokens: TexToken[], start: number): TexToken[] {
    let pos = start;
    while (pos < tokens.length && [TexTokenType.SPACE, TexTokenType.NEWLINE].includes(tokens[pos].type)) {
        pos++;
    }
    return tokens.slice(start, pos);
}


function eat_parenthesis(tokens: TexToken[], start: number): TexToken | null {
    const firstToken = tokens[start];
    if (firstToken.type === TexTokenType.ELEMENT && ['(', ')', '[', ']', '|', '\\{', '\\}', '.', '\\|'].includes(firstToken.value)) {
        return firstToken;
    } else if (firstToken.type === TexTokenType.COMMAND && ['lfloor', 'rfloor', 'lceil', 'rceil', 'langle', 'rangle', 'lparen', 'rparen', 'lbrace', 'rbrace', 'vert', 'Vert', 'lvert', 'rvert', 'lVert', 'rVert'].includes(firstToken.value.slice(1))) {
        return firstToken;
    } else {
        return null;
    }
}

function eat_primes(tokens: TexToken[], start: number): number {
    let pos = start;
    while (pos < tokens.length && tokens[pos].eq(new TexToken(TexTokenType.ELEMENT, "'"))) {
        pos += 1;
    }
    return pos - start;
}



const LEFT_COMMAND: TexToken = new TexToken(TexTokenType.COMMAND, '\\left');
const RIGHT_COMMAND: TexToken = new TexToken(TexTokenType.COMMAND, '\\right');

const BEGIN_COMMAND: TexToken = new TexToken(TexTokenType.COMMAND, '\\begin');
const END_COMMAND: TexToken = new TexToken(TexTokenType.COMMAND, '\\end');

const CONTROL_LINEBREAK = new TexToken(TexTokenType.CONTROL, '\\\\');

export class LatexParserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'LatexParserError';
    }

    static readonly UNMATCHED_LEFT_BRACE = new LatexParserError("Unmatched '\\{'");
    static readonly UNMATCHED_RIGHT_BRACE = new LatexParserError("Unmatched '\\}'");
    static readonly UNMATCHED_LEFT_BRACKET = new LatexParserError("Unmatched '\\['");
    static readonly UNMATCHED_RIGHT_BRACKET = new LatexParserError("Unmatched '\\]'");
    static readonly UNMATCHED_COMMAND_BEGIN = new LatexParserError("Unmatched '\\begin'");
    static readonly UNMATCHED_COMMAND_END = new LatexParserError("Unmatched '\\end'");
    static readonly UNMATCHED_COMMAND_LEFT = new LatexParserError("Unmatched '\\left'");
    static readonly UNMATCHED_COMMAND_RIGHT = new LatexParserError("Unmatched '\\right'");
}


type ParseResult = [TexNode, number];

const SUB_SYMBOL:TexToken = new TexToken(TexTokenType.CONTROL, '_');
const SUP_SYMBOL:TexToken = new TexToken(TexTokenType.CONTROL, '^');

export class LatexParser {
    public space_sensitive: boolean;
    public newline_sensitive: boolean;

    // how many levels of \begin{...} \end{...} are we currently in
    public alignmentDepth: number = 0;


    constructor(space_sensitive: boolean = false, newline_sensitive: boolean = true) {
        this.space_sensitive = space_sensitive;
        this.newline_sensitive = newline_sensitive;
    }

    parse(tokens: TexToken[]): TexNode {
        return this.parseGroup(tokens.slice(0));
    }

    parseGroup(tokens: TexToken[]): TexNode {
        const [tree, _] = this.parseClosure(tokens, 0, null);
        return tree;
    }

    // return pos: (position of closingToken) + 1
    // pos will be -1 if closingToken is not found
    parseClosure(tokens: TexToken[], start: number, closingToken: TexToken | null): ParseResult {
        const results: TexNode[] = [];
        let pos = start;
        while (pos < tokens.length) {
            if (closingToken !== null && tokens[pos].eq(closingToken)) {
                break;
            }

            const [res, newPos] = this.parseNextExpr(tokens, pos);
            pos = newPos;
            if(res.head.type === TexTokenType.SPACE || res.head.type === TexTokenType.NEWLINE) {
                if (!this.space_sensitive && res.head.value.replace(/ /g, '').length === 0) {
                    continue;
                }
                if (!this.newline_sensitive && res.head.value === '\n') {
                    continue;
                }
            }
            results.push(res);
        }
        if (pos >= tokens.length && closingToken !== null) {
            return [EMPTY_NODE, -1];
        }

        const styledResults = this.applyStyleCommands(results);

        let node: TexNode;
        if (styledResults.length === 1) {
            node = styledResults[0];
        } else {
            node = new TexGroup(styledResults);
        }
        return [node, pos + 1];
    }

    parseNextExpr(tokens: TexToken[], start: number): ParseResult {
        let [base, pos] = this.parseNextExprWithoutSupSub(tokens, start);
        let sub: TexNode | null = null;
        let sup: TexNode | null = null;
        let num_prime = 0;

        num_prime += eat_primes(tokens, pos);
        pos += num_prime;
        if (pos < tokens.length) {
            const next_token = tokens[pos];
            if (next_token.eq(SUB_SYMBOL)) {
                [sub, pos] = this.parseNextExprWithoutSupSub(tokens, pos + 1);
                const new_primes = eat_primes(tokens, pos);
                num_prime += new_primes;
                pos += new_primes;
                if (pos < tokens.length && tokens[pos].eq(SUP_SYMBOL)) {
                    [sup, pos] = this.parseNextExprWithoutSupSub(tokens, pos + 1);
                    if (eat_primes(tokens, pos) > 0) {
                        throw new LatexParserError('Double superscript');
                    }
                }
            } else if (next_token.eq(SUP_SYMBOL)) {
                [sup, pos] = this.parseNextExprWithoutSupSub(tokens, pos + 1);
                if (eat_primes(tokens, pos) > 0) {
                    throw new LatexParserError('Double superscript');
                }
                if (pos < tokens.length && tokens[pos].eq(SUB_SYMBOL)) {
                    [sub, pos] = this.parseNextExprWithoutSupSub(tokens, pos + 1);
                    if (eat_primes(tokens, pos) > 0) {
                        throw new LatexParserError('Double superscript');
                    }
                }
            }
        }

        if (sub !== null || sup !== null || num_prime > 0) {
            const res: TexSupsubData = { base, sup: null, sub: null };
            if (sub) {
                res.sub = sub;
            }
            if (num_prime > 0) {
                const items: TexNode[] = [];
                for (let i = 0; i < num_prime; i++) {
                    items.push(new TexToken(TexTokenType.ELEMENT, "'").toNode());
                }
                if (sup) {
                    items.push(sup);
                }
                res.sup = items.length === 1 ? items[0] : new TexGroup(items);
            } else if (sup) {
                res.sup = sup;
            }
            return [new TexSupSub(res), pos];
        } else {
            return [base, pos];
        }
    }

    parseNextExprWithoutSupSub(tokens: TexToken[], start: number): ParseResult {
        if (start >= tokens.length) {
            throw new LatexParserError("Unexpected end of input");
        }
        const firstToken = tokens[start];
        switch (firstToken.type) {
            case TexTokenType.ELEMENT:
            case TexTokenType.LITERAL:
            case TexTokenType.COMMENT:
            case TexTokenType.SPACE:
            case TexTokenType.NEWLINE:
                return [firstToken.toNode(), start + 1];
            case TexTokenType.COMMAND:
                const commandName = firstToken.value.slice(1);
                if (IGNORED_COMMANDS.includes(commandName)) {
                    return this.parseNextExprWithoutSupSub(tokens, start + 1);
                }
                if (firstToken.eq(BEGIN_COMMAND)) {
                    return this.parseBeginEndExpr(tokens, start);
                } else if(firstToken.eq(END_COMMAND)) {
                    throw LatexParserError.UNMATCHED_COMMAND_END;
                } else if (firstToken.eq(LEFT_COMMAND)) {
                    return this.parseLeftRightExpr(tokens, start);
                } else if (firstToken.eq(RIGHT_COMMAND)) {
                    throw LatexParserError.UNMATCHED_COMMAND_RIGHT;
                } else {
                    return this.parseCommandExpr(tokens, start);
                }
            case TexTokenType.CONTROL:
                const controlChar = firstToken.value;
                switch (controlChar) {
                    case '{':
                        const [group, newPos] = this.parseClosure(tokens, start + 1, RIGHT_CURLY_BRACKET);
                        if (newPos === -1) {
                            throw LatexParserError.UNMATCHED_LEFT_BRACE;
                        }
                        return [group, newPos];
                    case '}':
                        throw LatexParserError.UNMATCHED_RIGHT_BRACE;
                    case '\\\\':
                    case '\\!':
                    case '\\,':
                    case '\\:':
                    case '\\;':
                    case '\\>':
                        return [firstToken.toNode(), start + 1];
                    case '\\ ':
                    case '~':
                        return [firstToken.toNode(), start + 1];
                    case '_':
                    case '^':
                        // e.g. "_1" or "^2" are valid LaTeX math expressions
                        return [ EMPTY_NODE, start];
                    case '&':
                        if (this.alignmentDepth <= 0) {
                            throw new LatexParserError('Unexpected & outside of an alignment');
                        }
                        return [firstToken.toNode(), start + 1];
                    default:
                        throw new LatexParserError('Unknown control sequence');
                }
            default:
                throw new LatexParserError('Unknown token type');
        }
    }

    parseCommandExpr(tokens: TexToken[], start: number): ParseResult {
        assert(tokens[start].type === TexTokenType.COMMAND);

        const command_token = tokens[start];
        const command = command_token.value; // command name starts with a \

        let pos = start + 1;

        const paramNum = get_command_param_num(command.slice(1));
        switch (paramNum) {
            case 0:
                return [command_token.toNode(), pos];
            case 1: {
                // TODO: JavaScript gives undefined instead of throwing an error when accessing an index out of bounds,
                // so index checking like this should be everywhere. This is rough.
                if(pos >= tokens.length) {
                    throw new LatexParserError('Expecting argument for ' + command);
                }
                if (command === '\\sqrt' && pos < tokens.length && tokens[pos].eq(LEFT_SQUARE_BRACKET)) {
                    const [exponent, newPos1] = this.parseClosure(tokens, pos + 1, RIGHT_SQUARE_BRACKET);
                    if (newPos1 === -1) {
                        throw LatexParserError.UNMATCHED_LEFT_BRACKET;
                    }
                    const [arg1, newPos2] = this.parseNextArg(tokens, newPos1);
                    return [new TexFuncCall(command_token, [arg1], exponent), newPos2];
                } else if (command === '\\text') {
                    if (pos + 2 >= tokens.length) {
                        throw new LatexParserError('Expecting content for \\text command');
                    }
                    assert(tokens[pos].eq(LEFT_CURLY_BRACKET));
                    assert(tokens[pos + 1].type === TexTokenType.LITERAL);
                    assert(tokens[pos + 2].eq(RIGHT_CURLY_BRACKET));
                    const literal = tokens[pos + 1];
                    return [new TexText(literal), pos + 3];
                } else if (command === '\\displaylines') {
                    assert(tokens[pos].eq(LEFT_CURLY_BRACKET));
                    const [matrix, newPos] = this.parseAligned(tokens, pos + 1, RIGHT_CURLY_BRACKET);
                    if (newPos === -1) {
                        throw LatexParserError.UNMATCHED_LEFT_BRACE;
                    }
                    const group = new TexGroup(array_join(matrix, CONTROL_LINEBREAK.toNode()));
                    return [new TexFuncCall(command_token, [group]), newPos];
                }
                let [arg1, newPos] = this.parseNextArg(tokens, pos);
                return [new TexFuncCall(command_token, [arg1]), newPos];
            }
            case 2: {
                const [arg1, pos1] = this.parseNextArg(tokens, pos);
                const [arg2, pos2] = this.parseNextArg(tokens, pos1);
                return [new TexFuncCall(command_token, [arg1, arg2]), pos2];
            }
            default:
                throw new Error('Invalid number of parameters');
        }
    }

    /*
    Extract a non-space argument from the token stream.
    So that `\frac{12} 3` is parsed as
        TypstFuncCall{ head: '\frac', args: [ELEMENT_12, ELEMENT_3] }
        rather than
        TypstFuncCall{ head: '\frac', args: [ELEMENT_12, SPACE] }, ELEMENT_3
    */
    parseNextArg(tokens: TexToken[], start: number): ParseResult {
        let pos = start;
        let arg: TexNode | null = null;
        while (pos < tokens.length) {
            let node: TexNode;
            [node, pos] = this.parseNextExprWithoutSupSub(tokens, pos);
            if (!(node.head.type === TexTokenType.SPACE || node.head.type === TexTokenType.NEWLINE)) {
                arg = node;
                break;
            }
        }
        if (arg === null) {
            throw new LatexParserError('Expecting argument but token stream ended');
        }
        return [arg, pos];
    }

    parseLeftRightExpr(tokens: TexToken[], start: number): ParseResult {
        assert(tokens[start].eq(LEFT_COMMAND));

        let pos = start + 1;
        pos += eat_whitespaces(tokens, pos).length;

        if (pos >= tokens.length) {
            throw new LatexParserError('Expecting a delimiter after \\left');
        }

        const leftDelimiter = eat_parenthesis(tokens, pos);
        if (leftDelimiter === null) {
            throw new LatexParserError('Invalid delimiter after \\left');
        }
        pos++;

        const [body, idx] = this.parseClosure(tokens, pos, RIGHT_COMMAND);
        if (idx === -1) {
            throw LatexParserError.UNMATCHED_COMMAND_LEFT;
        }
        pos = idx;

        pos += eat_whitespaces(tokens, pos).length;
        if (pos >= tokens.length) {
            throw new LatexParserError('Expecting a delimiter after \\right');
        }

        const rightDelimiter = eat_parenthesis(tokens, pos);
        if (rightDelimiter === null) {
            throw new LatexParserError('Invalid delimiter after \\right');
        }
        pos++;

        const left = leftDelimiter.value === '.'? null: leftDelimiter;
        const right = rightDelimiter.value === '.'? null: rightDelimiter;
        const res = new TexLeftRight({body: body, left: left, right: right});
        return [res, pos];
    }

    parseBeginEndExpr(tokens: TexToken[], start: number): ParseResult {
        assert(tokens[start].eq(BEGIN_COMMAND));

        let pos = start + 1;
        assert(tokens[pos].eq(LEFT_CURLY_BRACKET));
        assert(tokens[pos + 1].type === TexTokenType.LITERAL);
        assert(tokens[pos + 2].eq(RIGHT_CURLY_BRACKET));
        const envName = tokens[pos + 1].value;
        pos += 3;


        let data: TexNode | null = null;
        if(['array', 'subarray'].includes(envName)) {
            pos += eat_whitespaces(tokens, pos).length;
            [data, pos] = this.parseNextArg(tokens, pos);
        }

        const [body, endIdx] = this.parseAligned(tokens, pos, END_COMMAND);
        if (endIdx === -1) {
            throw LatexParserError.UNMATCHED_COMMAND_BEGIN;
        }

        pos = endIdx;

        assert(tokens[pos].eq(LEFT_CURLY_BRACKET));
        assert(tokens[pos + 1].type === TexTokenType.LITERAL);
        assert(tokens[pos + 2].eq(RIGHT_CURLY_BRACKET));
        if (tokens[pos + 1].value !== envName) {
            throw new LatexParserError('\\begin and \\end environments mismatch');
        }
        pos += 3;

        const res = new TexBeginEnd(new TexToken(TexTokenType.LITERAL, envName), body, data);
        return [res, pos];
    }

    // return pos: (position of closingToken) + 1
    // pos will be -1 if closingToken is not found
    parseAligned(tokens: TexToken[], start: number, closingToken: TexToken): [TexNode[][], number] {
        this.alignmentDepth++;

        let pos = start;
        // ignore whitespaces and '\n' after \begin{envName}
        pos += eat_whitespaces(tokens, pos).length;

        let closure: TexNode;
        [closure, pos] = this.parseClosure(tokens, pos, closingToken);

        if (pos === -1) {
            return [[], -1];
        }

        let allRows: TexNode[][];
        if (closure.type === 'ordgroup') {
            const elements = (closure as TexGroup).items;
            // ignore spaces and '\n' before \end{envName}
            while(elements.length > 0 && [TexTokenType.SPACE, TexTokenType.NEWLINE].includes(elements[elements.length - 1].head.type)) {
                elements.pop();
            }
            allRows = array_split(elements, new TexToken(TexTokenType.CONTROL, '\\\\').toNode())
                      .map(row => {
                          return array_split(row, new TexToken(TexTokenType.CONTROL, '&').toNode())
                                   .map(arr => new TexGroup(arr));
                      });
        } else {
            allRows = [[closure]];
        }

        this.alignmentDepth--;
        return [allRows, pos];
    }

    private applyStyleCommands(nodes: TexNode[]): TexNode[] {
        for (let i = 0; i < nodes.length; i++) {
            const styleToken = this.getStyleToken(nodes[i]);
            if (styleToken) {
                const before = this.applyStyleCommands(nodes.slice(0, i));
                const after = this.applyStyleCommands(nodes.slice(i + 1));
                let body: TexNode;
                if (after.length === 0) {
                    body = EMPTY_NODE;
                } else if (after.length === 1) {
                    body = after[0];
                } else {
                    body = new TexGroup(after);
                }
                const funcCall = new TexFuncCall(styleToken, [body]);
                return before.concat(funcCall);
            }
        }
        return nodes;
    }

    private getStyleToken(node: TexNode): TexToken | null {
        if (node.type === 'terminal') {
            if (node.head.eq(TexToken.COMMAND_DISPLAYSTYLE) || node.head.eq(TexToken.COMMAND_TEXTSTYLE)) {
                return node.head;
            }
        }
        return null;
    }
}

// Remove all whitespace before or after _ or ^
function passIgnoreWhitespaceBeforeScriptMark(tokens: TexToken[]): TexToken[] {
    const is_script_mark = (token: TexToken) => token.eq(SUB_SYMBOL) || token.eq(SUP_SYMBOL);
    let out_tokens: TexToken[] = [];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === TexTokenType.SPACE && i + 1 < tokens.length && is_script_mark(tokens[i + 1])) {
            continue;
        }
        if (tokens[i].type === TexTokenType.SPACE && i - 1 >= 0 && is_script_mark(tokens[i - 1])) {
            continue;
        }
        out_tokens.push(tokens[i]);
    }
    return out_tokens;
}

// expand custom tex macros
function passExpandCustomTexMacros(tokens: TexToken[], customTexMacros: {[key: string]: string}): TexToken[] {
    let out_tokens: TexToken[] = [];
    for (const token of tokens) {
        if (token.type === TexTokenType.COMMAND && customTexMacros[token.value]) {
            const expanded_tokens = tokenize_tex(customTexMacros[token.value]);
            out_tokens = out_tokens.concat(expanded_tokens);
        } else {
            out_tokens.push(token);
        }
    }
    return out_tokens;
}

export function parseTex(tex: string, customTexMacros: {[key: string]: string} = {}): TexNode {
    const parser = new LatexParser();
    let tokens = tokenize_tex(tex);
    tokens = passIgnoreWhitespaceBeforeScriptMark(tokens);
    tokens = passExpandCustomTexMacros(tokens, customTexMacros);
    return parser.parse(tokens);
}
