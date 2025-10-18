%lex

%%
\s+              /* skip whitespace */
[0-9]+("."[0-9]+)?\b  return 'NUMBER';
"*"        return '*';
"/"        return '/';
"+"        return '+';
"-"        return '-';
[a-zA-Z_]+  return 'IDENTIFIER';
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
    : IDENTIFIER { $$ = new TypstNode('IDENTIFIER', $1); }
    | NUMBER { $$ = new TypstNode('NUMBER', $1); }
    | expression '+' expression { $$ = new TypstNode('ADD', $2, [$1, $3]); }
    | expression '-' expression { $$ = new TypstNode('SUB', $2, [$1, $3]); }
    | expression '*' expression { $$ = new TypstNode('MUL', $2, [$1, $3]); }
    | expression '/' expression { $$ = new TypstNode('DIV', $2, [$1, $3]); }
    ;
