// import { describe, test, expect } from 'vitest';
import { parseTypst } from '../src/typst-parser2.js';



// test("basic", () => {
    const input = "1 + 2 * 3 - a / b + c_3";
    const ast = parseTypst(input);
    // expect(ast).toBeDefined();
    console.dir(ast, {depth: null});
// })