;; SPDX-License-Identifier: 0BSD
;; SPDX-FileCopyrightText: 2022 Tobias Frilling

(comment) @comment

(if (if_keyword) @conditional)
(elif (elif_keyword) @conditional)
(else (else_keyword) @conditional)

(while (while_keyword) @repeat)
(else (else_keyword) @repeat)
(for (for_keyword) @repeat)
(else (else_keyword) @repeat)

(try (try_keyword) @exception)
(catch (catch_keyword) @exception)
(else (else_keyword) @exception)
(finally (finally_keyword) @exception)

(import (use_keyword) @include)
(import (bareword) @string.special)

(wildcard ["*" "**" "?"] @string.special)

(command argument: (bareword) @parameter)
(command head: (identifier) @function)
((command head: (identifier) @keyword.return)
 (#eq? @keyword.return "return"))
((command (identifier) @keyword.operator)
 (#any-of? @keyword.operator "and" "or" "coalesce"))
((command head: _ @function)
 (#any-of? @function
  "+" "-" "*" "/" "%" "<" "<=""==" "!=" ">"
  ">=" "<s" "<=s" "==s" "!=s" ">s" ">=s"
))

(pipeline "|" @operator)
(redirection [">" "<" ">>" "<>"] @operator)

(io_port) @number

(function_definition
  (fn_keyword) @keyword.function
  (identifier) @function)

(parameter_list) @parameter
(parameter_list "|" @punctuation.bracket)

(variable_declaration
  (var_keyword) @keyword
  (lhs (identifier) @variable))

(variable_assignment
  (set_keyword) @keyword
  (lhs (identifier) @variable))

(temporary_assignment
  (tmp_keyword) @keyword
  (lhs (identifier) @variable))

(variable_deletion
  (del_keyword) @keyword
  (identifier) @variable)


(number) @number
(string) @string

(variable (identifier) @variable)
((variable (identifier) @function)
  (#match? @function ".+\\~$"))
((variable (identifier) @boolean)
 (#any-of? @boolean "true" "false"))
((variable (identifier) @constant.builtin)
 (#any-of? @constant.builtin
  "_" "after-chdir" "args" "before-chdir" "buildinfo" "nil"
  "notify-bg-job-success" "num-bg-jobs" "ok" "paths" "pid"
  "pwd" "value-out-indicator" "version"))

["$" "@"] @punctuation.special
["(" ")" "[" "]" "{" "}"] @punctuation.bracket
";" @punctuation.delimiter
