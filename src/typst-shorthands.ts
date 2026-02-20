const shorthandMap = new Map<string, string>([
    // The following snippet is generated with tools/make-short-hand-map.py
    ['arrow.l.r.double.long', '<==>'],
    ['arrow.l.r.long', '<-->'],
    ['arrow.r.bar', '|->'],
    ['arrow.r.double.bar', '|=>'],
    ['arrow.r.double.long', '==>'],
    ['arrow.r.long', '-->'],
    ['arrow.r.long.squiggly', '~~>'],
    ['arrow.r.tail', '>->'],
    ['arrow.r.twohead', '->>'],
    ['arrow.l.double.long', '<=='],
    ['arrow.l.long', '<--'],
    ['arrow.l.long.squiggly', '<~~'],
    ['arrow.l.tail', '<-<'],
    ['arrow.l.twohead', '<<-'],
    ['arrow.l.r.double', '<=>'],
    ['colon.double.eq', '::='],
    ['dots.h', '...'],
    ['gt.triple', '>>>'],
    ['lt.triple', '<<<'],
    ['arrow.l.r', '<->'], // Typst's documentation doesn't include this. Wondering why
    ['arrow.r', '->'],
    ['arrow.r.double', '=>'],
    ['arrow.r.squiggly', '~>'],
    ['arrow.l', '<-'],
    ['arrow.l.squiggly', '<~'],
    ['bar.v.double', '||'],
    ['bracket.l.stroked', '[|'],
    ['bracket.r.stroked', '|]'],
    ['colon.eq', ':='],
    ['eq.colon', '=:'],
    ['eq.not', '!='],
    ['gt.double', '>>'],
    ['gt.eq', '>='],
    ['lt.double', '<<'],
    ['lt.eq', '<='],
    ['ast.op', '*'],
    ['minus', '-'],
    ['tilde.op', '~'],

]);


const reverseShorthandMap = new Map<string, string>();
for (const [key, value] of shorthandMap.entries()) {
    // filter out single character values ('-', '~', '*')
    if(value.length > 1) {
        reverseShorthandMap.set(value, key);
    }
}

export { shorthandMap, reverseShorthandMap };
