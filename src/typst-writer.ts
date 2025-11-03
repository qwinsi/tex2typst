import { TexNode } from "./tex-types";
import { TypstNode, TypstWriterOptions } from "./typst-types";
import { TypstToken } from "./typst-types";
import { TypstTokenType } from "./typst-types";


const TYPST_LEFT_PARENTHESIS: TypstToken = new TypstToken(TypstTokenType.ELEMENT, '(');
const TYPST_RIGHT_PARENTHESIS: TypstToken = new TypstToken(TypstTokenType.ELEMENT, ')');
const TYPST_COMMA: TypstToken = new TypstToken(TypstTokenType.ELEMENT, ',');
const TYPST_NEWLINE: TypstToken = new TypstToken(TypstTokenType.SYMBOL, '\n');

const SOFT_SPACE = new TypstToken(TypstTokenType.CONTROL, ' ');

export class TypstWriterError extends Error {
    node: TexNode | TypstNode | TypstToken;

    constructor(message: string, node: TexNode | TypstNode | TypstToken) {
        super(message);
        this.name = "TypstWriterError";
        this.node = node;
    }
}



export class TypstWriter {
    protected buffer: string = "";
    protected queue: TypstToken[] = [];

    private options: TypstWriterOptions;

    constructor(options: TypstWriterOptions) {
        this.options = options;
    }


    private writeBuffer(previousToken: TypstToken | null, token: TypstToken) {
        const str = token.toString();

        if (str === '') {
            return;
        }

        let no_need_space = false;
        // putting the first token in clause
        no_need_space ||= /[\(\[\|]$/.test(this.buffer) && /^\w/.test(str);
        // closing a clause
        no_need_space ||= /^[})\]\|]$/.test(str);
        // putting the opening '(' for a function
        no_need_space ||= /[^=]$/.test(this.buffer) && str === '(';
        // putting punctuation
        no_need_space ||= /^[_^,;!]$/.test(str);
        // putting a prime
        no_need_space ||= str === "'";
        // leading sign. e.g. produce "+1" instead of " +1"
        no_need_space ||= /[\(\[{]\s*(-|\+)$/.test(this.buffer) || this.buffer === "-" || this.buffer === "+";
        // new line
        no_need_space ||= str.startsWith('\n');
        // buffer is empty
        no_need_space ||= this.buffer === "";
        // don't put space multiple times
        no_need_space ||= (/\s$/.test(this.buffer) || /^\s/.test(str));
        // "&=" instead of "& ="
        no_need_space ||= this.buffer.endsWith('&') && str === '=';
        // before or after a slash e.g. "a/b" instead of "a / b"
        no_need_space ||= this.buffer.endsWith('/') || str === '/';
        // "[$x + y$]" instead of "[ $ x + y $ ]"
        no_need_space ||= token.type === TypstTokenType.LITERAL;
        // other cases
        no_need_space ||= /[\s_^{\(]$/.test(this.buffer);
        if (previousToken !== null) {
            no_need_space ||= previousToken.type === TypstTokenType.LITERAL;
        }
        if (!no_need_space) {
            this.buffer += ' ';
        }

        this.buffer += str;
    }

    // Serialize a tree of TypstNode into a list of TypstToken
    public serialize(abstractNode: TypstNode) {
        const env = {insideFunctionDepth: 0};
        this.queue.push(...abstractNode.serialize(env, this.options));
    }


    protected flushQueue() {
        // merge consecutive soft spaces
        let qu: TypstToken[] = [];
        for(const token of this.queue) {
            if (token.eq(SOFT_SPACE) && qu.length > 0 && qu[qu.length - 1].eq(SOFT_SPACE)) {
                continue;
            }
            qu.push(token);
        }

        // delete soft spaces if they are not needed
        const dummy_token = new TypstToken(TypstTokenType.SYMBOL, '');
        for(let i = 0; i < qu.length; i++) {
            let token = qu[i];
            if (token.eq(SOFT_SPACE)) {
                const to_delete = (i === 0)
                                || (i === qu.length - 1)
                                || (qu[i - 1].type === TypstTokenType.SPACE)
                                || qu[i - 1].isOneOf([TYPST_LEFT_PARENTHESIS, TYPST_NEWLINE])
                                || qu[i + 1].isOneOf([TYPST_RIGHT_PARENTHESIS, TYPST_COMMA, TYPST_NEWLINE]);
                if (to_delete) {
                    qu[i] = dummy_token;
                }
            }
        }

        qu = qu.filter((token) => !token.eq(dummy_token));

        for(let i = 0; i < qu.length; i++) {
            let token = qu[i];
            let previous_token = i === 0 ? null : qu[i - 1];
            this.writeBuffer(previous_token, token);
        }

        this.queue = [];
    }

    public finalize(): string {
        this.flushQueue();
        const smartFloorPass = function (input: string): string {
            // Use regex to replace all "floor.l xxx floor.r" with "floor(xxx)"
            let res = input.replace(/floor\.l\s*(.*?)\s*floor\.r/g, "floor($1)");
            // Typst disallow "floor()" with empty argument, so add am empty string inside if it's empty.
            res = res.replace(/floor\(\)/g, 'floor("")');
            return res;
        };
        const smartCeilPass = function (input: string): string {
            // Use regex to replace all "ceil.l xxx ceil.r" with "ceil(xxx)"
            let res = input.replace(/ceil\.l\s*(.*?)\s*ceil\.r/g, "ceil($1)");
            // Typst disallow "ceil()" with empty argument, so add an empty string inside if it's empty.
            res = res.replace(/ceil\(\)/g, 'ceil("")');
            return res;
        }
        const smartRoundPass = function (input: string): string {
            // Use regex to replace all "floor.l xxx ceil.r" with "round(xxx)"
            let res = input.replace(/floor\.l\s*(.*?)\s*ceil\.r/g, "round($1)");
            // Typst disallow "round()" with empty argument, so add an empty string inside if it's empty.
            res = res.replace(/round\(\)/g, 'round("")');
            return res;
        }
        if (this.options.optimize) {
            const all_passes = [smartFloorPass, smartCeilPass, smartRoundPass];
            for (const pass of all_passes) {
                this.buffer = pass(this.buffer);
            }
        }
        return this.buffer;
    }
}
