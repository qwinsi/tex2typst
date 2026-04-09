import { TypstToken } from "./typst-types";
import { TypstTokenType } from "./typst-types";
import { reverseShorthandMap } from "./typst-shorthands";
import { JSLex, Scanner, ScannerCallback } from "./lex";

const TYPST_SHORTHANDS = Array.from(reverseShorthandMap.keys());


function generate_regex_for_shorthands(): string {
    const regex_list = TYPST_SHORTHANDS.map((s) => {
        s = s.replaceAll('|', '\\|');
        s = s.replaceAll('.', '\\.');
        s = s.replaceAll('[', '\\[');
        s = s.replaceAll(']', '\\]');
        return s;
    });
    return `(${regex_list.join('|')})`;
}


const REGEX_SHORTHANDS = generate_regex_for_shorthands();

const rules_map = new Map<string, ScannerCallback<TypstToken>>([
    [String.raw`//[^\n]*`, (s) => new TypstToken(TypstTokenType.COMMENT, s.text()!.substring(2))],
    [String.raw`/`, (s) => new TypstToken(TypstTokenType.ELEMENT, s.text()!)],
    [String.raw`[_^&]`, (s) => new TypstToken(TypstTokenType.CONTROL, s.text()!)],
    [String.raw`\r?\n`, (_s) => new TypstToken(TypstTokenType.NEWLINE, "\n")],
    [String.raw`\s+`, (s) => new TypstToken(TypstTokenType.SPACE, s.text()!)],
    [String.raw`\\[$&#_]`, (s) => new TypstToken(TypstTokenType.ELEMENT, s.text()!)],
    [String.raw`\\\n`, (s) => {
        return [
            new TypstToken(TypstTokenType.CONTROL, "\\"),
            new TypstToken(TypstTokenType.NEWLINE, "\n"),
        ]
    }],
    [String.raw`\\\s`, (s) => {
        return [
            new TypstToken(TypstTokenType.CONTROL, "\\"),
            new TypstToken(TypstTokenType.SPACE, " "),
        ]
    }],
    // this backslash is dummy and will be ignored in later stages
    [String.raw`\\\S`, (_s) => new TypstToken(TypstTokenType.CONTROL, "")],
    [
        String.raw`"([^"]|(\\"))*"`,
        (s) => {
            const text = s.text()!.substring(1, s.text()!.length - 1);
            // replace all escape characters with their actual characters
            text.replaceAll('\\"', '"');
            return new TypstToken(TypstTokenType.TEXT, text);
        }
    ],
    [
        REGEX_SHORTHANDS,
        (s) => {
            const shorthand = s.text()!;
            const symbol = reverseShorthandMap.get(shorthand)!;
            return new TypstToken(TypstTokenType.SYMBOL, symbol);
        }
    ],
    [String.raw`[0-9]+(\.[0-9]+)?`, (s) => new TypstToken(TypstTokenType.ELEMENT, s.text()!)],
    [String.raw`[+\-*/=\'<>!.,;?()\[\]|]`, (s) => new TypstToken(TypstTokenType.ELEMENT, s.text()!)],
    [String.raw`#h\((.+?)\)`, (s) => {
        const match = s.reMatchArray()!;
        return [
            new TypstToken(TypstTokenType.SYMBOL, "#h"),
            new TypstToken(TypstTokenType.ELEMENT, "("),
            new TypstToken(TypstTokenType.LITERAL, match[1]),
            new TypstToken(TypstTokenType.ELEMENT, ")"),
        ];
    }],
    [String.raw`#none`, (s) => new TypstToken(TypstTokenType.NONE, s.text()!)],
    [String.raw`#?[a-zA-Z\.]+`, (s) => {
        return new TypstToken(s.text()!.length === 1? TypstTokenType.ELEMENT: TypstTokenType.SYMBOL, s.text()!);
    }],
    [String.raw`.`, (s) => new TypstToken(TypstTokenType.ELEMENT, s.text()!)],
]);

const spec = {
    "start": rules_map
};

export function tokenize_typst(input: string): TypstToken[] {
    const lexer = new JSLex<TypstToken>(spec);
    return lexer.collect(input);
}
