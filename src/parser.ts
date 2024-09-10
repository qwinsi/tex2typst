import { symbolMap } from "./map";
import { TexNode, TexSupsubData, Token, TokenType } from "./types";


const UNARY_COMMANDS = [
    'sqrt',
    'text',

    'bar',
    'bold',
    'boldsymbol',
    'ddot',
    'dot',
    'hat',
    'mathbb',
    'mathbf',
    'mathcal',
    'mathfrak',
    'mathit',
    'mathrm',
    'mathscr',
    'mathsf',
    'mathtt',
    'operatorname',
    'overbrace',
    'overline',
    'pmb',
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

const EMPTY_NODE: TexNode = { type: 'empty', content: '' };

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

const LEFT_CURLY_BRACKET: Token = {type: TokenType.CONTROL, value: '{'};
const RIGHT_CURLY_BRACKET: Token = {type: TokenType.CONTROL, value: '}'};

function find_closing_curly_bracket(tokens: Token[], start: number): number {
    assert(token_eq(tokens[start], LEFT_CURLY_BRACKET));
    let count = 1;
    let pos = start + 1;

    while (count > 0) {
        if (pos >= tokens.length) {
            throw new LatexParserError('Unmatched curly brackets');
        }
        if (token_eq(tokens[pos], LEFT_CURLY_BRACKET)) {
            count += 1;
        } else if (token_eq(tokens[pos], RIGHT_CURLY_BRACKET)) {
            count -= 1;
        }
        pos += 1;
    }

    return pos - 1;
}

const LEFT_SQUARE_BRACKET: Token = {type: TokenType.ELEMENT, value: '['};
const RIGHT_SQUARE_BRACKET: Token = {type: TokenType.ELEMENT, value: ']'};

function find_closing_square_bracket(tokens: Token[], start: number): number {
    assert(token_eq(tokens[start], LEFT_SQUARE_BRACKET));
    let count = 1;
    let pos = start + 1;

    while (count > 0) {
        if (pos >= tokens.length) {
            throw new LatexParserError('Unmatched square brackets');
        }
        if (token_eq(tokens[pos], LEFT_SQUARE_BRACKET)) {
            count += 1;
        } else if (token_eq(tokens[pos], RIGHT_SQUARE_BRACKET)) {
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

function eat_whitespaces(tokens: Token[], start: number): Token[] {
    let pos = start;
    while (pos < tokens.length && [TokenType.WHITESPACE, TokenType.NEWLINE].includes(tokens[pos].type)) {
        pos++;
    }
    return tokens.slice(start, pos);
}


function eat_parenthesis(tokens: Token[], start: number): Token | null {
    const firstToken = tokens[start];
    if (firstToken.type === TokenType.ELEMENT && ['(', ')', '[', ']', '|', '\\{', '\\}'].includes(firstToken.value)) {
        return firstToken;
    } else if (firstToken.type === TokenType.COMMAND && ['lfloor', 'rfloor', 'lceil', 'rceil', 'langle', 'rangle'].includes(firstToken.value.slice(1))) {
        return firstToken;
    } else {
        return null;
    }
}

function eat_primes(tokens: Token[], start: number): number {
    let pos = start;
    while (pos < tokens.length && token_eq(tokens[pos], { type: TokenType.ELEMENT, value: "'" })) {
        pos += 1;
    }
    return pos - start;
}


function eat_command_name(latex: string, start: number): string {
    let pos = start;
    while (pos < latex.length && isalpha(latex[pos])) {
        pos += 1;
    }
    return latex.substring(start, pos);
}




const LEFT_COMMAND: Token = { type: TokenType.COMMAND, value: '\\left' };
const RIGHT_COMMAND: Token = { type: TokenType.COMMAND, value: '\\right' };

function find_closing_right_command(tokens: Token[], start: number): number {
    let count = 1;
    let pos = start;

    while (count > 0) {
        if (pos >= tokens.length) {
            return -1;
        }
        if (token_eq(tokens[pos], LEFT_COMMAND)) {
            count += 1;
        } else if (token_eq(tokens[pos], RIGHT_COMMAND)) {
            count -= 1;
        }
        pos += 1;
    }

    return pos - 1;
}


const BEGIN_COMMAND: Token = { type: TokenType.COMMAND, value: '\\begin' };
const END_COMMAND: Token = { type: TokenType.COMMAND, value: '\\end' };


function find_closing_end_command(tokens: Token[], start: number): number {
    let count = 1;
    let pos = start;

    while (count > 0) {
        if (pos >= tokens.length) {
            return -1;
        }
        if (token_eq(tokens[pos], BEGIN_COMMAND)) {
            count += 1;
        } else if (token_eq(tokens[pos], END_COMMAND)) {
            count -= 1;
        }
        pos += 1;
    }

    return pos - 1;
}

function find_closing_curly_bracket_char(latex: string, start: number): number {
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


export function tokenize(latex: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;

    while (pos < latex.length) {
        const firstChar = latex[pos];
        let token: Token;
        switch (firstChar) {
            case '%': {
                let newPos = pos + 1;
                while (newPos < latex.length && latex[newPos] !== '\n') {
                    newPos += 1;
                }
                token = { type: TokenType.COMMENT, value: latex.slice(pos + 1, newPos) };
                pos = newPos;
                break;
            }
            case '{':
            case '}':
            case '_':
            case '^':
            case '&':
                token = { type: TokenType.CONTROL, value: firstChar};
                pos++;
                break;
            case '\n':
                token = { type: TokenType.NEWLINE, value: firstChar};
                pos++;
                break;
            case '\r': {
                if (pos + 1 < latex.length && latex[pos + 1] === '\n') {
                    token = { type: TokenType.NEWLINE, value: '\n' };
                    pos += 2;
                } else {
                    token = { type: TokenType.NEWLINE, value: '\n' };
                    pos ++;
                }
                break;
            }
            case ' ': {
                let newPos = pos;
                while (newPos < latex.length && latex[newPos] === ' ') {
                    newPos += 1;
                }
                token = {type: TokenType.WHITESPACE, value: latex.slice(pos, newPos)};
                pos = newPos;
                break;
            }
            case '\\': {
                if (pos + 1 >= latex.length) {
                    throw new LatexParserError('Expecting command name after \\');
                }
                const firstTwoChars = latex.slice(pos, pos + 2);
                if (['\\\\', '\\,'].includes(firstTwoChars)) {
                    token = { type: TokenType.CONTROL, value: firstTwoChars };
                } else if (['\\{','\\}', '\\%', '\\$', '\\&', '\\#', '\\_'].includes(firstTwoChars)) {
                    token = { type: TokenType.ELEMENT, value: firstTwoChars };
                } else {
                    const command = eat_command_name(latex, pos + 1);
                    token = { type: TokenType.COMMAND, value: '\\' + command};
                }
                pos += token.value.length;
                break;
            }
            default: {
                if (isdigit(firstChar)) {
                    let newPos = pos;
                    while (newPos < latex.length && isdigit(latex[newPos])) {
                        newPos += 1;
                    }
                    token = { type: TokenType.ELEMENT, value: latex.slice(pos, newPos) }
                } else if (isalpha(firstChar)) {
                    token = { type: TokenType.ELEMENT, value: firstChar };
                } else if ('+-*/=\'<>!.,;?()[]|'.includes(firstChar)) {
                    token = { type: TokenType.ELEMENT, value: firstChar }
                } else {
                    token = { type: TokenType.UNKNOWN, value: firstChar };
                }
                pos += token.value.length;
            }
        }

        tokens.push(token);

        if (token.type === TokenType.COMMAND && ['\\text', '\\operatorname', '\\begin', '\\end'].includes(token.value)) {
            if (pos >= latex.length || latex[pos] !== '{') {
                throw new LatexParserError(`No content for ${token.value} command`);
            }
            tokens.push({ type: TokenType.CONTROL, value: '{' });
            const posClosingBracket = find_closing_curly_bracket_char(latex, pos);
            pos++;
            let textInside = latex.slice(pos, posClosingBracket);
            // replace all escape characters with their actual characters
            const chars = ['{', '}', '\\', '$', '&', '#', '_', '%'];
            for (const char of chars) {
                textInside = textInside.replaceAll('\\' + char, char);
            }
            tokens.push({ type: TokenType.TEXT, value: textInside });
            tokens.push({ type: TokenType.CONTROL, value: '}' });
            pos = posClosingBracket + 1;
        }
    }
    return tokens;
}

function token_eq(token1: Token, token2: Token) {
    return token1.type == token2.type && token1.value == token2.value;
}


export class LatexParserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'LatexParserError';
    }
}


type ParseResult = [TexNode, number];

const SUB_SYMBOL:Token = { type: TokenType.CONTROL, value: '_' };
const SUP_SYMBOL:Token = { type: TokenType.CONTROL, value: '^' };

export class LatexParser {
    space_sensitive: boolean;
    newline_sensitive: boolean;

    constructor(space_sensitive: boolean = false, newline_sensitive: boolean = true) {
        this.space_sensitive = space_sensitive;
        this.newline_sensitive = newline_sensitive;
    }

    parse(tokens: Token[]): TexNode {
        const results: TexNode[] = [];
        let pos = 0;
        while (pos < tokens.length) {
            const results: TexNode[] = [];
            let pos = 0;
    
            while (pos < tokens.length) {
                const [res, newPos] = this.parseNextExpr(tokens, pos);
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
                return { type: 'ordgroup', content: '', args: results };
            }
        }


        if (results.length === 0) {
            return EMPTY_NODE;
        } else if (results.length === 1) {
            return results[0];
        } else {
            return { type: 'ordgroup', content: '', args: results };
        }
    }

    parseNextExpr(tokens: Token[], start: number): ParseResult {
        let [base, pos] = this.parseNextExprWithoutSupSub(tokens, start);
        let sub: TexNode | null = null;
        let sup: TexNode | null = null;
        let num_prime = 0;

        num_prime += eat_primes(tokens, pos);
        pos += num_prime;
        if (pos < tokens.length && token_eq(tokens[pos], SUB_SYMBOL)) {
            [sub, pos] = this.parseNextExprWithoutSupSub(tokens, pos + 1);
            num_prime += eat_primes(tokens, pos);
            pos += num_prime;
            if (pos < tokens.length && token_eq(tokens[pos], SUP_SYMBOL)) {
                [sup, pos] = this.parseNextExprWithoutSupSub(tokens, pos + 1);
                if (eat_primes(tokens, pos) > 0) {
                    throw new LatexParserError('Double superscript');
                }
            }
        } else if (pos < tokens.length && token_eq(tokens[pos], SUP_SYMBOL)) {
            [sup, pos] = this.parseNextExprWithoutSupSub(tokens, pos + 1);
            if (eat_primes(tokens, pos) > 0) {
                throw new LatexParserError('Double superscript');
            }
            if (pos < tokens.length && token_eq(tokens[pos], SUB_SYMBOL)) {
                [sub, pos] = this.parseNextExprWithoutSupSub(tokens, pos + 1);
                if (eat_primes(tokens, pos) > 0) {
                    throw new LatexParserError('Double superscript');
                }
            }
        }

        if (sub !== null || sup !== null || num_prime > 0) {
            const res: TexSupsubData = { base };
            if (sub) {
                res.sub = sub;
            }
            if (num_prime > 0) {
                res.sup = { type: 'ordgroup', content: '', args:  [] };
                for (let i = 0; i < num_prime; i++) {
                    res.sup.args!.push({ type: 'element', content: "'" });
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
            return [{type: 'supsub',  content: '', data: res }, pos];
        } else {
            return [base, pos];
        }
    }

    parseNextExprWithoutSupSub(tokens: Token[], start: number): ParseResult {
        const firstToken = tokens[start];
        const tokenType = firstToken.type;
        switch (tokenType) {
            case TokenType.ELEMENT:
                return [{ type: 'element', content: firstToken.value }, start + 1];
            case TokenType.TEXT:
                return [{ type: 'text', content: firstToken.value }, start + 1];
            case TokenType.COMMENT:
                return [{ type: 'comment', content: firstToken.value }, start + 1];
            case TokenType.WHITESPACE:
                return [{ type: 'whitespace', content: firstToken.value }, start + 1];
            case TokenType.NEWLINE:
                return [{ type: 'newline', content: firstToken.value }, start + 1];
            case TokenType.COMMAND:
                if (token_eq(firstToken, BEGIN_COMMAND)) {
                    return this.parseBeginEndExpr(tokens, start);
                } else if (token_eq(firstToken, LEFT_COMMAND)) {
                    return this.parseLeftRightExpr(tokens, start);
                } else {
                    return this.parseCommandExpr(tokens, start);
                }
            case TokenType.CONTROL:
                const controlChar = firstToken.value;
                switch (controlChar) {
                    case '{':
                        const posClosingBracket = find_closing_curly_bracket(tokens, start);
                        const exprInside = tokens.slice(start + 1, posClosingBracket);
                        return [this.parse(exprInside), posClosingBracket + 1];
                    case '}':
                        throw new LatexParserError("Unmatched '}'");
                    case '\\\\':
                        return [{ type: 'control', content: '\\\\' }, start + 1];
                    case '\\,':
                        return [{ type: 'control', content: '\\,' }, start + 1];
                    case '_': {
                        return [ EMPTY_NODE, start];
                    }
                    case '^': {
                        return [ EMPTY_NODE, start];
                    }
                    case '&':
                        return [{ type: 'control', content: '&' }, start + 1];
                    default:
                        throw new LatexParserError('Unknown control sequence');
                }
            default:
                throw new LatexParserError('Unknown token type');
        }
    }

    parseCommandExpr(tokens: Token[], start: number): ParseResult {
        assert(tokens[start].type === TokenType.COMMAND);

        const command = tokens[start].value; // command name starts with a \

        let pos = start + 1;

        if (['left', 'right', 'begin', 'end'].includes(command.slice(1))) {
            throw new LatexParserError('Unexpected command: ' + command);
        } 


        const paramNum = get_command_param_num(command.slice(1));
        switch (paramNum) {
            case 0:
                if (!symbolMap.has(command.slice(1))) {
                    return [{ type: 'unknownMacro', content: command }, pos];
                }
                return [{ type: 'symbol', content: command }, pos];
            case 1: {
                if (command === '\\sqrt' && pos < tokens.length && token_eq(tokens[pos], LEFT_SQUARE_BRACKET)) {
                    const posLeftSquareBracket = pos;
                    const posRightSquareBracket = find_closing_square_bracket(tokens, pos);
                    const exprInside = tokens.slice(posLeftSquareBracket + 1, posRightSquareBracket);
                    const exponent = this.parse(exprInside);
                    const [arg1, newPos] = this.parseNextExprWithoutSupSub(tokens, posRightSquareBracket + 1);
                    return [{ type: 'unaryFunc', content: command, args: [arg1], data: exponent }, newPos];
                } else if (command === '\\text') {
                    if (pos + 2 >= tokens.length) {
                        throw new LatexParserError('Expecting content for \\text command');
                    }
                    assert(token_eq(tokens[pos], LEFT_CURLY_BRACKET));
                    assert(tokens[pos + 1].type === TokenType.TEXT);
                    assert(token_eq(tokens[pos + 2], RIGHT_CURLY_BRACKET));
                    const text = tokens[pos + 1].value;
                    return [{ type: 'text', content: text }, pos + 3];
                }
                let [arg1, newPos] = this.parseNextExprWithoutSupSub(tokens, pos);
                return [{ type: 'unaryFunc', content: command, args: [arg1] }, newPos];
            }
            case 2: {
                const [arg1, pos1] = this.parseNextExprWithoutSupSub(tokens, pos);
                const [arg2, pos2] = this.parseNextExprWithoutSupSub(tokens, pos1);
                return [{ type: 'binaryFunc', content: command, args: [arg1, arg2] }, pos2];
            }
            default:
                throw new Error( 'Invalid number of parameters');
        }
    }

    parseLeftRightExpr(tokens: Token[], start: number): ParseResult {
        assert(token_eq(tokens[start], LEFT_COMMAND));

        let pos = start + 1;
        pos += eat_whitespaces(tokens, pos).length;

        if (pos >= tokens.length) {
            throw new LatexParserError('Expecting delimiter after \\left');
        }

        const leftDelimiter = eat_parenthesis(tokens, pos);
        if (leftDelimiter === null) {
            throw new LatexParserError('Invalid delimiter after \\left');
        }
        pos++;
        const exprInsideStart = pos;
        const idx = find_closing_right_command(tokens, pos);
        if (idx === -1) {
            throw new LatexParserError('No matching \\right');
        }
        const exprInsideEnd = idx;
        pos = idx + 1;

        pos += eat_whitespaces(tokens, pos).length;
        if (pos >= tokens.length) {
            throw new LatexParserError('Expecting \\right after \\left');
        }
        
        const rightDelimiter = eat_parenthesis(tokens, pos);
        if (rightDelimiter === null) {
            throw new LatexParserError('Invalid delimiter after \\right');
        }
        pos++;

        const exprInside = tokens.slice(exprInsideStart, exprInsideEnd);
        const body = this.parse(exprInside);
        const args: TexNode[] = [
            { type: 'element', content: leftDelimiter.value },
            body,
            { type: 'element', content: rightDelimiter.value }
        ]
        const res: TexNode = { type: 'leftright', content: '', args: args };
        return [res, pos];
    }

    parseBeginEndExpr(tokens: Token[], start: number): ParseResult {
        assert(token_eq(tokens[start], BEGIN_COMMAND));

        let pos = start + 1;
        assert(token_eq(tokens[pos], LEFT_CURLY_BRACKET));
        assert(tokens[pos + 1].type === TokenType.TEXT);
        assert(token_eq(tokens[pos + 2], RIGHT_CURLY_BRACKET));
        const envName = tokens[pos + 1].value;
        pos += 3;
        
        pos += eat_whitespaces(tokens, pos).length; // ignore whitespaces and '\n' after \begin{envName}
        
        const exprInsideStart = pos;

        const endIdx = find_closing_end_command(tokens, pos);
        if (endIdx === -1) {
            throw new LatexParserError('No matching \\end');
        }
        const exprInsideEnd = endIdx;
        pos = endIdx + 1;
        
        assert(token_eq(tokens[pos], LEFT_CURLY_BRACKET));
        assert(tokens[pos + 1].type === TokenType.TEXT);
        assert(token_eq(tokens[pos + 2], RIGHT_CURLY_BRACKET));
        if (tokens[pos + 1].value !== envName) {
            throw new LatexParserError('Mismatched \\begin and \\end environments');
        }
        pos += 3;
    
        const exprInside = tokens.slice(exprInsideStart, exprInsideEnd);
        // ignore whitespaces and '\n' before \end{envName}
        while(exprInside.length > 0 && [TokenType.WHITESPACE, TokenType.NEWLINE].includes(exprInside[exprInside.length - 1].type)) {
            exprInside.pop();
        }
        const body = this.parseAligned(exprInside);
        const res: TexNode = { type: 'beginend', content: envName, data: body };
        return [res, pos];
    }

    parseAligned(tokens: Token[]): TexNode[][] {
        let pos = 0;
        const allRows: TexNode[][] = [];
        let row: TexNode[] = [];
        allRows.push(row);
        let group: TexNode = { type: 'ordgroup', content: '', args: [] };
        row.push(group);

        while (pos < tokens.length) {
            const [res, newPos] = this.parseNextExpr(tokens, pos);
            pos = newPos;
            if (res.type === 'whitespace') {
                continue;
            } else if (res.type === 'newline' && !this.newline_sensitive) {
                continue;
            } else if (res.type === 'control' && res.content === '\\\\') {
                row = [];
                group = { type: 'ordgroup', content: '', args: [] };
                row.push(group);
                allRows.push(row);
            } else if (res.type === 'control' && res.content === '&') {
                group = { type: 'ordgroup', content: '', args: [] };
                row.push(group);
            } else {
                group.args!.push(res);
            }
        }
        return allRows;
    }
}

// Remove all whitespace before or after _ or ^
function passIgnoreWhitespaceBeforeScriptMark(tokens: Token[]): Token[] {
    const is_script_mark = (token: Token) => token_eq(token, SUB_SYMBOL) || token_eq(token, SUP_SYMBOL);
    let out_tokens: Token[] = [];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === TokenType.WHITESPACE && i + 1 < tokens.length && is_script_mark(tokens[i + 1])) {
            continue;
        }
        if (tokens[i].type === TokenType.WHITESPACE && i - 1 >= 0 && is_script_mark(tokens[i - 1])) {
            continue;
        }
        out_tokens.push(tokens[i]);
    }
    return out_tokens;
}

// expand custom tex macros
function passExpandCustomTexMacros(tokens: Token[], customTexMacros: {[key: string]: string}): Token[] {
    let out_tokens: Token[] = [];
    for (const token of tokens) {
        if (token.type === TokenType.COMMAND && customTexMacros[token.value]) {
            const expanded_tokens = tokenize(customTexMacros[token.value]);
            out_tokens = out_tokens.concat(expanded_tokens);
        } else {
            out_tokens.push(token);
        }
    }
    return out_tokens;
}

export function parseTex(tex: string, customTexMacros: {[key: string]: string}): TexNode {
    const parser = new LatexParser();
    let tokens = tokenize(tex);
    tokens = passIgnoreWhitespaceBeforeScriptMark(tokens);
    tokens = passExpandCustomTexMacros(tokens, customTexMacros);
    return parser.parse(tokens);
}
