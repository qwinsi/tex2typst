import { describe, it, test, expect } from 'vitest';
import yaml from 'js-yaml';
import path from 'node:path';
import fs from 'node:fs';
import { parseTex, KatexNodeToTexNodeError } from '../src/parser';
import { tex2typst } from '../src/index';
import { TypstWriterError } from '../src/writer';
import { Tex2TypstOptions, TexNode } from '../src/types';

type TestCase = {
  title: string;
  tex: string;
  typst: string;
  nonStrict?: boolean;
  preferTypstIntrinsic?: boolean;
  customTexMacros: { [key: string]: string };
};

type TestCaseFile = {
  title: string;
  cases: TestCase[];
};

const caseFiles: TestCaseFile[] = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith('.yml'))
  .map((file) => {
    const content = fs.readFileSync(path.join(__dirname, file), { encoding: 'utf-8' });
    return yaml.load(content) as TestCaseFile;
  });

caseFiles.forEach(({ title, cases }) => {
  describe(title, () => {
    cases.forEach((c: TestCase) => {
      test(c.title, function() {
        const {tex, typst} = c;
        let tex_node: null | TexNode = null;
        let result: null | string = null;
        try {
          const settings: Tex2TypstOptions = {
            nonStrict: c.nonStrict? c.nonStrict: false,
            preferTypstIntrinsic: c.preferTypstIntrinsic? c.preferTypstIntrinsic: false,
            customTexMacros: c.customTexMacros? c.customTexMacros: {},
          };
          tex_node = parseTex(tex, settings.customTexMacros!);
          if (c.title === 'left right {}') {
            console.log(`====== 😀 Separator ======`);
          }
          result = tex2typst(tex, settings);
          if (result !== typst) {
            console.log(`====== 😭 Wrong ======`);
            console.log(tex);
            console.log(yaml.dump(tex_node));
          }
          expect(result).toBe(typst);
        } catch (e) {
          console.log(`====== 😭 Error ======`);
          if (e instanceof KatexNodeToTexNodeError || e instanceof TypstWriterError) {
            console.log(e.node);
          }
          if (tex_node !== null) {
            console.log(yaml.dump(tex_node));
          }
          console.log(tex);
          throw e;
        }
      })
    });
  });
});
