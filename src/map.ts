export const symbolMap = new Map<string, string>([
    ['nonumber', ''],
    ['vec', 'arrow'],
    ['neq', 'eq.not'],
    ['dot', 'dot'],
    ['ddot', 'dot.double'],
    ['doteq', 'dot(eq)'],
    ['dots', 'dots.h'],
    ['ldots', 'dots.h'],
    ['vdots', 'dots.v'],
    ['ddots', 'dots.down'],
    ['widehat', 'hat'], // Ideally, the result of \widehat should be longer than \hat. But it is not implemented now.
    ['widetilde', 'tilde'], // Ideally, the result of \widetilde should be longer than \tilde. But it is not implemented now.
    ['quad', 'quad'],
    ['qquad', 'wide'],
    ['overbrace', 'overbrace'], // same
    ['underbrace', 'underbrace'], // same
    ['overline', 'overline'], // same
    ['underline', 'underline'], // same
    ['bar', 'macron'],
    ['dbinom', 'binom'],
    ['tbinom', 'binom'],
    ['dfrac', 'frac'],
    ['tfrac', 'frac'],

    ['boldsymbol', 'bold'],
    ['mathbb', 'bb'],
    ['mathbf', 'bold'],
    ['mathcal', 'cal'],
    ['mathit', 'italic'],
    ['mathfrak', 'frak'],
    ['mathrm', 'upright'],
    ['mathsf', 'sans'],
    ['mathtt', 'mono'],

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


    /* wave */
    // tex: \sim \approx \cong \simeq \asymp \equiv \propto
    // typst: tilde approx tilde.equiv tilde.eq ≍ equiv prop
    ['sim', 'tilde'],
    ['approx', 'approx'],
    ['cong', 'tilde.equiv'],
    ['simeq', 'tilde.eq'],
    ['asymp', '≍'],   // just use the unicode character :-)
    ['equiv', 'equiv'],
    ['propto', 'prop'],

    /* left and right floor,ceil */
    // tex: \lfloor \rfloor \lceil \rceil
    // typst: ⌊ ⌋ ⌈ ⌉ 
    // TODO: Ideally, \lfloor x \rfloor should be translated to floor(x) but it is not implemented now.
    // The KaTeX parser parses it as \lfloor x \rfloor. So it would take some effort to implement it.
    ['lfloor', '⌊'],
    ['rfloor', '⌋'],
    ['lceil', '⌈'],
    ['rceil', '⌉'],

    /* arrows */
    ['gets', 'arrow.l'],
    ['hookleftarrow', 'arrow.l.hook'],
    ['leftharpoonup', 'harpoon.lt'],
    ['leftharpoondown', 'harpoon.lb'],
    ['rightleftharpoons', 'harpoons.rtlb'],
    ['longleftarrow', 'arrow.l.long'],
    ['longrightarrow', 'arrow.r.long'],
    ['longleftrightarrow', 'arrow.l.r.long'],
    ['Longleftarrow', 'arrow.l.double.long'],
    ['Longrightarrow', 'arrow.r.double.long'],
    ['Longleftrightarrow', 'arrow.l.r.double.long'],
    ['longmapsto', 'arrow.r.bar'],
    ['hookrightarrow', 'arrow.r.hook'],
    ['rightharpoonup', 'harpoon.rt'],
    ['rightharpoondown', 'harpoon.rb'],
    ['iff', 'arrow.l.r.double.long'],
    ['implies', 'arrow.r.double.long'],
    ['uparrow', 'arrow.t'],
    ['downarrow', 'arrow.b'],
    ['updownarrow', 'arrow.t.b'],
    ['Uparrow', 'arrow.t.double'],
    ['Downarrow', 'arrow.b.double'],
    ['Updownarrow', 'arrow.t.b.double'],
    ['nearrow', 'arrow.tr'],
    ['searrow', 'arrow.br'],
    ['swarrow', 'arrow.bl'],
    ['nwarrow', 'arrow.tl'],
    ['leadsto', 'arrow.squiggly'],

    ['leftleftarrows', 'arrows.ll'],
    ['rightrightarrows', 'arrows.rr'],


    ['Cap', 'sect.double'], 
    ['Cup', 'union.double'], 
    ['Delta', 'Delta'], 
    ['Gamma', 'Gamma'], 
    ['Join', 'join'], 
    ['Lambda', 'Lambda'], 
    ['Leftarrow', 'arrow.l.double'],
    ['Leftrightarrow', 'arrow.l.r.double'],
    ['Longrightarrow', 'arrow.r.double.long'], 
    ['Omega', 'Omega'], 
    ['P', 'pilcrow'], 
    ['Phi', 'Phi'], 
    ['Pi', 'Pi'], 
    ['Psi', 'Psi'], 
    ['Rightarrow', 'arrow.r.double'], 
    ['S', 'section'], 
    ['Sigma', 'Sigma'], 
    ['Theta', 'Theta'], 
    ['aleph', 'alef'], 
    ['alpha', 'alpha'], 
    // ['amalg', 'product.co'], 
    ['angle', 'angle'], 
    ['approx', 'approx'], 
    ['approxeq', 'approx.eq'], 
    ['ast', 'ast'], 
    ['beta', 'beta'], 
    ['bigcap', 'sect.big'], 
    ['bigcirc', 'circle.big'], 
    ['bigcup', 'union.big'], 
    ['bigodot', 'dot.circle.big'], 
    ['bigoplus', 'xor.big'], // or "plus.circle.big"
    ['bigotimes', 'times.circle.big'], 
    ['bigsqcup', 'union.sq.big'], 
    ['bigtriangledown', 'triangle.b'], 
    ['bigtriangleup', 'triangle.t'], 
    ['biguplus', 'union.plus.big'], 
    ['bigvee', 'or.big'], 
    ['bigwedge', 'and.big'], 
    // ['bowtie', 'join'], 
    ['bullet', 'bullet'], 
    ['cap', 'sect'], 
    ['cdot', 'dot.op'],  // 'dot.op' or 'dot.c'
    ['cdots', 'dots.c'], 
    ['checkmark', 'checkmark'], 
    ['chi', 'chi'], 
    ['circ', 'circle.small'],  // 'circle.small' or 'compose'
    ['colon', 'colon'], 
    ['cong', 'tilde.equiv'], 
    ['coprod', 'product.co'], 
    ['copyright', 'copyright'], 
    ['cup', 'union'], 
    ['curlyvee', 'or.curly'], 
    ['curlywedge', 'and.curly'], 
    ['dagger', 'dagger'], 
    ['dashv', 'tack.l'], 
    ['ddagger', 'dagger.double'], 
    ['delta', 'delta'], 
    ['ddots', 'dots.down'], 
    ['diamond', 'diamond'], 
    ['div', 'div'], 
    ['divideontimes', 'times.div'], 
    ['dotplus', 'plus.dot'], 
    ['downarrow', 'arrow.b'], 
    ['ell', 'ell'], 
    ['emptyset', 'nothing'], 
    ['epsilon', 'epsilon.alt'], 
    ['equiv', 'equiv'], 
    ['eta', 'eta'], 
    ['exists', 'exists'], 
    ['forall', 'forall'], 
    // ['frown', 'paren.t'], 
    ['gamma', 'gamma'], 
    ['ge', 'gt.eq'], 
    ['geq', 'gt.eq'], 
    ['geqslant', 'gt.eq.slant'], 
    ['gg', 'gt.double'], 
    ['hbar', 'planck.reduce'], 
    ['imath', 'dotless.i'], 
    ['iiiint', 'intgral.quad'], 
    ['iiint', 'integral.triple'], 
    ['iint', 'integral.double'], 
    ['in', 'in'], 
    ['infty', 'infinity'],
    ['int', 'integral'], 
    ['intercal', 'top'],  // 'top' or 'tack.b'
    ['iota', 'iota'], 
    ['jmath', 'dotless.j'], 
    ['kappa', 'kappa'], 
    ['lambda', 'lambda'], 
    ['land', 'and'],
    ['langle', 'angle.l'], 
    ['lbrace', 'brace.l'], 
    ['lbrack', 'bracket.l'], 
    ['ldots', 'dots.l'], 
    ['le', 'lt.eq'], 
    ['leadsto', 'arrow.squiggly'], 
    ['leftarrow', 'arrow.l'], 
    ['leftthreetimes', 'times.three.l'], 
    ['leftrightarrow', 'arrow.l.r'], 
    ['leq', 'lt.eq'], 
    ['leqslant', 'lt.eq.slant'], 
    ['lhd', 'triangle.l'], 
    ['ll', 'lt.double'], 
    ['longmapsto', 'arrow.bar.long'], 
    ['longrightarrow', 'arrow.long'], 
    ['lor', 'or'],
    ['ltimes', 'times.l'], 
    ['mapsto', 'arrow.bar'], 
    ['measuredangle', 'angle.arc'], 
    ['mid', 'divides'], 
    ['models', 'models'], 
    ['mp', 'minus.plus'], 
    ['mu', 'mu'], 
    ['nRightarrow', 'arrow.double.not'], 
    ['nabla', 'nabla'], 
    ['ncong', 'tilde.nequiv'], 
    ['ne', 'eq.not'], 
    ['neg', 'not'], 
    ['neq', 'eq.not'], 
    ['nexists', 'exists.not'],
    ['ni', "in.rev"],
    ['nleftarrow', "arrow.l.not"],
    ['nleq', "lt.eq.not"],
    ['nparallel', "parallel.not"],
    ['ngeq', 'gt.eq.not'],
    ['nmid', 'divides.not'], 
    ['notin', 'in.not'], 
    ['nrightarrow', 'arrow.not'], 
    ['nsim', 'tilde.not'], 
    ['nsubseteq', 'subset.eq.not'],
    ['nu', 'nu'], 
    ['ntriangleleft', 'lt.tri.not'],
    ['ntriangleright', 'gt.tri.not'],
    ['nwarrow', 'arrow.tl'],
    ['odot', 'dot.circle'], 
    ['oint', 'integral.cont'], 
    ['oiint', 'integral.surf'],
    ['oiiint', 'integral.vol'],
    ['omega', 'omega'], 
    // ['omicron', 'omicron'], 
    ['ominus', 'minus.circle'], 
    ['oplus', 'xor'], // or 'plus.circle'
    ['otimes', 'times.circle'], 
    ['parallel', 'parallel'], 
    ['partial', 'diff'], 
    ['perp', 'perp'], 
    ['phi', 'phi.alt'], 
    ['pi', 'pi'], 
    ['pm', 'plus.minus'], 
    ['pounds', 'pound'], 
    ['prec', 'prec'], 
    ['preceq', 'prec.eq'], 
    ['prime', 'prime'], 
    ['prod', 'product'], 
    ['propto', 'prop'], 
    ['psi', 'psi'], 
    ['rangle', 'angle.r'], 
    ['rbrace', 'brace.r'], 
    ['rbrack', 'bracket.r'], 
    ['rhd', 'triangle'], 
    ['rho', 'rho'], 
    ['rightarrow', 'arrow.r'], 
    ['rightthreetimes', 'times.three.r'], 
    ['rtimes', 'times.r'], 
    ['setminus', 'without'], 
    ['sigma', 'sigma'], 
    ['sim', 'tilde'], 
    ['simeq', 'tilde.eq'], 
    ['slash', 'slash'], 
    ['smallsetminus', 'without'], 
    // ['smile', 'paren.b'], 
    ['spadesuit', 'suit.spade'],
    ['sqcap', 'sect.sq'], 
    ['sqcup', 'union.sq'], 
    ['sqsubseteq', 'subset.eq.sq'],
    ['sqsupseteq', 'supset.eq.sq'],
    ['star', 'star'], 
    ['subset', 'subset'], 
    ['subseteq', 'subset.eq'], 
    ['subsetneq', 'subset.neq'], 
    ['succ', 'succ'], 
    ['succeq', 'succ.eq'], 
    ['sum', 'sum'], 
    ['supset', 'supset'], 
    ['supseteq', 'supset.eq'], 
    ['supsetneq', 'supset.neq'], 
    ['swarrow', 'arrow.bl'], 
    ['tau', 'tau'], 
    ['theta', 'theta'], 
    ['times', 'times'], 
    ['to', 'arrow.r'], 
    ['top', 'top'], 
    ['triangle', 'triangle.t'], 
    ['triangledown', 'triangle.b.small'], 
    ['triangleleft', 'triangle.l.small'], 
    ['triangleright', 'triangle.r.small'], 
    ['twoheadrightarrow', 'arrow.r.twohead'], 
    ['uparrow', 'arrow.t'], 
    ['updownarrow', 'arrow.t.b'], 
    ['upharpoonright', 'harpoon.tr'], 
    ['uplus', 'union.plus'], 
    ['upsilon', 'upsilon'], 
    ['varepsilon', 'epsilon'], 
    ['varnothing', 'diameter'], // empty set
    ['varphi', 'phi'], 
    ['varpi', 'pi.alt'], 
    ['varrho', 'rho.alt'], 
    ['varsigma', 'sigma.alt'], 
    ['vartheta', 'theta.alt'], 
    ['vdash', 'tack.r'], 
    ['vdots', 'dots.v'], 
    ['vee', 'or'], 
    ['wedge', 'and'], 
    ['wr', 'wreath'], 
    ['xi', 'xi'], 
    ['yen', 'yen'], 
    ['zeta', 'zeta'], 

    // extended
    ['mathscr', 'scr'],
    ['LaTeX', '#LaTeX'],
    ['TeX', '#TeX'],
]);
