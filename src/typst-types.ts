import { array_includes } from "./generic";
import { shorthandMap } from "./typst-shorthands";

export enum TypstTokenType {
    NONE,
    SYMBOL,
    ELEMENT,
    LITERAL,
    TEXT,
    COMMENT,
    SPACE,
    CONTROL,
    NEWLINE
}


export class TypstToken {
    readonly type: TypstTokenType;
    value: string;

    constructor(type: TypstTokenType, content: string) {
        this.type = type;
        this.value = content;
    }

    eq(other: TypstToken): boolean {
        return this.type === other.type && this.value === other.value;
    }

    isOneOf(tokens: TypstToken[]): boolean {
        return array_includes(tokens, this);
    }

    public toNode(): TypstNode {
        return new TypstTerminal(this);
    }

    public toString(): string {
        switch (this.type) {
            case TypstTokenType.TEXT:
                return `"${this.value}"`;
            case TypstTokenType.COMMENT:
                return `//${this.value}`;
            default:
                return this.value;
        }
    }

    public static readonly NONE = new TypstToken(TypstTokenType.NONE, '#none');
    public static readonly EMPTY = new TypstToken(TypstTokenType.ELEMENT, '');
    public static readonly LEFT_BRACE = new TypstToken(TypstTokenType.ELEMENT, '{');
    public static readonly RIGHT_BRACE = new TypstToken(TypstTokenType.ELEMENT, '}');


    public static readonly LEFT_DELIMITERS = [
        new TypstToken(TypstTokenType.ELEMENT, '('),
        new TypstToken(TypstTokenType.ELEMENT, '['),
        new TypstToken(TypstTokenType.ELEMENT, '{'),
        new TypstToken(TypstTokenType.ELEMENT, '|'),
        new TypstToken(TypstTokenType.SYMBOL, 'angle.l'),
    ];

    public static readonly RIGHT_DELIMITERS = [
        new TypstToken(TypstTokenType.ELEMENT, ')'),
        new TypstToken(TypstTokenType.ELEMENT, ']'),
        new TypstToken(TypstTokenType.ELEMENT, '}'),
        new TypstToken(TypstTokenType.ELEMENT, '|'),
        new TypstToken(TypstTokenType.SYMBOL, 'angle.r'),
    ];
}

export interface TypstSupsubData {
    base: TypstNode;
    sup: TypstNode | null;
    sub: TypstNode | null;
}


export interface TypstLeftRightData {
    body: TypstNode;
    left: TypstToken | null;
    right: TypstToken | null;
}

export interface TypstWriterEnvironment {
    insideFunctionDepth: number;
}

export interface TypstWriterOptions {
    nonStrict: boolean;
    preferShorthands: boolean;
    keepSpaces: boolean;
    inftyToOo: boolean;
    optimize: boolean;
}

export class TypstWriterError extends Error {
    node: TypstNode | TypstToken;

    constructor(message: string, node: TypstNode | TypstToken) {
        super(message);
        this.name = "TypstWriterError";
        this.node = node;
    }
}

const SOFT_SPACE = new TypstToken(TypstTokenType.CONTROL, ' ');

/**
 * fraction: `1/2`, `(x + y)/2`, `(1+x)/(1-x)`
 * group: `a + 1/3`
 * leftright: `(a + 1/3)`, `[a + 1/3)`, `lr(]sum_(x=1)^n])`
 * markupFunc: `#heading(level: 2)[something]`, `#text(fill: red)[some text and math $x + y$]`
 */
export type TypstNodeType = 'terminal' | 'group' | 'supsub' | 'funcCall' | 'fraction'| 'leftright' | 'matrixLike'| 'markupFunc';

export type TypstNamedParams = { [key: string]: TypstNode; };

export abstract class TypstNode {
    readonly type: TypstNodeType;
    head: TypstToken;
    // Some Typst functions accept additional options. e.g. mat() has option "delim", op() has option "limits"
    options?: TypstNamedParams;

    constructor(type: TypstNodeType, head: TypstToken | null) {
        this.type = type;
        this.head = head ? head : TypstToken.NONE;
    }

