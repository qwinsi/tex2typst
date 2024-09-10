export enum TokenType {
    ELEMENT,
    COMMAND,
    TEXT,
    COMMENT,
    WHITESPACE,
    NEWLINE,
    CONTROL,
    UNKNOWN,
}

export interface Token {
    type: TokenType;
    value: string;
}


export interface TexSupsubData {
    base: TexNode;
    sup?: TexNode;
    sub?: TexNode;
}

export type TexSqrtData = TexNode;

export type TexArrayData = TexNode[][];

export interface TexNode {
    type: 'element' | 'text' | 'comment' | 'whitespace' | 'newline' | 'control' | 'ordgroup' | 'supsub'
             | 'unaryFunc' | 'binaryFunc' | 'leftright' | 'beginend' | 'symbol' | 'empty' | 'unknownMacro';
    content: string;
    args?: TexNode[];
    // position?: Position;
    // For type="sqrt", it's additional argument wrapped square bracket. e.g. 3 in \sqrt[3]{x}
    // For type="supsub", it's base, sup, and sub.
    // For type="array", it's the 2-dimensional matrix.
    data?: TexSqrtData | TexSupsubData | TexArrayData;
}

export interface TypstSupsubData {
    base: TypstNode;
    sup?: TypstNode;
    sub?: TypstNode;
}

export type TypstArrayData = TypstNode[][];

export interface TypstNode {
    type: 'atom' | 'symbol' | 'text' | 'softSpace' | 'comment' | 'newline'
            | 'empty' | 'group' | 'supsub' | 'unaryFunc' | 'binaryFunc' | 'align' | 'matrix' | 'unknown';
    content: string;
    args?: TypstNode[];
    data?: TypstSupsubData | TypstArrayData;
}

export interface Tex2TypstOptions {
    nonStrict?: boolean; // default is false
    preferTypstIntrinsic?: boolean; // default is false,
    customTexMacros?: { [key: string]: string };
    // TODO: custom typst functions
}
