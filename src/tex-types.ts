import { assert } from "./utils";

/**
 * ELEMENT: 0-9, a-z, A-Z, punctuations such as +-/*,:; etc.
 * COMMAND: LaTeX macro with no parameter. e.g. \sin \cos \int \sum
 * EMPTY: special type when something is empty. e.g. the base of _{a} or ^{a}
 */
export enum TexTokenType {
    EMPTY,
    ELEMENT,
    COMMAND,
    LITERAL,
    COMMENT,
    SPACE,
    NEWLINE,
    CONTROL,
    UNKNOWN,
}

export class TexToken {
    readonly type: TexTokenType;
    value: string;

    constructor(type: TexTokenType, value: string) {
        this.type = type;
        this.value = value;
    }

    public eq(token: TexToken): boolean {
        return this.type === token.type && this.value === token.value;
    }

    public toString(): string {
        switch (this.type) {
            case TexTokenType.COMMENT:
                return "%" + this.value;
            default:
                return this.value;
        }
    }

    public toNode(): TexNode {
        return new TexTerminal(this);
    }

    public static readonly EMPTY = new TexToken(TexTokenType.EMPTY, '');
    public static readonly COMMAND_DISPLAYSTYLE = new TexToken(TexTokenType.COMMAND, '\\displaystyle');
    public static readonly COMMAND_TEXTSTYLE = new TexToken(TexTokenType.COMMAND, '\\textstyle');
}


export interface TexSupsubData {
    base: TexNode;
    sup: TexNode | null;
    sub: TexNode | null;
}

// \left. or \right. will be represented as null.
export interface TexLeftRightData {
    body: TexNode;
    left: TexToken | null;
    right: TexToken | null;
}

/**
 * funcCall: LaTeX macro with 1 or more parameters. e.g. \sqrt{3} \log{x} \exp{x} \frac{1}{2}
 * text: text enclosed by braces. e.g. \text{hello world}
 */
type TexNodeType = 'terminal' | 'text' | 'ordgroup' | 'supsub'
             | 'funcCall' | 'leftright' | 'beginend';


export abstract class TexNode {
    readonly type: TexNodeType;
    head: TexToken;

    constructor(type: TexNodeType, head: TexToken | null) {
        this.type = type;
        this.head = head ? head : TexToken.EMPTY;
    }

    // Note that this is only shallow equality.
    public eq(other: TexNode): boolean {
        return this.type === other.type && this.head.eq(other.head);
    }

    abstract serialize(): TexToken[];
    abstract bottomTopTraversalTransform(operationFn: (n: TexNode) => TexNode): TexNode;

    // Note: toString() is expensive. Do not use it on performance-critical code path.
    public toString(): string {
        /*
        let buffer = '';
        const tokens = this.serialize();
        for (let i = 0; i < tokens.length; i++) {
            buffer = writeTexTokenBuffer(buffer, tokens[i]);
        }
        return buffer;
        */
       return this.serialize().reduce(writeTexTokenBuffer, '');
    }
}

export class TexTerminal extends TexNode {
    constructor(head: TexToken) {
        super('terminal', head);
    }

    public serialize(): TexToken[] {
        switch(this.head.type) {
            case TexTokenType.EMPTY:
                return [];
            case TexTokenType.ELEMENT:
            case TexTokenType.COMMAND:
            case TexTokenType.LITERAL:
            case TexTokenType.COMMENT:
            case TexTokenType.CONTROL: {
                return [this.head];
            }
            case TexTokenType.SPACE:
            case TexTokenType.NEWLINE: {
                const tokens: TexToken[] = [];
                for (const c of this.head.value) {
                    const token_type = c === ' ' ? TexTokenType.SPACE : TexTokenType.NEWLINE;
                    tokens.push(new TexToken(token_type, c));
                }
                return tokens;
            }
            default:
                throw new Error(`Unknown terminal token type: ${this.head.type}`);
        }
    }

    public bottomTopTraversalTransform(operationFn: (n: TexNode) => TexNode): TexNode {
        return operationFn(this);
    }
}

export class TexText extends TexNode {
    constructor(head: TexToken) {
        assert(head.type === TexTokenType.LITERAL);

        super('text', head);
    }

    public serialize(): TexToken[] {
        return [
            new TexToken(TexTokenType.COMMAND, '\\text'),
            new TexToken(TexTokenType.ELEMENT, '{'),
            this.head,
            new TexToken(TexTokenType.ELEMENT, '}'),
        ];
    }

    public bottomTopTraversalTransform(operationFn: (n: TexNode) => TexNode): TexNode {
        return operationFn(this);
    }
}

