import { tex2typst, typst2tex } from "../src/index";

function example_tex2typst(text: string) {
    const res = tex2typst(text);
    console.log(res);
}

function example_typst2tex(text: string) {
    const res = typst2tex(text);
    console.log(res);
}

example_tex2typst(String.raw`a + \sqrt{d} + \varGamma + 3`);

example_typst2tex("a + 1/2");
