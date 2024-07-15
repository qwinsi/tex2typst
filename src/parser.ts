// @ts-ignore
import katex from 'katex';
import { TexNode, KatexParseNode, TexSupsubData } from './types.js';


const generateParseTree = katex.__parse;

export class KatexNodeToTexNodeError extends Error {
    node: KatexParseNode;

    constructor(message: string, node: KatexParseNode) {
        super(message);
        this.name = "KatexNodeToTexNodeError";
        this.node = node;
    }
}

export function katexNodeToTexNode(node: KatexParseNode): TexNode {
    try {
        if (node.loc) {
            delete node.loc;
        }
        let res = {} as TexNode;
        switch (node.type) {
            case 'atom':
                // basic symbol like +, -, =, '(', ')', '\{', '\}'
                // other punctuation-like macro such as \cdot, \to, \pm
                res.type = 'atom';
                res.content = node.text!;
                if (node.text!.startsWith('\\')) {
                    res.type = 'symbol';
                }
                break;
            case 'mathord':
                // basic variable like a, b, c
                // macro variable like \alpha, \beta, \gamma
            case 'textord':
                // - constant number like 1, 2, 3
                // - operator symbol like \nabla, \partial
            case 'op':
                // \lim, \sum
            case 'cr':
                // new line symbol '\\'
                res.type = 'symbol';
                res.content = node.text!;
                if (node.type === 'op') {
                    res.content = node['name']!;
                } else if (node.type === 'cr') {
                    res.content = '\\\\';
                }
                break;
            case 'genfrac':
                res.type = 'binaryFunc';
                res.content = '\\frac';
                res.args = [
                    katexNodeToTexNode(node['numer']),
                    katexNodeToTexNode(node['denom'])
                ];
                break;
            case 'supsub':
                res.type = 'supsub';
                res.irregularData = {} as TexSupsubData;
                if (node['base']) {
                    res.irregularData.base = katexNodeToTexNode(node['base']);
                }
                if (node['sup']) {
                    res.irregularData.sup = katexNodeToTexNode(node['sup']);
                }
                if (node['sub']) {
                    res.irregularData.sub = katexNodeToTexNode(node['sub']);
                }
                break;
            case 'mclass':
            case 'ordgroup':
                res.type = 'ordgroup';
                res.args = (node.body as KatexParseNode[]).map((n: KatexParseNode) => katexNodeToTexNode(n));
                if (res.args!.length === 1) {
                    res = res.args![0] as TexNode;
                }
                break;
            case 'leftright': {
                const body =  katexNodeToTexNode({
                    type: 'ordgroup',
                    mode: 'math',
                    body: node.body
                });

                res.type = 'leftright';
                res.args = [
                    { type: 'atom', content: node['left']! },
                    body,
                    { type: 'atom', content: node['right']}
                ];
                break;
            }
            case 'accent': {
                res.type = 'unaryFunc';
                res.content = node['label']!;
                res.args = [
                    katexNodeToTexNode(node['base'])
                ];
                break;
            }
            case 'sqrt':
                if (node['index']) {
                    // There is a [] after \sqrt
                    // \sqrt[some thing]{}
                    res.irregularData = katexNodeToTexNode(node['index']);
                }
                // Fall through
            case 'font':
            case 'operatorname':
                res.type = 'unaryFunc';
                res.content = ('\\' + node.type!) as string;
                if (node.type === 'font') {
                    res.content = '\\' + node['font']; // e.g. \mathbf
                }
                if(Array.isArray(node.body)) {
                    const obj = {
                        type: 'ordgroup',
                        mode: 'math',
                        body: node.body as KatexParseNode[]
                    } as KatexParseNode;
                    res.args = [
                        katexNodeToTexNode(obj)
                    ]
                } else {
                    res.args = [
                        katexNodeToTexNode(node.body as KatexParseNode)
                    ]
                }
                break;
            case 'horizBrace':
                res.type = 'unaryFunc';
                res.content = node['label']!; // '\\overbrace' or '\\unerbrace'
                res.args = [
                    katexNodeToTexNode(node['base']),
                ];
                break;
            case 'array':
                if (node['colSeparationType'] === 'align') {
                    // align environment
                    res.type = 'align';
                } else {
                    res.type = 'matrix'
                }
                res.irregularData = (node.body! as KatexParseNode[][]).map((row: KatexParseNode[]) => {
                    return row.map((cell: KatexParseNode) => {
                        if (cell.type !== 'styling' || (cell.body as KatexParseNode[]).length !== 1) {
                            throw new KatexNodeToTexNodeError("Expecting cell.type==='\\styling' and cell.body.length===1", cell);
                        }
                        return katexNodeToTexNode((cell.body as KatexParseNode[])[0]);
                    });
                });
                break;
            case 'spacing':
                res.type = 'spacing';
                res.content = node.text! as string;
                break;
            case 'text': {
                res.type = 'text';
                let str = "";
                (node.body as KatexParseNode[]).forEach((n) => {
                    if(n.mode !== 'text') {
                        throw new KatexNodeToTexNodeError("Expecting node.mode==='text'", node)
                    }
                    str += n.text;
                });
                res.content = str;
                break;
            }

            default:
                throw new KatexNodeToTexNodeError(`Unknown node type: ${node.type}`, node);
                break;
        }
        return res as TexNode;
    } catch (e) {
        throw e;
    }
}

export function parseTex(tex: string): TexNode {
    // displayMode=true. Otherwise, "KaTeX parse error: {align*} can be used only in display mode."
    let treeArray = generateParseTree(tex, {displayMode: true, strict: "ignore"});
    let t =  {
        type: 'ordgroup',
        mode: 'math',
        body: treeArray as KatexParseNode[],
        loc: {}
    } as KatexParseNode;
    return katexNodeToTexNode(t);
}
