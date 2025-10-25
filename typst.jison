%{
import { TypstNode, TypstTokenType, TypstToken,
    TypstTerminal } from "./typst-types";

%}

%lex


%%
\s+              /* skip whitespace */
[0-9]+("."[0-9]+)?\b  return 'NUMBER';
"*"        return '*';
"/"        return '/';
"+"        return '+';
"-"        return '-';
"_"        return '_';
"^"        return '^';
\".*\"     return 'TEXT';
[a-z^A-Z_]+  return 'SYMBOL';
<<EOF>>               return 'EOF';
.                     return 'INVALID';

/lex

%token NUMBER
%token IDENTIFIER


%left '+' '-'
%left '*' '/'

%start typinput

%% /* language grammar */

typinput
    : expression EOF { return $1; }
    ;

expression
    : terminal
    | supsub
    | funcCall
    | fraction
    ;

terminal
    : ELEMENT { $$ = new TypstTerminal(new TypstToken(TypstTokenType.ELEMENT, $1)); }
    | SYMBOL { $$ = new TypstTerminal(new TypstToken(TypstTokenType.SYMBOL, $1)); }
    | TEXT { $$ = new TypstTerminal(new TypstToken(TypstTokenType.TEXT, $1)); }
    ;

supsub
    : expression '_' expression { $$ = new TypstSupsub({ base: $1, sub: $2 }); }
    | expression '^' expression { $$ = new TypstSupsub({ base: $1, sup: $2 }); }
    | expression '_' expression '^' expression { $$ = new TypstSupsub({ base: $1, sub: $2, sup: $3 }); }
    ;

funcCall
    : SYMBOL '(' expression ')' { $$ = new TypstFuncCall([$1]); }
    ;

fraction
    : expression '/' expression { $$ = new TypstFraction([$1, $3]); }
    ;
