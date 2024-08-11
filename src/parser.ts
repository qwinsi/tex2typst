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
                if (node.text === '\\{' || node.text === '\\}') {
                    res.content = node.text.substring(1); // '{' or '}'
                } else if (node.text!.startsWith('\\')) {
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
                if (node['leftDelim'] === '(' && node['rightDelim'] === ')') {
                    // This occurs for \binom \tbinom
                    res.content = '\\binom';
                } else {
                    res.content = '\\frac';
                }
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
                let left: string = node['left']!;
                if (left === "\\{") {
                    left = "{";
                }
                let right: string = node['right']!;
                if (right === "\\}") {
                    right = "}";
                }
                res.args = [
                    { type: 'atom', content: left },
                    body,
                    { type: 'atom', content: right}
                ];
                break;
            }
            case 'underline':
            case 'overline': 
                res.type = 'unaryFunc';
                res.content = '\\' + node.type;
                res.args = [
                    katexNodeToTexNode(node['body'] as KatexParseNode)
                ];
                break;
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
                    res.content = '\\' + node['font']; // e.g. \mathbf, \mathrm
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
            case 'spacing':
                // res.type = 'spacing';
                // res.content = node.text! as string;
                // break;
            case 'kern':
                // This can occur for \implies, \iff. 
                // e.g. \implies is parsed as [{type:'kern'}, {type:'atom', text:'\\Longrightarrow'}, {type:'kern'}]
                // TODO: Ideally, we should output a single symbol \implies.
                // But for now, we simply let the output be \Longrightarrow
                res.type = 'empty';
                res.content = ' ';
                break;
            
            case 'htmlmathml': {
                // This can occur for \neq.
                const element = (node['mathml'] as KatexParseNode[])[0]!['body']![0];
                if (element && element.type === 'textord' && element.text === '≠') {
                    res.type = 'symbol';
                    res.content = '\\neq';
                    break;
                } else {
                    // Fall through to throw error
                }
            }
            case 'color':
                // KaTeX encounters an unrecognized macro.
                if (Array.isArray(node.body) && node.body.length === 1) {
                    const sub_body = node.body[0] as KatexParseNode;
                    if (sub_body.type === 'text') {
                        res.type = 'unknownMacro';
                        const joined = (sub_body.body as KatexParseNode[]).map((n) => n.text).join('');
                        if (/^\\[a-zA-Z]+$/.test(joined)){
                            res.content = joined.substring(1);
                            break;
                        }
                    }
                }
                throw new KatexNodeToTexNodeError(`Unknown error type in parsed result:`, node);
            default:
                throw new KatexNodeToTexNodeError(`Unknown node type: ${node.type}`, node);
                break;
        }
        return res as TexNode;
    } catch (e) {
        throw e;
    }
}

export function parseTex(tex: string, customTexMacros: {[key: string]: string}): TexNode {
    // displayMode=true. Otherwise, "KaTeX parse error: {align*} can be used only in display mode."
    const macros = {
        // KaTeX parse these commands so complicatedly that we need some hacks to keep things simple.
        '\\mod': '\\operatorname{SyMb01-mod}',
        '\\liminf': '\\operatorname{SyMb01-liminf}',
        '\\limsup': '\\operatorname{SyMb01-limsup}',
        '\\qquad': '\\operatorname{SyMb01-qquad}',
        '\\quad': '\\operatorname{SyMb01-quad}',
        '\\cdots': '\\operatorname{SyMb01-cdots}',
        '\\colon': '\\operatorname{SyMb01-colon}',
        '\\imath': '\\operatorname{SyMb01-imath}',
        '\\\iiiint': '\\operatorname{SyMb01-iiiint}', // \iiint is valid in LaTeX but not supported in KaTeX
        '\\jmath': '\\operatorname{SyMb01-jmath}',
        '\\vdots': '\\operatorname{SyMb01-vdots}',
        '\\notin': '\\operatorname{SyMb01-notin}',
        ...customTexMacros
    };
    const options = {
        macros: macros,
        displayMode: true,
        strict: "ignore",
        throwOnError: false
    };
    let treeArray = generateParseTree(tex, options);
    let t =  {
        type: 'ordgroup',
        mode: 'math',
        body: treeArray as KatexParseNode[],
        loc: {}
    } as KatexParseNode;
    return katexNodeToTexNode(t);
}
