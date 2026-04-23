// SPDX-License-Identifier: 0BSD
// SPDX-FileCopyrightText: 2022 Tobias Frilling

module.exports = grammar({
  name: 'elvish',

  extras: $ => [
    /\s/,
    $.comment,
    // Line continuation: ^ followed by \n or \r\n (spec §3.1)
    token(seq("^", /\r?\n/)),
  ],

  word: $ => $.identifier,

  inline: $ => [
    $._statement,
    $._expression,
    $._literal,
    $._string_like,
    $._terminator,
  ],

  rules: {
    source_file: $ => optional($._statements),

    comment: $ => token(seq('#', /.*/)),

    _statements: $ => prec(1, seq(
      repeat(seq(
        $._statement,
        $._terminator
      )),
      $._statement,
      optional($._terminator)
    )),

    _statement: $ => choice(
      $.command,
      $.if,
      $.while,
      $.for,
      $.try,
      $.import,
      $.function_definition,
      $.variable_declaration,
      $.variable_assignment,
      $.temporary_assignment,
      $.with_command,
      $.variable_deletion,
      $.and_command,
      $.or_command,
      $.coalesce_command,
      $.pragma,
      $.lambda,
      $.pipeline,
    ),

    _expression: $ => choice(
      $._literal,
      $.variable,
      $.output_capture,
      $.exception_capture,
      $.braced_list,
      $.indexing,
      $.lambda,
      $.wildcard
    ),

    _literal: $ => choice(
      $.number,
      $._string_like,
      $.list,
      $.map,
    ),

    _terminator: $ => choice(";", "\n"),

    identifier: $ => /[\p{L}\p{N}_:~-]+/,


    // ==========
    // Keyword aliases (named nodes for editor integration)
    // ==========
    // Control flow
    if_keyword:      $ => alias("if", $.if_keyword),
    elif_keyword:    $ => alias("elif", $.elif_keyword),
    else_keyword:    $ => alias("else", $.else_keyword),
    while_keyword:   $ => alias("while", $.while_keyword),
    for_keyword:     $ => alias("for", $.for_keyword),
    try_keyword:     $ => alias("try", $.try_keyword),
    catch_keyword:   $ => alias("catch", $.catch_keyword),
    finally_keyword: $ => alias("finally", $.finally_keyword),
    // Declarations
    fn_keyword:      $ => alias("fn", $.fn_keyword),
    var_keyword:     $ => alias("var", $.var_keyword),
    set_keyword:     $ => alias("set", $.set_keyword),
    tmp_keyword:     $ => alias("tmp", $.tmp_keyword),
    del_keyword:     $ => alias("del", $.del_keyword),
    // Other special commands
    use_keyword:     $ => alias("use", $.use_keyword),
    with_keyword:    $ => alias("with", $.with_keyword),
    and_keyword:     $ => alias("and", $.and_keyword),
    or_keyword:      $ => alias("or", $.or_keyword),
    coalesce_keyword:$ => alias("coalesce", $.coalesce_keyword),
    pragma_keyword:  $ => alias("pragma", $.pragma_keyword),
    // Operators (optional: enables tree-sitter highlighting without regex fallback)
    plus_op:         $ => alias("+", $.plus_op),
    minus_op:        $ => alias("-", $.minus_op),
    mul_op:          $ => alias("*", $.mul_op),
    div_op:          $ => alias("/", $.div_op),
    mod_op:          $ => alias("%", $.mod_op),
    lt_op:           $ => alias("<", $.lt_op),
    lte_op:          $ => alias("<=", $.lte_op),
    eq_op:           $ => alias("==", $.eq_op),
    neq_op:          $ => alias("!=", $.neq_op),
    gt_op:           $ => alias(">", $.gt_op),
    gte_op:          $ => alias(">=", $.gte_op),
    lt_s_op:         $ => alias("<s", $.lt_s_op),
    lte_s_op:        $ => alias("<=s", $.lte_s_op),
    eq_s_op:         $ => alias("==s", $.eq_s_op),
    neq_s_op:        $ => alias("!=s", $.neq_s_op),
    gt_s_op:         $ => alias(">s", $.gt_s_op),
    gte_s_op:        $ => alias(">=s", $.gte_s_op),


    // ==========
    // Statements
    // ==========

    import: $ => seq(
      $.use_keyword,
      $._string_like,
      optional($._string_like)
    ),

    command: $ => seq(
      field("head", choice(
        $.identifier,
        $.variable,
        $.output_capture,
        // Operators as named nodes (for tree-sitter highlighting)
        $.plus_op, $.minus_op, $.mul_op, $.div_op, $.mod_op,
        $.lt_op, $.lte_op, $.eq_op, $.neq_op, $.gt_op, $.gte_op,
        $.lt_s_op, $.lte_s_op, $.eq_s_op, $.neq_s_op, $.gt_s_op, $.gte_s_op
      )),
      repeat(field("argument", choice($._expression, $.option))),
      optional($.redirection),
      optional("&"),
    ),

    pipeline: $ => seq(
      repeat1(seq($.command, "|")),
      $.command
    ),

    redirection: $ => {
      const port = token(
        choice(/\d+/, "-", "stdin", "stdout", "stderr")
      )
      return seq(
        choice(
          ">", "<", ">>", "<>",
          // Why do I have to wrap this in a token?
          alias(token(
            seq(port, token.immediate(">"))
          ), $.io_port),
        ),
        choice(
          alias($.bareword, $.file),
          alias(token(seq(optional("&"), port)), $.io_port)
        )
      )
    },

    variable_declaration: $ => seq($.var_keyword, $._assignment),

    variable_assignment: $ => seq($.set_keyword, $._assignment),

    temporary_assignment: $ => seq($.tmp_keyword, $._assignment),

    // del supports plain names, quoted names, and element access (spec §8.5)
    // e.g.  del x      del 'a/b'      del m[k]      del l[0][k2]
    variable_deletion: $ => seq(
      $.del_keyword,
      repeat1(seq(
        choice($.identifier, $.string),
        repeat(seq(
          token.immediate("["),
          alias(repeat1($._expression), $.indices),
          "]"
        ))
      ))
    ),

    // lhs allows quoted variable names, e.g.  set 'a/b' = foo  (spec §8.2)
    _assignment: $ => seq(
      alias(repeat1(seq(
          optional("@"),
          choice($.identifier, $.string),
          repeat(seq(
            token.immediate("["),
            alias(repeat1($._expression), $.indices),
            "]"
          ))
        )),
        $.lhs
      ),
      optional(seq(
        "=",
        alias(repeat1($._expression), $.rhs)
      ))
    ),

    function_definition: $ => seq($.fn_keyword, $.identifier, $.lambda),

    if: $ => seq(
      $.if_keyword, field("condition", $._expression),
      "{", alias($._statements, $.chunk), "}",
      repeat($.elif),
      optional($.else),
    ),

    elif: $ => seq(
      $.elif_keyword, field("condition", $._expression),
      "{", alias($._statements, $.chunk), "}"
    ),

    else: $ => seq($.else_keyword, "{", alias($._statements, $.chunk), "}"),

    while: $ => seq(
      $.while_keyword, field("condition", $._expression),
      "{", alias($._statements, $.chunk), "}",
      optional($.else),
    ),

    for: $ => seq(
      $.for_keyword,
      field("var", $.identifier),
      field("container", $._expression),
      "{", alias($._statements, $.chunk), "}",
      optional($.else),
    ),

    try: $ => seq(
      $.try_keyword, "{", alias($._statements, $.chunk), "}",
      optional($.catch),
      optional($.else),
      optional($.finally),
    ),

    catch: $ => seq(
      $.catch_keyword, field("exception", $.identifier),
      "{", alias($._statements, $.chunk), "}"
    ),

    finally: $ => seq($.finally_keyword, "{", alias($._statements, $.chunk), "}"),

    // with: temporary assignment that restores values after running a lambda (spec §8.4)
    // Inline form:    with lhs = rhs { body }
    // Bracketed form: with [lhs = rhs] [lhs = rhs] ... { body }
    with_command: $ => seq(
      $.with_keyword,
      choice(
        // Inline: with x = value { body }
        seq(
          alias(repeat1(seq(
              optional("@"),
              choice($.identifier, $.string),
              repeat(seq(
                token.immediate("["),
                alias(repeat1($._expression), $.indices),
                "]"
              ))
            )),
            $.lhs
          ),
          "=",
          alias(repeat1($._expression), $.rhs),
        ),
        // Bracketed: with [x = value] [y = value] ... { body }
        repeat1(seq(
          "[",
          alias(repeat1(seq(
              optional("@"),
              choice($.identifier, $.string),
              repeat(seq(
                token.immediate("["),
                alias(repeat1($._expression), $.indices),
                "]"
              ))
            )),
            $.lhs
          ),
          "=",
          alias(repeat1($._expression), $.rhs),
          "]",
        )),
      ),
      $.lambda,
    ),

    // Logical short-circuit special commands (spec §8.6)
    and_command:      $ => seq($.and_keyword,      repeat($._expression)),
    or_command:       $ => seq($.or_keyword,       repeat($._expression)),
    coalesce_command: $ => seq($.coalesce_keyword, repeat($._expression)),

    // Compiler pragma (spec §8.12): pragma <name> <value>
    // e.g.  pragma unknown-command external
    pragma: $ => seq(
      $.pragma_keyword,
      field("name", $.bareword),
      field("value", $.bareword),
    ),


    // ===========
    // Expressions
    // ===========

    lambda: $ => seq(
      "{",
      choice(/\s+/, $.parameter_list),
      alias($._statements, $.chunk),
      "}"
    ),

    parameter_list: $ => seq(
      "|",
      repeat1(field(
        "parameter",
        choice(
          $.option,
          seq(optional("@"), $.identifier),
        )
      )),
      "|"
    ),

    // Options: &key or &key=value (spec §7.1: bare &key is equivalent to &key=$true)
    option: $ => seq(
      "&",
      field("key", $.identifier),
      optional(seq("=", field("value", $._expression)))
    ),

    indexing: $ => seq(
      choice(
        $.variable,
        $.list,
        $.map,
        $.output_capture,
      ),
      repeat1(seq(
        token.immediate("["),
        alias(repeat1($._expression), $.indices),
        "]"
      )),
    ),

    braced_list: $ => seq(
      "{", repeat($._expression), "}"
    ),

    output_capture: $ => seq(
      "(", alias($._statements, $.chunk), ")"
    ),

    exception_capture: $ => seq(
      "?(", alias($._statements, $.chunk), ")"
    ),

    // Variable use: $name  $@name  $"quoted"  $'quoted'  (spec §6.2)
    variable: $ => seq(
      "$",
      optional("@"),
      choice($.identifier, $.string)
    ),

    number: $ => {
      const decimal = /\d(_?\d)*/
      const integer = choice(
        decimal,
        seq(choice("0x", "0X"), /[\da-fA-F](_?[\da-fA-F])*/),
        seq(choice("0o", "0O"), /[0-7](_?[0-7])*/),
        seq(choice('0b', '0B'), /[0-1](_?[0-1])*/),
      )
      return token(seq(
        optional(choice("+", "-")),
        choice(
          integer,
          seq(integer, "/", integer),
          seq(
            choice(
              seq(decimal, optional("."), optional(decimal)),
              seq(".", decimal)
            ),
            optional(seq(/[eE][+-]?/, decimal))
          ),
          "Inf",
          "NaN"
        )
      ))
    },

    _string_like: $ => choice($.string, $.bareword),

    string: $ => token(choice(
      seq("'", /([^']|'')*/, "'"),
      seq('"', /([^"\\]|\\.)*/, '"')
    )),

    bareword: $ => /[\p{L}\p{N}!%+,./:@\\_~=-]+/,

    wildcard: $ => seq(
      choice("*", "**", "?"),
      repeat(seq(
        token.immediate("["),
        alias($._expression, $.modifier),
        "]"
      ))
    ),

    list: $ => seq("[", repeat($._expression), "]"),

    // Map literals (spec §4.4):
    //   [&]             empty map
    //   [&key=value]    standard pair
    //   [&key]          equivalent to [&key=$true]
    //   [&key=]         equivalent to [&key='']
    map: $ => seq(
      "[",
      choice(
        "&",             // [&] — bare ampersand signals empty map
        repeat1($.pair), // one or more key-value pairs
      ),
      "]"
    ),

    pair: $ => seq(
      "&",
      field("key", choice($.identifier, $.string)),
      optional(seq(
        "=",
        optional(field("value", $._expression))
      ))
    ),
  }
});
