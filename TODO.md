- proper formatter in tex-writer.ts and typst-writer.ts
- Typst math `{a + 1/3}` should convert to TeX math `\left\{a + \frac{1}{3} \right\}`
- typst-parser should produce TypstAlign instead of TypstGroup if there's a `&`
- translate
```
\left.
\begin{aligned}
 a + a & = 0 \\
 b + b & = 0
\end{aligned}
\right\}
```
to

```
lr(
#block($a + a &= 0 \
b + b &= 0$)
})
```
(refer to https://github.com/typst/typst/issues/1478#issuecomment-2400899653)

- In Typst, `| a |` and `|a|` are not looks the same. TeX `|a|` should convert to Typst `|a|` (not `| a |`).