    // whether the node is over high so that if it's wrapped in braces, \left and \right should be used in its TeX form
    // e.g. 1/2 is over high, "2" is not.
    abstract isOverHigh(): boolean;

    // Serialize a tree of TypstNode into a list of TypstToken
    abstract serialize(env: TypstWriterEnvironment, options: TypstWriterOptions): TypstToken[];

    public setOptions(options: TypstNamedParams) {
        this.options = options;
    }

    // Note that this is only shallow equality.
    public eq(other: TypstNode): boolean {
        return this.type === other.type && this.head.eq(other.head);
    }

    public toString(): string {
        throw new Error(`Unimplemented toString() in base class TypstNode`);
    }
}

export class TypstTerminal extends TypstNode {
    constructor(head: TypstToken) {
        super('terminal', head);
    }

    public isOverHigh(): boolean {
        return false;
    }

    public toString(): string {
        return this.head.toString();
    }

    public serialize(env: TypstWriterEnvironment, options: TypstWriterOptions): TypstToken[] {
        if (this.head.type === TypstTokenType.ELEMENT) {
            if (this.head.value === ',' && env.insideFunctionDepth > 0) {
                return [new TypstToken(TypstTokenType.SYMBOL, 'comma')];
            }
        } else if (this.head.type === TypstTokenType.SYMBOL) {
            let symbol_name = this.head.value;
            if (options.preferShorthands) {
                if (shorthandMap.has(symbol_name)) {
                    symbol_name = shorthandMap.get(symbol_name)!;
                }
            }
            if (options.inftyToOo && symbol_name === 'infinity') {
                symbol_name = 'oo';
            }
            return [new TypstToken(TypstTokenType.SYMBOL, symbol_name)];
        } else if (this.head.type === TypstTokenType.SPACE || this.head.type === TypstTokenType.NEWLINE) {
            const queue: TypstToken[] = [];
            for (const c of this.head.value) {
                if (c === ' ') {
                    if (options.keepSpaces) {
                        queue.push(new TypstToken(TypstTokenType.SPACE, c));
                    }
                } else if (c === '\n') {
                    queue.push(new TypstToken(TypstTokenType.SYMBOL, c));
                } else {
                    throw new TypstWriterError(`Unexpected whitespace character: ${c}`, this);
                }
            }
            return queue;
        }
        return [this.head];
    }
}

export class TypstGroup extends TypstNode {
    public items: TypstNode[];
    constructor(items: TypstNode[]) {
        super('group', TypstToken.NONE);
        this.items = items;
    }

    public isOverHigh(): boolean {
        return this.items.some((n) => n.isOverHigh());
    }

    public serialize(env: TypstWriterEnvironment, options: TypstWriterOptions): TypstToken[] {
        const queue = this.items.flatMap((n) => n.serialize(env, options));
        // remove soft space at the start and end
        if (queue.length > 0 && queue[0].eq(SOFT_SPACE)) {
            queue.shift();
        }
        if (queue.length > 0 && queue[queue.length - 1].eq(SOFT_SPACE)) {
            queue.pop();
        }
        return queue;
    }
}


export class TypstSupsub extends TypstNode {
    public base: TypstNode;
    public sup: TypstNode | null;
    public sub: TypstNode | null;

    constructor(data: TypstSupsubData) {
        super('supsub', TypstToken.NONE);
        this.base = data.base;
        this.sup = data.sup;
        this.sub = data.sub;
    }

    public isOverHigh(): boolean {
        return this.base.isOverHigh();
    }

    public serialize(env: TypstWriterEnvironment, options: TypstWriterOptions): TypstToken[] {
        const queue: TypstToken[] = [];
        let { base, sup, sub } = this;

        queue.push(...base.serialize(env, options));

        const has_prime = (sup && sup.head.eq(new TypstToken(TypstTokenType.ELEMENT, "'")));
        if (has_prime) {
            // Put prime symbol before '_'. Because $y_1'$ is not displayed properly in Typst (so far)
            // e.g.
            // y_1' -> y'_1
            // y_{a_1}' -> y'_(a_1)
            queue.push(new TypstToken(TypstTokenType.ELEMENT, '\''));
        }
        if (sub) {
            queue.push(new TypstToken(TypstTokenType.ELEMENT, '_'));
            queue.push(...sub.serialize(env, options));
        }
        if (sup && !has_prime) {
            queue.push(new TypstToken(TypstTokenType.ELEMENT, '^'));
            queue.push(...sup.serialize(env, options));
        }
        queue.push(SOFT_SPACE);
        return queue;
    }
}

