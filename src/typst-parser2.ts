import typst_parser from "./parser2.js";

/* Run
 bunx jison typst.jison --module-type=es -o src/parser2.js
Then prepend the following code to parser2.js:

class TypstNode {
  constructor(type, value, args = []) {
      this.type = type;
      this.value = value;
      this.args = args;
  }
}

*/

class TypstNode {
    type: string;
    value: string;
    args: TypstNode[];

    constructor(type: string, value: string, args = []) {
        this.type = type;
        this.value = value;
        this.args = args;
    }
}

/**
 * emitted via
 * npx jison typ.jison --module-type=es
 */

const input = "1 + 2 * 3 - a / b + f(x)";

export function parseTypst(typst: string): TypstNode {
    return typst_parser.parse(typst) as any as TypstNode;
}
