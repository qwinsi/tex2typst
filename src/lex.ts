/**
 * Last modified: 2026-05-30
 * Adapted from jslex - A lexer in JavaScript. https://github.com/jimbojw/jslex
 * Licensed under MIT license
 */

export type ScannerCallback<T> = (a: ScannerState) => ScanResult<T>;


type TypeEOF = null;
const EOF: TypeEOF = null;

interface IRule<T> {
    re: RegExp;
    action: ScannerCallback<T>;
}

interface IMatch<T> {
    index: number;
    rule: IRule<T>;
    reMatchArray: RegExpMatchArray;
}

/**
 * Utility function for comparing two matches.
 * @param {object} m1 Left-hand side match.
 * @param {object} m2 Right-hand side match.
 * @return {int} Difference between the matches.
 */
function matchcompare<T>(m1: IMatch<T>, m2: IMatch<T>): number {
    const m1_len = m1.reMatchArray[0].length;
    const m2_len = m2.reMatchArray[0].length;
    if(m2_len !== m1_len) {
        return m2_len - m1_len;
    } else {
        return m1.index - m2.index;
    }
}

enum ScanResultStatus {
    ACCEPTED = 0,
    REJECTED = 1,
    ERROR = 2,
}

export class ScanResult<T> {
    public result: T | T[];
    public status: ScanResultStatus;
    constructor(status: ScanResultStatus, result: T | T[]) {
        this.result = result;
        this.status = status;
    }


    public static Accepted<U>(result: U | U[]): ScanResult<U> {
        return new ScanResult(ScanResultStatus.ACCEPTED, result);
    }

    public static Rejected<U>(): ScanResult<U> {
        return new ScanResult(ScanResultStatus.REJECTED, []);
    }

    public static Error<U>(message: string): ScanResult<U> {
        return new ScanResult(ScanResultStatus.ERROR, []);
    }
}

interface ScannerState {
    pos: number;
    text: string;
    reMatchArray: RegExpMatchArray;
}

export class Scanner<T> {
    private readonly _input: string;
    private readonly rules: IRule<T>[];


    // position within input stream
    private _pos: number = 0;


    constructor(input: string, rules: IRule<T>[]) {
        this._input = input;
        this.rules = rules;
    }


    /**
     * Scan method to be returned to caller - grabs the next token and fires appropriate calback.
     * @return {T} The next token extracted from the stream.
     */
    public scan(): T | T[] | TypeEOF {
        if(this._pos >= this._input.length) {
            return EOF;
        }

        const str = this._input.substring(this._pos);
        const rules = this.rules;
        const matches: IMatch<T>[] = [];
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            const mt = str.match(rule.re);
            if (mt !== null && mt[0].length > 0) {
                matches.push({
                    index: i,
                    rule: rule,
                    reMatchArray: mt,
                });
            }
        }
        if (matches.length === 0) {
            throw new Error("No match found for input '" + str + "'");
        }
        matches.sort(matchcompare);

        for (const m of matches) {
            const matched_text = m.reMatchArray[0];
            const result = m.rule.action({
                pos: this._pos,
                text: matched_text,
                reMatchArray: m.reMatchArray,
            });
            if (result.status === ScanResultStatus.ACCEPTED) {
                this._pos += matched_text.length;
                return result.result;
            }
        }
        throw new Error("No match found for input '" + str + "'");
    }
}

export class JSLex<T> {
    public readonly rules: IRule<T>[] = [];


    constructor(ruleMap: Map<string, ScannerCallback<T>>) {
        for (const [k, v] of ruleMap.entries()) {
            let re: RegExp;
            try {
                // FIXME: e.g. "neg|norm" becomes /^neg|norm/,
                // but what we really want is /^(neg|norm)/ .
                // This will cause error when tokenize input like "...norm..."
                re = new RegExp('^' + k);
            } catch (err) {
                throw "Invalid regexp '" + k + "' (" + (err as Error).message + ")";
            }
            this.rules.push({
                re: re,
                action: v
            });
        }
    }


    /**
     * Similar to lex's yylex() function, consumes all input, calling calback for each token.
     * @param {string} input Text to lex.
     * @param {function} callback Function to execute for each token.
     */
    public lex(input: string, callback: (arg0: T | T[]) => void) {
        const scanner = new Scanner(input, this.rules);
        while (true) {
            const token = scanner.scan();
            if (token === EOF) {
                break;
            }
            callback(token);
        }
    }

    /**
     * Consumes all input, collecting tokens along the way.
     * @param {string} input Text to lex.
     * @return {array} List of tokens, may contain an Error at the end.
     */
    public collect(input: string): T[] {
        const tokens: T[] = [];
        const callback = function(item: T | T[]) {
            if (Array.isArray(item)) {
                tokens.push(...item);
            } else {
                tokens.push(item);
            }
        };
        this.lex(input, callback);
        return tokens;
    }
};
