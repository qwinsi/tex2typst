
import { describe, test, expect } from 'vitest';
import { parseTypst } from '../src/typst-parser';
import { TexWriter } from '../src/tex-writer';
import { convert_typst_node_to_tex } from '../src/convert';
import { loadTestCases, TestCase  } from './test-common';
import { Typst2TexOptions } from '../src/exposed-types';
import { typst2tex } from '../src';

const options: Typst2TexOptions = {
    blockMathMode: true,
};

describe('examples', () => {
    test('a + b', function () {
        const typst_node = parseTypst('a + b');
        const tex_node = convert_typst_node_to_tex(typst_node, options);
        const writer = new TexWriter();
        writer.append(tex_node);
        const res = writer.finalize();
        expect(res).toEqual('a + b');
    });

    test('sqrt(x)', function () {
        const typst_node = parseTypst('sqrt(x)');
        const tex_node = convert_typst_node_to_tex(typst_node, options);
        const writer = new TexWriter();
        writer.append(tex_node);
        const res = writer.finalize();
        expect(res).toEqual('\\sqrt{x}');
    });

    test('integral_a^b f(x) dif x', function () {
        const typst_node = parseTypst('integral_a^b f(x) dif x');
        const tex_node = convert_typst_node_to_tex(typst_node, options);
        const writer = new TexWriter();
        writer.append(tex_node);
        const res = writer.finalize();
        expect(res).toEqual('\\int_a^b f(x) \\mathrm{d} x');
    });

    test('lr({a + 1/3))', function () {
        const typst_node = parseTypst('lr({a + 1/3))');
        const tex_node = convert_typst_node_to_tex(typst_node, options);
        const writer = new TexWriter();
        writer.append(tex_node);
        const res = writer.finalize();
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
        const typst_node = parseTypst('<->');
        const tex_node = convert_typst_node_to_tex(typst_node, options);
        const writer = new TexWriter();
        writer.append(tex_node);
        const res = writer.finalize();
        expect(res).toEqual('\\leftrightarrow');
    });
});


describe('struct-typst2tex.yaml', function () {
    const suite = loadTestCases('struct-typst2tex.yaml');
    suite.cases.forEach((c: TestCase) => {
        test(c.title, function () {
            const typst_node = parseTypst(c.typst);
            const tex_node = convert_typst_node_to_tex(typst_node, options);
            const writer = new TexWriter();
            writer.append(tex_node);
            const res = writer.finalize();
            expect(res).toEqual(c.tex);
        });
    });
});

describe('struct-bidirection.yaml', function () {
    const suite = loadTestCases('struct-bidirection.yaml');
    suite.cases.forEach((c: TestCase) => {
        test(c.title, function () {
            const typst_node = parseTypst(c.typst);
            const tex_node = convert_typst_node_to_tex(typst_node, options);
            const writer = new TexWriter();
            writer.append(tex_node);
            const res = writer.finalize();
            expect(res).toEqual(c.tex);
        });
    });
});