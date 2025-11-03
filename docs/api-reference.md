# API Reference of tex2typst.js

## Basic usage

```javascript
import { tex2typst, typst2tex } from 'tex2typst';

let tex = "e \\overset{\\text{def}}{=} \\lim_{{n \\to \\infty}} \left(1 + \\frac{1}{n}\\right)^n";
let typst = tex2typst(tex);
console.log(typst);
// e eq.def lim_(n -> infinity) (1 + 1/n)^n

let tex_recovered = typst2tex(typst);
console.log(tex_recovered);
// e \overset{\text{def}}{=} \lim_{n \rightarrow \infty} \left(1 + \frac{1}{n} \right)^n
```

## Advanced options

`tex2typst` function accepts an optional second argument, which is an object containing options to customize the conversion.

```typescript
interface Tex2TypstOptions {
    preferShorthands?: boolean;
    fracToSlash?: boolean;
    inftyToOo?: boolean;
}
```

- `preferShorthands`: If set to `true`, the function will prefer using shorthands in Typst (e.g., `->` instead of `arrow.r`, `<<` instead of `lt.double`) when converting TeX to Typst. Default is `ture`.

```javascript
let tex = "a \\rightarrow b \\ll c";
let typst1 = tex2typst(tex, { preferShorthands: false });
console.log(typst1);
// a arrow.r b lt.double c
let typst2 = tex2typst(tex, { preferShorthands: true });
console.log(typst2);
// a -> b << c
```

- `fracToSlash`: If set to `true`, the Typst result will use the slash notation for fractions. Default is `true`.

```javascript
let tex = "\\frac{a}{b}";
let tpyst1 = tex2typst(tex, { fracToSlash: false });
console.log(typst1);
// frac(a, b)
let typst2 = tex2typst(tex, { fracToSlash: true });
console.log(typst2);
// a / b
```

- `inftyToOo`: If set to `true`, `\infty` converts to `oo` instead of `infinity`. Default is `false`.

```javascript
let tex = "\\infty";
let typst1 = tex2typst(tex, { inftyToOo: false });
console.log(typst1);
// infinity
let typst2 = tex2typst(tex, { inftyToOo: true });
console.log(typst2);
// oo
```
