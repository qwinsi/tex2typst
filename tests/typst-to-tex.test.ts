
import { describe, test, expect } from 'vitest';
import { parseTypst } from '../src/typst-parser';
import { TexWriter } from '../src/tex-writer';
import { convert_typst_node_to_tex } from '../src/convert';
import { loadTestCases, TestCase  } from './test-common';
import { Typst2TexOptions } from '../src/exposed-types';
import { typst2tex } from '../src';
import { expand_typst_predefined_variables } from '../src/typst-semantic-analyais';

const options: Typst2TexOptions = {
    blockMathMode: true,
};

describe('examples', () => {
    test('a + b', function () {
        const res = typst2tex('a + b', options);
        expect(res).toEqual('a + b');
    });

    test('sqrt(x)', function () {
        const res = typst2tex('sqrt(x)', options);
        expect(res).toEqual('\\sqrt{x}');
    });

    test('integral_a^b f(x) dif x', function () {
        const res = typst2tex('integral_a^b f(x) dif x', options);
        expect(res).toEqual('\\int_a^b f(x) \\mathrm{d} x');
    });

    test('lr({a + 1/3))', function () {
        const res = typst2tex('lr({a + 1/3))', options);
        expect(res).toEqual('\\left\\{a + \\frac{1}{3} \\right)');
    });

    test('blockMathMode = false', function () {
        const typst_code_1 = "a = display(sum_i x_i) b";
        const res1 = typst2tex(typst_code_1, { blockMathMode: false });
        expect(res1).toEqual(String.raw`a = \displaystyle \sum_i x_i \textstyle b`);

        const typst_code_2 = "a = inline(sum_i x_i) b";
        const res2 = typst2tex(typst_code_2, { blockMathMode: false });
        expect(res2).toEqual(String.raw`a = \textstyle \sum_i x_i b`);
    });

    test('blockMathMode = true', function () {
        const typst_code_1 = "a = inline(sum_i x_i) b";
        const res1 = typst2tex(typst_code_1, { blockMathMode: true });
        expect(res1).toEqual(String.raw`a = \textstyle \sum_i x_i \displaystyle b`);

        const typst_code_2 = "a = display(sum_i x_i) b";
        const res2 = typst2tex(typst_code_2, { blockMathMode: true });
        expect(res2).toEqual(String.raw`a = \displaystyle \sum_i x_i b`);
    });
});

describe('shorthands', () => {
    test('<->', function () {
        expect(typst2tex('<->')).toEqual('\\leftrightarrow');
    });
});


describe('struct-typst2tex.yaml', function () {
    const suite = loadTestCases('struct-typst2tex.yaml');
    suite.cases.forEach((c: TestCase) => {
        test(c.title, function () {
            const res = typst2tex(c.typst, options);
            expect(res).toEqual(c.tex);
        });
    });
});

describe('struct-bidirection.yaml', function () {
    const suite = loadTestCases('struct-bidirection.yaml');
    suite.cases.forEach((c: TestCase) => {
        test(c.title, function () {
            const res = typst2tex(c.typst, options);
            expect(res).toEqual(c.tex);
        });
    });
});