export class TexGroup extends TexNode {
    public items: TexNode[];
    constructor(items: TexNode[]) {
        super('ordgroup', TexToken.EMPTY);
        this.items = items;
    }

    public serialize(): TexToken[] {
        return this.items.map((n) => n.serialize()).flat();
    }

    public bottomTopTraversalTransform(operationFn: (n: TexNode) => TexNode): TexNode {
        const g = new TexGroup(this.items.map((n) => n.bottomTopTraversalTransform(operationFn)));
        return operationFn(g);
    }
}

export class TexSupSub extends TexNode {
    public base: TexNode;
    public sup: TexNode | null;
    public sub: TexNode | null;

    constructor(data: TexSupsubData) {
        super('supsub', TexToken.EMPTY);
        this.base = data.base;
        this.sup = data.sup;
        this.sub = data.sub;
    }

    public serialize(): TexToken[] {
        let tokens: TexToken[] = [];
        const { base, sup, sub } = this;
        tokens = tokens.concat(base.serialize());

        // TODO: should return true for more cases e.g. a_{\theta} instead of a_\theta
        function should_wrap_in_braces(node: TexNode): boolean {
            if(node.type === 'ordgroup' || node.type === 'supsub' || node.head.type === TexTokenType.EMPTY) {
                return true;
            } else if(node.head.type === TexTokenType.ELEMENT && /\d+(\.\d+)?/.test(node.head.value) && node.head.value.length > 1) {
                // a number with more than 1 digit as a subscript/superscript should be wrapped in braces
                return true;
            } else {
                return false;
            }
        }

        if (sub) {
            tokens.push(new TexToken(TexTokenType.CONTROL, '_'));
            if (should_wrap_in_braces(sub)) {
                tokens.push(new TexToken(TexTokenType.ELEMENT, '{'));
                tokens = tokens.concat(sub.serialize());
                tokens.push(new TexToken(TexTokenType.ELEMENT, '}'));
            } else {
                tokens = tokens.concat(sub.serialize());
            }
        }
        if (sup) {
            tokens.push(new TexToken(TexTokenType.CONTROL, '^'));
            if (should_wrap_in_braces(sup)) {
                tokens.push(new TexToken(TexTokenType.ELEMENT, '{'));
                tokens = tokens.concat(sup.serialize());
                tokens.push(new TexToken(TexTokenType.ELEMENT, '}'));
            } else {
                tokens = tokens.concat(sup.serialize());
            }
        }
        return tokens;
    }

    public bottomTopTraversalTransform(operationFn: (n: TexNode) => TexNode): TexNode {
        const s = new TexSupSub({
            base: this.base.bottomTopTraversalTransform(operationFn),
            sup: this.sup? this.sup.bottomTopTraversalTransform(operationFn): null,
            sub: this.sub? this.sub.bottomTopTraversalTransform(operationFn): null,
        });
        return operationFn(s);
    }
}

export class TexFuncCall extends TexNode {
    public args: TexNode[];

    // For type="sqrt", it's additional argument wrapped square bracket. e.g. 3 in \sqrt[3]{x}
    public data: TexNode | null;

    constructor(head: TexToken, args: TexNode[], data: TexNode | null = null) {
        super('funcCall', head);
        this.args = args;
        this.data = data;
    }

    public serialize(): TexToken[] {
        let tokens: TexToken[] = [];
        tokens.push(this.head);

        // special hook for \sqrt
        if (this.head.value === '\\sqrt' && this.data) {
            tokens.push(new TexToken(TexTokenType.ELEMENT, '['));
            tokens = tokens.concat(this.data.serialize());
            tokens.push(new TexToken(TexTokenType.ELEMENT, ']'));
        }

        for (const arg of this.args) {
            tokens.push(new TexToken(TexTokenType.ELEMENT, '{'));
            tokens = tokens.concat(arg.serialize());
            tokens.push(new TexToken(TexTokenType.ELEMENT, '}'));
        }

        return tokens;
    }

    public bottomTopTraversalTransform(operationFn: (n: TexNode) => TexNode): TexNode {
        const f = new TexFuncCall(this.head, this.args.map((n) => n.bottomTopTraversalTransform(operationFn)), this.data);
        return operationFn(f);
    }
}

export class TexLeftRight extends TexNode {
    public body: TexNode;
    public left: TexToken | null;
    public right: TexToken | null;

    constructor(data: TexLeftRightData) {
        super('leftright', TexToken.EMPTY);
        this.body = data.body;
        this.left = data.left;
        this.right = data.right;
    }

