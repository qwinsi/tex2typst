# tex2typst.js

JavaScript library for conversion between TeX/LaTeX and Typst math code.

Despite the name `tex2typst` due to the initial goal of converting TeX to Typst, the library can also convert Typst to TeX since version 0.3.0.

## Try it online

A Web UI wrapper is available at [https://qwinsi.github.io/tex2typst-webapp/](https://qwinsi.github.io/tex2typst-webapp/).

## Installation

## Installing it in a Node.js project

```bash
npm install tex2typst
```

## Or just loading it in a web page

```html
<script src="https://cdn.jsdelivr.net/npm/tex2typst@0.3.0/dist/tex2typst.min.js"></script>
<!-- or  -->
<script src="https://unpkg.com/tex2typst@0.3.0/dist/tex2typst.min.js"></script>
```

Replace `0.3.0` with the latest version number in case this README is outdated.


## Usage

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

If you are using the library in a web page via a `<script>` tag, you don't need the line of `import`, function `tex2typst` and `typst2tex` should be available in the global scope.

tex2typst.js supports some advanced options to customize the conversion. For details, please refer to the [API Reference](docs/api-reference.md).

## Open-source license

Apache License 2.0. See [LICENSE](LICENSE) for details.

Historical note: This project originally used GPL-3.0 license, and the license has been changed to Apache License 2.0 since version 0.3.15.

## Contributing

Feel free to open an issue or submit a pull request.
