import { TexToken, TexTokenType } from "./tex-types";
import { JSLex, Scanner } from "./jslex";

export const TEX_UNARY_COMMANDS = [
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
    'overleftarrow',
    'overrightarrow',
    'hspace',
    'substack',
    'set',
]

export const TEX_BINARY_COMMANDS = [
    'frac',
    'tfrac',
    'binom',
    'dbinom',
    'dfrac',
    'tbinom',
    'overset',
    'underset',
    'textcolor',
]


function unescape(str: string): string {
    const chars = ['{', '}', '\\', '$', '&', '#', '_', '%'];
    for (const char of chars) {
        str = str.replaceAll('\\' + char, char);
    }
    return str;
}

const rules_map = new Map<string, (a: Scanner<TexToken>) => TexToken | TexToken[]>([
    // match `\begin{array}{cc}`
    [
        String.raw`\\begin{(array|subarry)}{(.+?)}`, (s) => {
            const match = s.reMatchArray()!;
            return [
                new TexToken(TexTokenType.COMMAND, '\\begin'),
                new TexToken(TexTokenType.CONTROL, '{'),
                new TexToken(TexTokenType.LITERAL, match[1]),
                new TexToken(TexTokenType.CONTROL, '}'),
                new TexToken(TexTokenType.CONTROL, '{'),
                new TexToken(TexTokenType.LITERAL, match[2]),
                new TexToken(TexTokenType.CONTROL, '}'),
            ]
        }
    ],
    [
        String.raw`\\(text|operatorname|textcolor|begin|end|hspace|array){(.+?)}`, (s) => {
            const match = s.reMatchArray()!;
            return [
                new TexToken(TexTokenType.COMMAND, '\\' + match[1]),
                new TexToken(TexTokenType.CONTROL, '{'),
                new TexToken(TexTokenType.LITERAL, unescape(match[2])),
                new TexToken(TexTokenType.CONTROL, '}')
            ]
        }
    ],
    [String.raw`%[^\n]*`, (s) => new TexToken(TexTokenType.COMMENT, s.text()!.substring(1))],
    [String.raw`[{}_^&]`, (s) => new TexToken(TexTokenType.CONTROL, s.text()!)],
    [String.raw`\\[\\,:;! ]`, (s) => new TexToken(TexTokenType.CONTROL, s.text()!)],
    [String.raw`\r?\n`, (_s) => new TexToken(TexTokenType.NEWLINE, "\n")],
    [String.raw`\s+`, (s) => new TexToken(TexTokenType.SPACE, s.text()!)],
    [String.raw`\\[{}%$&#_|]`, (s) => new TexToken(TexTokenType.ELEMENT, s.text()!)],
    // e.g. match `\frac13`, `\frac1 b`, `\frac a b`
    [String.raw`(\\[a-zA-Z]+)(\s*\d|\s+[a-zA-Z])\s*([0-9a-zA-Z])`, (s) => {
        const match = s.reMatchArray()!;
        const command = match![1];
        if (TEX_BINARY_COMMANDS.includes(command.substring(1))) {
            const arg1 = match[2].trimStart();
            const arg2 = match[3];
            return [
                new TexToken(TexTokenType.COMMAND, command),
                new TexToken(TexTokenType.ELEMENT, arg1),
                new TexToken(TexTokenType.ELEMENT, arg2),
            ];
        } else {
            s.reject();
            return [];
        }
    }],
    // e.g. match `\sqrt3`, `\sqrt a`
    [String.raw`(\\[a-zA-Z]+)(\s*\d|\s+[a-zA-Z])`, (s) => {
        const match = s.reMatchArray()!;
        const command = match[1];
        if (TEX_UNARY_COMMANDS.includes(command.substring(1))) {
            const arg1 = match[2].trimStart();
            return [
                new TexToken(TexTokenType.COMMAND, command),
                new TexToken(TexTokenType.ELEMENT, arg1),
            ];
        } else {
            s.reject();
            return [];
        }
    }],
    [String.raw`\\[a-zA-Z]+`, (s) => new TexToken(TexTokenType.COMMAND, s.text()!)],
    // Numbers like "123", "3.14"
    [String.raw`[0-9]+(\.[0-9]+)?`, (s) => new TexToken(TexTokenType.ELEMENT, s.text()!)],
    [String.raw`[a-zA-Z]`, (s) => new TexToken(TexTokenType.ELEMENT, s.text()!)],
    [String.raw`[+\-*/='<>!.,;:?()\[\]|]`, (s) => new TexToken(TexTokenType.ELEMENT, s.text()!)],
    // non-ASCII characters
    [String.raw`[^\x00-\x7F]`, (s) => new TexToken(TexTokenType.ELEMENT, s.text()!)],
    [String.raw`.`, (s) => new TexToken(TexTokenType.UNKNOWN, s.text()!)],
]);

const spec = {
    "start": rules_map
};

export function tokenize_tex(input: string): TexToken[] {
    const lexer = new JSLex<TexToken>(spec);
    return lexer.collect(input);
}
