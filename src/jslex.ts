/**
 * Adapted from jslex - A lexer in JavaScript. https://github.com/jimbojw/jslex
 * Licensed under MIT license
 */


interface ILexSpec<T> {
    [key: string]: Map<string, (arg0: Scanner<T>) => T | T[]>;
}

interface IRule<T> {
    re: RegExp;
    action: (a: Scanner<T>) => T | T[];
}

interface IMatch<T> {
    index: number;
    rule: IRule<T>;
    reMatchArray: RegExpMatchArray;
}


// End of File marker
const EOF = {};

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

export class Scanner<T> {
    private _input: string;
    private _lexer: JSLex<T>;

    // position within input stream
    private _pos: number = 0;

    // current line number
    private _line: number = 0;

    // current column number
    private _col: number = 0;

    private _offset: number = 0;
    private _less: number | null = null;
    private _go: boolean = false;
    private _newstate: string | null = null;
    private _state: string;

    private _text: string | null = null;
    private _leng: number | null = null;
    private _reMatchArray: RegExpMatchArray | null = null;

    constructor(input: string, lexer: JSLex<T>) {
        this._input = input;
        this._lexer = lexer;
        this._state = lexer.states[0];
    }

    /**
     * Analogous to yytext and yyleng in lex - will be set during scan.
     */
    public text(): string | null {
        return this._text;
    }

    public leng(): number | null {
        return this._leng;
    }

    public reMatchArray(): RegExpMatchArray | null {
        return this._reMatchArray;
    }

    /**
     * Position of in stream, line number and column number of match.
     */
    public pos(): number {
        return this._pos;
    }

    public line(): number {
        return this._line;
    }

    public column(): number {
        return this._col;
    }

    /**
     * Analogous to input() in lex.
     * @return {string} The next character in the stream.
     */
    public input(): string {
        return this._input.charAt(this._pos + this._leng! + this._offset++);
    }

    /**
     * Similar to unput() in lex, but does not allow modifying the stream.
     * @return {int} The offset position after the operation.
     */
    public unput(): number {
        return this._offset = this._offset > 0 ? this._offset-- : 0;
    }

    /**
     * Analogous to yyless(n) in lex - retains the first n characters from this pattern, and returns
     * the rest to the input stream, such that they will be used in the next pattern-matching operation.
     * @param {int} n Number of characters to retain.
     * @return {int} Length of the stream after the operation has completed.
     */
    public less(n: number): number {
        this._less = n;
        this._offset = 0;
        this._text = this._text!.substring(0, n);
        return this._leng = this._text.length;
    }

    /**
     * Like less(), but instead of retaining the first n characters, it chops off the last n.
     * @param {int} n Number of characters to chop.
     * @return {int} Length of the stream after the operation has completed.
     */
    public pushback(n: number): number {
        return this.less(this._leng! - n);
    }

    /**
     * Similar to REJECT in lex, except it doesn't break the current execution context.
     * TIP: reject() should be the last instruction in a spec callback.
     */
    public reject(): void {
        this._go = true;
    }

    /**
     * Analogous to BEGIN in lex - sets the named state (start condition).
     * @param {string|int} state Name of state to switch to, or ordinal number (0 is first, etc).
     * @return {string} The new state on successful switch, throws exception on failure.
     */
    public begin(state: string | number): string {
        if (this._lexer.specification[state]) {
            return this._newstate = state as string;
        }
        const s = this._lexer.states[parseInt(state as string)];
        if (s) {
            return this._newstate = s;
        }
        throw "Unknown state '" + state + "' requested";
    }

    /**
     * Simple accessor for reading in the current state.
     * @return {string} The current state.
     */
    public state(): string {
        return this._state;
    }

    /**
     * Scan method to be returned to caller - grabs the next token and fires appropriate calback.
     * @return {T} The next token extracted from the stream.
     */
    public scan(): T | T[] {
        if(this._pos >= this._input.length) {
            return EOF as T;
        }

        const str = this._input.substring(this._pos);
        const rules = this._lexer.specification[this._state];
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
        this._go = true;

        let result: T | T[];
        let matched_text: string;
        for (let j = 0, n = matches.length; j < n && this._go; j++) {
            this._offset = 0;
            this._less = null;
            this._go = false;
            this._newstate = null;
            const m = matches[j];
            matched_text = m.reMatchArray[0];
            this._text = matched_text;
            this._leng = matched_text.length;
            this._reMatchArray = m.reMatchArray;
            result = m.rule.action(this);
            if (this._newstate && this._newstate != this._state) {
                this._state = this._newstate;
                break;
            }
        }
        const text = this._less === null ? matched_text! : matched_text!.substring(0, this._less);
        const len = text.length;
        this._pos += len + this._offset;

        const nlm = text.match(/\n/g);
        if (nlm !== null) {
            this._line += nlm.length;
            this._col = len - text.lastIndexOf("\n") - 1;
        } else {
            this._col += len;
        }
        return result!;
    }
}

export class JSLex<T> {
    public states: string[];
    public specification: Record<string, IRule<T>[]>;

    constructor(spec: ILexSpec<T>) {
        this.states = Object.keys(spec);
        this.specification = {};

        // build out internal representation of the provided spec
        for (const s of this.states) {
            // e.g. s = "start"
            const rule_map = spec[s] as Map<string, (arg0: Scanner<T>) => T | T[]>;

            if (s in this.specification) {
                throw "Duplicate state declaration encountered for state '" + s + "'";
            }

            this.specification[s] = [] as IRule<T>[];

            for (const [k,v] of rule_map.entries()) {
                let re: RegExp;
                try {
                    // FIXME: e.g. "neg|norm" becomes /^neg|norm/,
                    // but what we really want is /^(neg|norm)/ .
                    // This will cause error when tokenize input like "...norm..."
                    re = new RegExp('^' + k);
                } catch (err) {
                    throw "Invalid regexp '" + k + "' in state '" + s + "' (" + (err as Error).message + ")";
                }
                this.specification[s].push({
                    re: re,
                    action: v
                });
            }
        }
    }

    /**
     * Scanner function - makes a new scanner object which is used to get tokens one at a time.
     * @param {string} input Input text to tokenize.
     * @return {function} Scanner function.
     */
    public scanner(input: string): Scanner<T> {
        return new Scanner(input, this);
    }

    /**
     * Similar to lex's yylex() function, consumes all input, calling calback for each token.
     * @param {string} input Text to lex.
     * @param {function} callback Function to execute for each token.
     */
    public lex(input: string, callback: (arg0: T | T[]) => void) {
        const scanner = this.scanner(input);
        while (true) {
            const token = scanner.scan();
            if (token === EOF) {
                return;
            }
            if (token !== undefined) {
                callback(token);
            }
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