    public serialize(): TexToken[] {
        let tokens: TexToken[] = [];
        tokens.push(new TexToken(TexTokenType.COMMAND, '\\left'));
        tokens.push(new TexToken(TexTokenType.ELEMENT, this.left? this.left.value: '.'));
        tokens = tokens.concat(this.body.serialize());
        tokens.push(new TexToken(TexTokenType.COMMAND, '\\right'));
        tokens.push(new TexToken(TexTokenType.ELEMENT, this.right? this.right.value: '.'));
        return tokens;
    }

    public bottomTopTraversalTransform(operationFn: (n: TexNode) => TexNode): TexNode {
        const l = new TexLeftRight({
            body: this.body.bottomTopTraversalTransform(operationFn),
            left: this.left,
            right: this.right,
        });
        return operationFn(l);
    }
}

export class TexBeginEnd extends TexNode {
    public matrix: TexNode[][];
    // for environment="array" or "subarray", there's additional data like {c|c} right after \begin{env}
    public data: TexNode | null;

    constructor(head: TexToken, matrix: TexNode[][], data: TexNode | null = null) {
        assert(head.type === TexTokenType.LITERAL);
        super('beginend', head);
        this.matrix = matrix;
        this.data = data;
    }

    public serialize(): TexToken[] {
        let tokens: TexToken[] = [];
        const matrix = this.matrix;
        // tokens.push(new TexToken(TexTokenType.COMMAND, `\\begin{${this.content}}`));
        tokens.push(new TexToken(TexTokenType.COMMAND, '\\begin'));
        tokens.push(new TexToken(TexTokenType.ELEMENT, '{'));
        tokens = tokens.concat(this.head);
        tokens.push(new TexToken(TexTokenType.ELEMENT, '}'));
        tokens.push(new TexToken(TexTokenType.NEWLINE, '\n'));
        for (let i = 0; i < matrix.length; i++) {
            const row = matrix[i];
            for (let j = 0; j < row.length; j++) {
                const cell = row[j];
                tokens = tokens.concat(cell.serialize());
                if (j !== row.length - 1) {
                    tokens.push(new TexToken(TexTokenType.CONTROL, '&'));
                }
            }
            if (i !== matrix.length - 1) {
                tokens.push(new TexToken(TexTokenType.CONTROL, '\\\\'));
            }
        }
        tokens.push(new TexToken(TexTokenType.NEWLINE, '\n'));
        // tokens.push(new TexToken(TexTokenType.COMMAND, `\\end{${this.content}}`));
        tokens.push(new TexToken(TexTokenType.COMMAND, '\\end'));
        tokens.push(new TexToken(TexTokenType.ELEMENT, '{'));
        tokens = tokens.concat(this.head);
        tokens.push(new TexToken(TexTokenType.ELEMENT, '}'));
        return tokens;
    }

    public bottomTopTraversalTransform(operationFn: (n: TexNode) => TexNode): TexNode {
        const m = this.matrix.map((row) => row.map((cell) => cell.bottomTopTraversalTransform(operationFn)));
        const d = this.data? this.data.bottomTopTraversalTransform(operationFn): null;
        const be = new TexBeginEnd(this.head, m, d);
        return operationFn(be);
    }
}

export function writeTexTokenBuffer(buffer: string, token: TexToken): string {
    const str = token.toString();

    let no_need_space = false;
    if (token.type === TexTokenType.SPACE) {
        no_need_space = true;
    } else {
        // putting the first token in clause
        no_need_space ||= /[{\(\[\|]$/.test(buffer);
        // opening a optional [] parameter for a command
        no_need_space ||= /\\\w+$/.test(buffer) && str === '[';
        // putting a punctuation
        no_need_space ||= /^[\.,;:!\?\(\)\]{}_^]$/.test(str);
        no_need_space ||= ['\\{', '\\}'].includes(str);
        // putting a prime
        no_need_space ||= str === "'";
        // putting a subscript or superscript
        no_need_space ||= buffer.endsWith('_') || buffer.endsWith('^');
        // buffer ends with a whitespace
        no_need_space ||= /\s$/.test(buffer);
        // token starts with a space
        no_need_space ||= /^\s/.test(str);
        // buffer is empty
        no_need_space ||= buffer === '';
        // leading sign. e.g. produce "+1" instead of " +1"
        no_need_space ||= /[\(\[{]\s*(-|\+)$/.test(buffer) || buffer === '-' || buffer === '+';
        // "&=" instead of "& ="
        no_need_space ||= buffer.endsWith('&') && str === '=';
        // "2y" instead of "2 y"
        no_need_space ||= /\d$/.test(buffer) && /^[a-zA-Z]$/.test(str);
    }

    if (!no_need_space) {
        buffer += ' ';
    }

    return buffer + str;
}


