export interface LatexParseNode {
    type: string;
    content?: string;
    arg1?: LatexParseNode;
    arg2?: LatexParseNode;
    args?: LatexParseNode[];
    base?: LatexParseNode;
    sub?: LatexParseNode;
    sup?: LatexParseNode;
    exponent?: LatexParseNode;
    body?: LatexParseNode | LatexParseNode[] | LatexParseNode[][];
}


export interface TexSupsubData {
    base: TexNode;
    sup?: TexNode;
    sub?: TexNode;
}

export type TexSqrtData = TexNode;

export type TexArrayData = TexNode[][];

export interface TexNode {
    type: string;
    content: string;
    args?: TexNode[];
    // position?: Position;
    // For type="sqrt", it's additional argument wrapped square bracket. e.g. 3 in \sqrt[3]{x}
    // For type="supsub", it's base, sup, and sub.
    // For type="array", it's the 2-dimensional matrix.
    irregularData?: TexSqrtData | TexSupsubData | TexArrayData;
}

export interface TypstNode {
    type: 'atom' | 'symbol' | 'text' | 'softSpace' | 'comment' | 'newline',
    content: string;
    args?: TypstNode[];
}

export interface Tex2TypstOptions {
    nonStrict?: boolean; // default is false
    preferTypstIntrinsic?: boolean; // default is false,
    customTexMacros?: { [key: string]: string };
    // TODO: custom typst functions
}