export class TypstFuncCall extends TypstNode {
    public args: TypstNode[];
    constructor(head: TypstToken, args: TypstNode[]) {
        super('funcCall', head);
        this.args = args;
    }

    public isOverHigh(): boolean {
        if (this.head.value === 'frac') {
            return true;
        }
        return this.args.some((n) => n.isOverHigh());
    }

    public serialize(env: TypstWriterEnvironment, options: TypstWriterOptions): TypstToken[] {
        const queue: TypstToken[] = [];

        const func_symbol: TypstToken = this.head;
        queue.push(func_symbol);
        env.insideFunctionDepth++;
        queue.push(TYPST_LEFT_PARENTHESIS);
        for (let i = 0; i < this.args.length; i++) {
            queue.push(...this.args[i].serialize(env, options));
            if (i < this.args.length - 1) {
                queue.push(new TypstToken(TypstTokenType.ELEMENT, ','));
            }
        }
        if (this.options) {
            for (const [key, value] of Object.entries(this.options)) {
                queue.push(new TypstToken(TypstTokenType.LITERAL, `, ${key}: ${value.toString()}`));
            }
        }
        queue.push(TYPST_RIGHT_PARENTHESIS);
        env.insideFunctionDepth--;
        return queue;
    }
}

export class TypstFraction extends TypstNode {
    public args: TypstNode[];

    constructor(args: TypstNode[]) {
        super('fraction', TypstToken.NONE);
        this.args = args;
    }

    public isOverHigh(): boolean {
        return true;
    }

    public serialize(env: TypstWriterEnvironment, options: TypstWriterOptions): TypstToken[] {
        const queue: TypstToken[] = [];

        const [numerator, denominator] = this.args;
        queue.push(SOFT_SPACE);
        queue.push(...numerator.serialize(env, options));
        queue.push(new TypstToken(TypstTokenType.ELEMENT, '/'));
        queue.push(...denominator.serialize(env, options));
        queue.push(SOFT_SPACE);
        return queue;
    }
}

const TYPST_LEFT_PARENTHESIS: TypstToken = new TypstToken(TypstTokenType.ELEMENT, '(');
const TYPST_RIGHT_PARENTHESIS: TypstToken = new TypstToken(TypstTokenType.ELEMENT, ')');

export class TypstLeftright extends TypstNode {
    public body: TypstNode;
    public left: TypstToken | null;
    public right: TypstToken | null;

    // head is either null or 'lr'
    constructor(head: TypstToken | null, data: TypstLeftRightData) {
        super('leftright', head);
        this.body = data.body;
        this.left = data.left;
        this.right = data.right;
    }

    public isOverHigh(): boolean {
        return this.body.isOverHigh();
    }

    public serialize(env: TypstWriterEnvironment, options: TypstWriterOptions): TypstToken[] {
        const queue: TypstToken[] = [];
        const LR = new TypstToken(TypstTokenType.SYMBOL, 'lr');
        const {left, right} = this;
        if (this.head.eq(LR)) {
            queue.push(LR);
            queue.push(TYPST_LEFT_PARENTHESIS);
        }
        if (left) {
            queue.push(left);
        }
        queue.push(...this.body.serialize(env, options));
        if (right) {
            queue.push(right);
        }
        if (this.head.eq(LR)) {
            queue.push(TYPST_RIGHT_PARENTHESIS);
        }
        return queue;
    }
}


export class TypstMatrixLike extends TypstNode {
    public matrix: TypstNode[][];

    // head is 'mat', 'cases' or null
    constructor(head: TypstToken | null, data: TypstNode[][]) {
        super('matrixLike', head);
        this.matrix = data;
    }

