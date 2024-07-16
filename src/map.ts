export const symbolMap = new Map<string, string>([
    ['cdot', 'dot.op'],
    ['to', 'arrow.r'],
    ['rightarrow', 'arrow.r'],
    ['leftarrow', 'arrow.l'],
    ['gets', 'arrow.l'],
    ['infty', 'infinity'], // infinity
    ['nonumber', ''],
    ['vec', 'arrow'],
    ['mathbf', 'bold'],
    ['boldsymbol', 'bold'],
    ['mathcal', 'cal'],
    ['mathfrak', 'frak'],
    ['doteq', 'dot(eq)'],
    ['ge', 'gt.eq'],
    ['geq', 'gt.eq'],
    ['le', 'lt.eq'],
    ['leq', 'lt.eq'],
    ['neq', 'eq.not'],
    ['dot', 'dot'],
    ['ddot', 'dot.double'],
    ['dots', 'dots.h'],
    ['ldots', 'dots.h'],
    ['vdots', 'dots.v'],
    ['ddots', 'dots.down'],
    ['cdots', 'dots.h.c'],
    ['cap', 'sect'],
    ['cup', 'union'],
    ['hat', 'hat'],
    ['widehat', 'hat'], // Ideally, the result of \widehat should be longer than \hat. But it is not implemented now.
    ['tilde', 'tilde'],
    ['widetilde', 'tilde'], // Ideally, the result of \widetilde should be longer than \tilde. But it is not implemented now.
    ['quad', 'quad'],
    ['qquad', 'wide'],
    ['prod', 'product'],
    ['overbrace', 'overbrace'], // same
    ['underbrace', 'underbrace'], // same
    ['overline', 'overline'], // same
    ['underline', 'underline'], // same
    ['bar', 'macron'],

    /* Greek letters and their variants that should be handled specially */
    // tex: \epsilon \phi
    // typst: epsilon.alt phi.alt
    ['epsilon', 'epsilon.alt'],
    ['phi', 'phi.alt'],
    // tex: \varepsilon \vartheta \varpi \varrho \varsigma \varphi
    // typst: epsilon theta.alt pi.alt rho.alt sigma.alt phi
    ['varepsilon', 'epsilon'],
    ['vartheta', 'theta.alt'],
    ['varpi', 'pi.alt'],
    ['varrho', 'rho.alt'],
    ['varsigma', 'sigma.alt'],
    ['varphi', 'phi'],

    ['mathbb', 'bb'],
    ['mathcal', 'cal'],
    // TODO: This result it not proper. A solution is define scr in Typst code:
    // #let scr(a) = text(font: "STIX Two Math", stylistic-set: 01)[#math.cal(a)]
    // https://qiita.com/Yarakashi_Kikohshi/items/b7beaa0fba62a527df2b
    // https://github.com/typst/typst/issues/1431
    ['mathscr', 'cal'],

    ['mathrm', 'upright'],
    ['rm', 'upright'],

    // TODO: \pmb need special logic to handle but it is not implemented now. See the commented test case.
    ['pmb', 'bold'],

    /* variants of plus,minus,times,divide */
    ['pm', 'plus.minus'],
    ['mp', 'minus.plus'],
    ['oplus', 'xor'], // \oplus and also be plus.circle
    ['boxplus', 'plus.square'],
    ['otimes', 'times.circle'],
    ['boxtimes', 'times.square'],

    /* symbols in mathematical logic */
    ['neg', 'not'],
    ['land', 'and'],
    ['lor', 'or'],

    /* symbols about sets */
    ['in', 'in'],
    ['subset', 'subset'],
    ['subseteq', 'subset.eq'],
    ['varnothing', 'diameter'], // empty set

    /* symbols about comparing numbers */
    // tex: \neq \leq \geq \ll \gg \prec \succ \preceq \succeq
    // typst: eq.not lt.eq gt.eq lt.double gt.double prec succ prec.eq succ.eq
    ['neq', 'eq.not'],
    ['leq', 'lt.eq'],
    ['geq', 'gt.eq'],
    ['ll', 'lt.double'],
    ['gg', 'gt.double'],
    ['prec', 'prec'],
    ['succ', 'succ'],
    ['preceq', 'prec.eq'],
    ['succeq', 'succ.eq'],

    /* symbols about differential */
    ['Delta', 'Delta'],
    ['nabla', 'nabla'],
    ['partial', 'diff'],

    /* symbols about integral */
    // tex: \int \oint \iint \oiint \iiint \oiiint
    // typst: integral integral.cont integral.double integral.surf integral.triple integral.vol
    ['int', 'integral'],
    ['oint', 'integral.cont'],
    ['iint', 'integral.double'],
    ['oiint', 'integral.surf'],
    ['iiint', 'integral.triple'],
    ['oiiint', 'integral.vol'],

    /* big symbols used to denote accumulated operations */
    // tex: \sum \prod \bigcup \bigcap \bigvee \bigwedge \bigoplus \bigotimes \bigodot \biguplus \bigsqcup
    // typst: sum product union.big sect.big xor.big times.circle.big
    ['sum', 'sum'],
    ['prod', 'product'],
    ['bigcup', 'union.big'],
    ['bigcap', 'sect.big'],
    ['bigvee', 'or.big'],
    ['bigwedge', 'and.big'],
    ['bigoplus', 'xor.big'],
    ['bigotimes', 'times.circle.big'],
    ['bigodot', 'dot.circle.big'],
    ['biguplus', 'union.plus.big'],
    ['bigsqcup', 'union.sq.big'],

    /* wave */
    // tex: \sim \approx \cong \simeq \asymp \equiv \propto
    // typst: tilde.op approx tilde.equiv tilde.eq ≍ equiv prop
    ['sim', 'tilde.op'],
    ['approx', 'approx'],
    ['cong', 'tilde.equiv'],
    ['simeq', 'tilde.eq'],
    ['asymp', '≍'],   // just use the unicode character :-)
    ['equiv', 'equiv'],
    ['propto', 'prop'],

    /* arrows used in proofs */
    // tex: \implies \iff \leftrightarrow \longleftrightarrow \rightrightarrows
    // typst: arrow.r.double.long arrow.l.r.double.long arrow.l.r arrow.l.r.long arrows.rr
    ['implies', 'arrow.r.double.long'],
    ['Longrightarrow', 'arrow.r.double.long'], // Note: This macro is not supported by KaTeX
    ['iff', 'arrow.l.r.double.long'],
    ['Longleftrightarrow', 'arrow.l.r.double.long'], // Note: This macro is not supported by KaTeX
    ['leftrightarrow', 'arrow.l.r'],
    ['longleftrightarrow', 'arrow.l.r.long'],
    ['rightrightarrows', 'arrows.rr'],

    ['binom', 'binom'],

    /* left and right floor,ceil */
    // tex: \lfloor \rfloor \lceil \rceil
    // typst: ⌊ ⌋ ⌈ ⌉ 
    // TODO: Ideally, \lfloor x \rfloor should be translated to floor(x) but it is not implemented now.
    // The KaTeX parser parses it as \lfloor x \rfloor. So it would take some effort to implement it.
    ['lfloor', '⌊'],
    ['rfloor', '⌋'],
    ['lceil', '⌈'],
    ['rceil', '⌉'],
]);