    public isOverHigh(): boolean {
        return true;
    }

    public serialize(env: TypstWriterEnvironment, options: TypstWriterOptions): TypstToken[] {
        const queue: TypstToken[] = [];

        let cell_sep: TypstToken;
        let row_sep: TypstToken;
        if (this.head.eq(TypstMatrixLike.MAT)) {
            cell_sep = new TypstToken(TypstTokenType.ELEMENT, ',');
            row_sep = new TypstToken(TypstTokenType.ELEMENT, ';');
        } else if (this.head.eq(TypstMatrixLike.CASES)) {
            cell_sep = new TypstToken(TypstTokenType.ELEMENT, '&');
            row_sep = new TypstToken(TypstTokenType.ELEMENT, ',');
        } else if (this.head.eq(TypstToken.NONE)){ // head is null
            cell_sep = new TypstToken(TypstTokenType.ELEMENT, '&');
            row_sep = new TypstToken(TypstTokenType.SYMBOL, '\\');
        }

        if (!this.head.eq(TypstToken.NONE)) {
            queue.push(this.head);
            env.insideFunctionDepth++;
            queue.push(TYPST_LEFT_PARENTHESIS);
            if (this.options) {
                for (const [key, value] of Object.entries(this.options)) {
                    queue.push(new TypstToken(TypstTokenType.LITERAL, `${key}: ${value.toString()}, `));
                }
            }
        }

        this.matrix.forEach((row, i) => {
            row.forEach((cell, j) => {
                queue.push(...cell.serialize(env, options));
                if (j < row.length - 1) {
                    queue.push(cell_sep);
                } else {
                    if (i < this.matrix.length - 1) {
                        queue.push(row_sep);
                    }
                }
            });
        });

        if (!this.head.eq(TypstToken.NONE)) {
            queue.push(TYPST_RIGHT_PARENTHESIS);
            env.insideFunctionDepth--;
        }

        return queue;
    }

    static readonly MAT = new TypstToken(TypstTokenType.SYMBOL, 'mat');
    static readonly CASES = new TypstToken(TypstTokenType.SYMBOL, 'cases');
}

export class TypstMarkupFunc extends TypstNode {
    /*
    In idealized situations, for `#heading([some text and math $x + y$ example])`,
    fragments would be [TypstMarkup{"some text and math "}, TypstNode{"x + y"}, TypstMarkup{" example"}]
    At present, we haven't implemented anything about TypstMarkup.
    So only pattens like `#heading(level: 2)[$x+y$]`, `#text(fill: red)[$x + y$]` are supported.
    Therefore, fragments is always a list containing exactly 1 TypstNode in well-working situations.
    */
    public fragments: TypstNode[];

    constructor(head: TypstToken, fragments: TypstNode[]) {
        super('markupFunc', head);
        this.fragments = fragments;
    }

    public isOverHigh(): boolean {
        return this.fragments.some((n) => n.isOverHigh());
    }

    public serialize(env: TypstWriterEnvironment, options: TypstWriterOptions): TypstToken[] {
        const queue: TypstToken[] = [];

        queue.push(this.head);
        env.insideFunctionDepth++;
        queue.push(TYPST_LEFT_PARENTHESIS);
        if (this.options) {
            const entries = Object.entries(this.options);
            for (let i = 0; i < entries.length; i++) {
                const [key, value] = entries[i];
                queue.push(new TypstToken(TypstTokenType.LITERAL, `${key}: ${value.toString()}`));
                if (i < entries.length - 1) {
                    queue.push(new TypstToken(TypstTokenType.ELEMENT, ','));
                }
            }
        }
        queue.push(TYPST_RIGHT_PARENTHESIS);

        queue.push(new TypstToken(TypstTokenType.LITERAL, '['));
        for (const frag of this.fragments) {
            queue.push(new TypstToken(TypstTokenType.LITERAL, '$'));
            queue.push(...frag.serialize(env, options));
            queue.push(new TypstToken(TypstTokenType.LITERAL, '$'));
        }
        queue.push(new TypstToken(TypstTokenType.LITERAL, ']'));
        return queue;
    }
}
