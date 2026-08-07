(function () {
  "use strict";

  function options(items) {
    return items.map(function (item) { return { value: item[0], label: item[1] }; });
  }

  function feedback(explanation) {
    return { correct: explanation, incorrect: explanation };
  }

  function single(id, prompt, items, answer, explanation, skill, extra) {
    return Object.assign({
      id: id,
      type: "single",
      skill: skill,
      prompt: prompt,
      options: options(items),
      answer: answer,
      feedback: feedback(explanation)
    }, extra || {});
  }

  function languageQuestion(id, type, skill, prompt, explanation, languages, extra) {
    return Object.assign({
      id: id,
      type: type,
      skill: skill,
      prompt: prompt,
      feedback: feedback(explanation),
      languages: languages
    }, extra || {});
  }

  function matching(id, prompt, rows, items, answer, explanation, skill) {
    return {
      id: id,
      type: "matching",
      skill: skill,
      prompt: prompt,
      rows: rows,
      options: options(items),
      answer: answer,
      feedback: feedback(explanation)
    };
  }

  window.FoundationActivityData = {
    id: "foundations-programming-diagnostic",
    version: "2.0.0",
    title: "Programming Diagnostic",
    requiresProgrammingLanguage: true,
    supportedProgrammingLanguages: ["python", "javascript", "csharp"],
    resultIntro: "This diagnostic shows what you remembered today. Use the topic and skill indicators to choose what to practise next.",
    sections: [
      {
        id: "variables",
        title: "Variables",
        intro: "Trace stored values, use meaningful identifiers and write a simple assignment in your chosen language.",
        questions: [
          single(
            "FOUND-PROG-VAR-001",
            "What does an assignment statement do?",
            [["store", "Stores a value under a variable name"], ["compare", "Compares two values"], ["display", "Always displays a value"], ["type", "Changes a value's data type"]],
            "store",
            "Assignment stores a value under a variable name so the program can use or update it later.",
            "knowledge"
          ),
          languageQuestion(
            "FOUND-PROG-VAR-002",
            "predict-output",
            "code-reading",
            "What value is output?",
            "The value starts at 5 and has 3 added twice, so the program outputs 11.",
            {
              python: { code: "points = 5\nbonus = 3\npoints = points + bonus\npoints = points + bonus\nprint(points)", answers: ["11"] },
              javascript: { code: "let points = 5;\nconst bonus = 3;\npoints = points + bonus;\npoints = points + bonus;\nconsole.log(points);", answers: ["11"] },
              csharp: { code: "int points = 5;\nint bonus = 3;\npoints = points + bonus;\npoints = points + bonus;\nConsole.WriteLine(points);", answers: ["11"] }
            },
            { hints: ["Trace the value after each assignment."] }
          ),
          languageQuestion(
            "FOUND-PROG-VAR-003",
            "code-editor",
            "coding-debugging",
            "Create a variable called score and give it the whole-number value 10.",
            "The declaration creates score and assigns the integer value 10 using the selected language's normal syntax.",
            {
              python: {
                starterCode: "# Create the variable below\n",
                accepted: ["score = 10", "# Create the variable below\nscore = 10"],
                rules: { required: [{ pattern: "^\\s*score\\s*=\\s*10\\s*$", flags: "m" }] },
                feedback: feedback("Python creates this variable with score = 10; it does not require a type keyword or semicolon.")
              },
              javascript: {
                starterCode: "// Create the variable below\n",
                accepted: ["let score = 10;", "const score = 10;"],
                rules: { required: [{ pattern: "(?:let|const)\\s+score\\s*=\\s*10\\s*;?", flags: "m" }] },
                feedback: feedback("JavaScript declares the variable with let or const, then assigns the value 10.")
              },
              csharp: {
                starterCode: "// Create the variable below\n",
                accepted: ["int score = 10;"],
                rules: { required: [{ pattern: "int\\s+score\\s*=\\s*10\\s*;", flags: "m" }] },
                feedback: feedback("C# declares the whole-number type explicitly: int score = 10;.")
              }
            },
            { editorRows: 5, hints: ["Use the normal whole-number declaration for your chosen language."] }
          ),
          matching(
            "FOUND-PROG-VAR-004",
            "Match each value to the most suitable conceptual data type.",
            [{ id: "name", label: "\"Amina\"" }, { id: "attempts", label: "3" }, { id: "price", label: "12.50" }, { id: "active", label: "true" }],
            [["text", "String/Text"], ["integer", "Integer"], ["decimal", "Decimal"], ["boolean", "Boolean"]],
            { name: "text", attempts: "integer", price: "decimal", active: "boolean" },
            "Text stores characters, integers store whole numbers, decimals store fractional numbers and Booleans store true or false.",
            "knowledge"
          ),
          languageQuestion(
            "FOUND-PROG-VAR-005",
            "code-gap",
            "coding-debugging",
            "Complete the update so that lives becomes 2 before it is output.",
            "Subtracting 1 from the current value 3 updates lives to 2.",
            {
              python: { beforeGap: "lives = 3\nlives = lives ", afterGap: " 1\nprint(lives)", answers: ["-"] },
              javascript: { beforeGap: "let lives = 3;\nlives = lives ", afterGap: " 1;\nconsole.log(lives);", answers: ["-"] },
              csharp: { beforeGap: "int lives = 3;\nlives = lives ", afterGap: " 1;\nConsole.WriteLine(lives);", answers: ["-"] }
            },
            { gapWidth: 5, hints: ["Choose the arithmetic operator that decreases a value."] }
          )
        ]
      },
      {
        id: "selection",
        title: "Selection",
        intro: "Use Boolean conditions to predict, complete and debug branches in your chosen language.",
        questions: [
          single(
            "FOUND-PROG-SEL-001",
            "Which condition is true when age is 18?",
            [["lt", "age < 18"], ["gte", "age >= 18"], ["neq", "age != 18"], ["gt", "age > 18"]],
            "gte",
            "The >= operator means greater than or equal to, so it includes the value 18.",
            "knowledge"
          ),
          languageQuestion(
            "FOUND-PROG-SEL-002",
            "predict-output",
            "code-reading",
            "Which word is output?",
            "72 is below 80 but at least 60, so the middle branch outputs Silver.",
            {
              python: { code: "score = 72\nif score >= 80:\n    print(\"Gold\")\nelif score >= 60:\n    print(\"Silver\")\nelse:\n    print(\"Bronze\")", answers: ["Silver"], caseSensitive: false },
              javascript: { code: "const score = 72;\nif (score >= 80) {\n    console.log(\"Gold\");\n} else if (score >= 60) {\n    console.log(\"Silver\");\n} else {\n    console.log(\"Bronze\");\n}", answers: ["Silver"], caseSensitive: false },
              csharp: { code: "int score = 72;\nif (score >= 80)\n{\n    Console.WriteLine(\"Gold\");\n}\nelse if (score >= 60)\n{\n    Console.WriteLine(\"Silver\");\n}\nelse\n{\n    Console.WriteLine(\"Bronze\");\n}", answers: ["Silver"], caseSensitive: false }
            },
            { hints: ["Check the conditions from top to bottom and stop at the first true one."] }
          ),
          languageQuestion(
            "FOUND-PROG-SEL-003",
            "code-gap",
            "coding-debugging",
            "Complete the condition so Adult is output when age is 18 or above.",
            "The >= operator includes 18 and every value above 18.",
            {
              python: { beforeGap: "age = 18\nif age ", afterGap: " 18:\n    print(\"Adult\")", answers: [">="] },
              javascript: { beforeGap: "const age = 18;\nif (age ", afterGap: " 18) {\n    console.log(\"Adult\");\n}", answers: [">="] },
              csharp: { beforeGap: "int age = 18;\nif (age ", afterGap: " 18)\n{\n    Console.WriteLine(\"Adult\");\n}", answers: [">="] }
            },
            { gapWidth: 5, hints: ["The boundary value 18 must be included."] }
          ),
          languageQuestion(
            "FOUND-PROG-SEL-004",
            "line-select",
            "coding-debugging",
            "Select the line containing the faulty comparison.",
            "The condition must compare age with 18. A single equals sign performs assignment rather than equality comparison.",
            {
              python: { code: "age = 18\nif age = 18:\n    print(\"Adult\")", answer: "2", feedback: feedback("Python uses == to compare values; = assigns a value, so line 2 must use age == 18.") },
              javascript: { code: "let age = 18;\nif (age = 18) {\n    console.log(\"Adult\");\n}", answer: "2", feedback: feedback("JavaScript line 2 assigns 18 to age. Use === for the intended strict equality comparison.") },
              csharp: { code: "int age = 18;\nif (age = 18)\n{\n    Console.WriteLine(\"Adult\");\n}", answer: "2", feedback: feedback("C# uses == for equality. Line 2 assigns an integer instead of producing a Boolean condition.") }
            },
            { hints: ["Look closely at the operator in the condition."] }
          ),
          languageQuestion(
            "FOUND-PROG-SEL-005",
            "code-editor",
            "coding-debugging",
            "Complete the program with a branch that outputs Adult when age is 18 or above.",
            "A correct branch compares age with the inclusive boundary and outputs Adult inside that branch.",
            {
              python: {
                starterCode: "age = 18\n\n# Add the if statement below\n",
                rules: { required: [{ pattern: "if\\s+age\\s*>=\\s*18\\s*:", flags: "m" }, { pattern: "print\\s*\\(\\s*[\"']Adult[\"']\\s*\\)", flags: "m" }], prohibited: [{ pattern: "age\\s*>\\s*18", flags: "m" }] },
                feedback: feedback("Python uses an indented block after if age >= 18: and print(\"Adult\") for the output.")
              },
              javascript: {
                starterCode: "const age = 18;\n\n// Add the if statement below\n",
                rules: { required: [{ pattern: "if\\s*\\(\\s*age\\s*>=\\s*18\\s*\\)", flags: "m" }, { pattern: "console\\.log\\s*\\(\\s*[\"']Adult[\"']\\s*\\)", flags: "m" }], prohibited: [{ pattern: "age\\s*>\\s*18", flags: "m" }] },
                feedback: feedback("JavaScript places the condition in parentheses and uses console.log(\"Adult\") inside the branch.")
              },
              csharp: {
                starterCode: "int age = 18;\n\n// Add the if statement below\n",
                rules: { required: [{ pattern: "if\\s*\\(\\s*age\\s*>=\\s*18\\s*\\)", flags: "m" }, { pattern: "Console\\.WriteLine\\s*\\(\\s*[\"']Adult[\"']\\s*\\)", flags: "m" }], prohibited: [{ pattern: "age\\s*>\\s*18", flags: "m" }] },
                feedback: feedback("C# places the condition in parentheses and uses Console.WriteLine(\"Adult\"); inside the branch.")
              }
            },
            { editorRows: 8, hints: ["Use an inclusive comparison.", "Remember the block syntax and output command for your language."] }
          )
        ]
      },
      {
        id: "iteration",
        title: "Iteration",
        intro: "Trace loops, complete boundaries and order a condition-controlled loop safely.",
        questions: [
          single(
            "FOUND-PROG-ITER-001",
            "Why is iteration useful?",
            [["repeat", "It repeats instructions under a defined condition"], ["store", "It permanently stores data"], ["choose", "It always chooses between two branches"], ["design", "It draws an interface automatically"]],
            "repeat",
            "A loop repeats instructions while a condition holds or for a controlled number of times.",
            "knowledge"
          ),
          languageQuestion(
            "FOUND-PROG-ITER-002",
            "predict-output",
            "code-reading",
            "How many times is Tick output?",
            "The loop uses counter values 0, 1, 2, 3 and 4, so Tick is output five times.",
            {
              python: { code: "for counter in range(5):\n    print(\"Tick\")", answers: ["5", "five"], caseSensitive: false },
              javascript: { code: "for (let counter = 0; counter < 5; counter++) {\n    console.log(\"Tick\");\n}", answers: ["5", "five"], caseSensitive: false },
              csharp: { code: "for (int counter = 0; counter < 5; counter++)\n{\n    Console.WriteLine(\"Tick\");\n}", answers: ["5", "five"], caseSensitive: false }
            },
            { hints: ["List the values taken by counter before the stopping boundary."] }
          ),
          languageQuestion(
            "FOUND-PROG-ITER-003",
            "code-gap",
            "coding-debugging",
            "Complete the loop so it outputs the numbers 1 to 5.",
            "The loop starts at 1 and includes 5 without continuing to 6.",
            {
              python: { beforeGap: "for number in ", afterGap: ":\n    print(number)", answers: ["range(1, 6)", "range(1,6)"], gapWidth: 14, feedback: feedback("Python range stops before its second value, so range(1, 6) produces 1 to 5.") },
              javascript: { beforeGap: "for (let number = 1; ", afterGap: "; number++) {\n    console.log(number);\n}", answers: ["number <= 5", "number<=5"], gapWidth: 14, feedback: feedback("JavaScript must keep looping while number <= 5 so that the boundary value is included.") },
              csharp: { beforeGap: "for (int number = 1; ", afterGap: "; number++)\n{\n    Console.WriteLine(number);\n}", answers: ["number <= 5", "number<=5"], gapWidth: 14, feedback: feedback("C# must keep looping while number <= 5 so that the boundary value is included.") }
            },
            { hints: ["The loop should include 5 and then stop."] }
          ),
          languageQuestion(
            "FOUND-PROG-ITER-004",
            "line-select",
            "coding-debugging",
            "Select the line that causes an out-of-range access.",
            "The loop creates one index beyond the final valid position in the three-item collection.",
            {
              python: { code: "scores = [4, 7, 9]\nfor index in range(len(scores) + 1):\n    print(scores[index])", answer: "2", feedback: feedback("Python range(len(scores) + 1) includes index 3. Remove + 1 so the final index is 2.") },
              javascript: { code: "const scores = [4, 7, 9];\nfor (let index = 0; index <= scores.length; index++) {\n    console.log(scores[index]);\n}", answer: "2", feedback: feedback("JavaScript uses indexes 0 to length - 1. Change <= to < on line 2.") },
              csharp: { code: "int[] scores = { 4, 7, 9 };\nfor (int index = 0; index <= scores.Length; index++)\n{\n    Console.WriteLine(scores[index]);\n}", answer: "2", feedback: feedback("C# array indexes end at Length - 1. Change <= to < on line 2.") }
            },
            { hints: ["Compare the final index produced by the loop with the collection length."] }
          ),
          languageQuestion(
            "FOUND-PROG-ITER-005",
            "code-order",
            "coding-debugging",
            "Reorder the code so it outputs 1, 2 and 3, then stops.",
            "A working loop initialises the counter, checks the boundary, outputs the value and then updates the counter.",
            {
              python: { items: [{ id: "initialise", code: "count = 1", label: "initialise count" }, { id: "check", code: "while count <= 3:", label: "check count" }, { id: "output", code: "    print(count)", label: "output count" }, { id: "update", code: "    count += 1", label: "update count" }], initialOrder: ["update", "output", "check", "initialise"] },
              javascript: { items: [{ id: "initialise", code: "let count = 1;", label: "initialise count" }, { id: "check", code: "while (count <= 3) {", label: "check count" }, { id: "output", code: "    console.log(count);", label: "output count" }, { id: "update", code: "    count += 1;\n}", label: "update count and close loop" }], initialOrder: ["update", "output", "check", "initialise"] },
              csharp: { items: [{ id: "initialise", code: "int count = 1;", label: "initialise count" }, { id: "check", code: "while (count <= 3)\n{", label: "check count" }, { id: "output", code: "    Console.WriteLine(count);", label: "output count" }, { id: "update", code: "    count += 1;\n}", label: "update count and close loop" }], initialOrder: ["update", "output", "check", "initialise"] }
            },
            { answer: ["initialise", "check", "output", "update"], hints: ["Initialisation happens before the loop condition is checked.", "The counter must change after each output."] }
          )
        ]
      },
      {
        id: "functions",
        title: "Functions",
        intro: "Connect parameters and return values, then complete and write a small reusable function.",
        questions: [
          single(
            "FOUND-PROG-FUNC-001",
            "What is a main benefit of placing a repeated calculation in a function?",
            [["reuse", "It can be named, reused and tested separately"], ["speed", "It is guaranteed to run faster"], ["storage", "It permanently stores every result"], ["input", "It removes the need for inputs"]],
            "reuse",
            "A named function decomposes a program into a reusable unit that can be understood and tested separately.",
            "knowledge"
          ),
          matching(
            "FOUND-PROG-FUNC-002",
            "Match each function term to its meaning.",
            [{ id: "parameter", label: "A named input in a function definition" }, { id: "argument", label: "A value supplied when a function is called" }, { id: "return", label: "A value sent back to the caller" }],
            [["parameter", "Parameter"], ["argument", "Argument"], ["return", "Return value"]],
            { parameter: "parameter", argument: "argument", return: "return" },
            "A parameter names an expected input, an argument is the supplied value, and a return value is sent back to the caller.",
            "knowledge"
          ),
          languageQuestion(
            "FOUND-PROG-FUNC-003",
            "predict-output",
            "code-reading",
            "What value is output?",
            "The function receives 4 and 6, adds them and returns 10 to the caller.",
            {
              python: { code: "def add(first, second):\n    return first + second\n\ntotal = add(4, 6)\nprint(total)", answers: ["10"] },
              javascript: { code: "function add(first, second) {\n    return first + second;\n}\n\nconst total = add(4, 6);\nconsole.log(total);", answers: ["10"] },
              csharp: { code: "static int Add(int first, int second)\n{\n    return first + second;\n}\n\nint total = Add(4, 6);\nConsole.WriteLine(total);", answers: ["10"] }
            },
            { hints: ["Substitute each argument into its corresponding parameter."] }
          ),
          languageQuestion(
            "FOUND-PROG-FUNC-004",
            "code-gap",
            "coding-debugging",
            "Complete the function so it returns the square of number.",
            "Returning number multiplied by itself gives the square to the caller.",
            {
              python: { beforeGap: "def square(number):\n    ", afterGap: "", answers: ["return number * number", "return number*number"], gapWidth: 25 },
              javascript: { beforeGap: "function square(number) {\n    ", afterGap: "\n}", answers: ["return number * number;", "return number * number", "return number*number;"], gapWidth: 27 },
              csharp: { beforeGap: "static int Square(int number)\n{\n    ", afterGap: "\n}", answers: ["return number * number;", "return number*number;"], gapWidth: 27 }
            },
            { hints: ["The caller needs the calculated value, not just a displayed value."] }
          ),
          languageQuestion(
            "FOUND-PROG-FUNC-005",
            "code-editor",
            "coding-debugging",
            "Write a function called double_number/DoubleNumber that returns twice its supplied whole number.",
            "The function accepts one number and returns that number multiplied by 2.",
            {
              python: { starterCode: "# Define double_number below\n", rules: { required: [{ pattern: "def\\s+double_number\\s*\\(\\s*number\\s*\\)\\s*:", flags: "m" }, { pattern: "return\\s+number\\s*\\*\\s*2", flags: "m" }] }, feedback: feedback("Python defines double_number(number) with a colon and returns number * 2 from an indented body.") },
              javascript: { starterCode: "// Define doubleNumber below\n", rules: { required: [{ pattern: "function\\s+doubleNumber\\s*\\(\\s*number\\s*\\)", flags: "m" }, { pattern: "return\\s+number\\s*\\*\\s*2\\s*;?", flags: "m" }] }, feedback: feedback("JavaScript defines doubleNumber(number) and returns number * 2 from inside its braces.") },
              csharp: { starterCode: "// Define DoubleNumber below\n", rules: { required: [{ pattern: "static\\s+int\\s+DoubleNumber\\s*\\(\\s*int\\s+number\\s*\\)", flags: "m" }, { pattern: "return\\s+number\\s*\\*\\s*2\\s*;", flags: "m" }] }, feedback: feedback("C# declares static int DoubleNumber(int number) and returns an integer on every valid path.") }
            },
            { editorRows: 8, hints: ["Use one parameter called number.", "Return the calculation rather than only displaying it."] }
          )
        ]
      },
      {
        id: "arrays-lists",
        title: "Arrays/Lists",
        intro: "Read, update, create and safely iterate through an indexed collection.",
        questions: [
          single(
            "FOUND-PROG-LIST-001",
            "When is an array/list more suitable than separate variables?",
            [["collection", "When storing related values such as weekly scores"], ["single", "When storing one fixed course title"], ["boolean", "Only when storing true or false"], ["database", "Only when a database is unavailable"]],
            "collection",
            "Arrays and lists keep related values together and allow the same processing across the collection.",
            "knowledge"
          ),
          languageQuestion(
            "FOUND-PROG-LIST-002",
            "predict-output",
            "code-reading",
            "Which colour is output?",
            "Zero-based indexing makes red index 0 and green index 1.",
            {
              python: { code: "colours = [\"red\", \"green\", \"blue\"]\nprint(colours[1])", answers: ["green"], caseSensitive: false },
              javascript: { code: "const colours = [\"red\", \"green\", \"blue\"];\nconsole.log(colours[1]);", answers: ["green"], caseSensitive: false },
              csharp: { code: "string[] colours = { \"red\", \"green\", \"blue\" };\nConsole.WriteLine(colours[1]);", answers: ["green"], caseSensitive: false }
            },
            { hints: ["The first item is at index 0."] }
          ),
          languageQuestion(
            "FOUND-PROG-LIST-003",
            "code-gap",
            "coding-debugging",
            "Complete the index so the second score changes from 6 to 10.",
            "The second item in a zero-indexed collection is at index 1.",
            {
              python: { beforeGap: "scores = [4, 6, 8]\nscores[", afterGap: "] = 10", answers: ["1"] },
              javascript: { beforeGap: "const scores = [4, 6, 8];\nscores[", afterGap: "] = 10;", answers: ["1"] },
              csharp: { beforeGap: "int[] scores = { 4, 6, 8 };\nscores[", afterGap: "] = 10;", answers: ["1"] }
            },
            { gapWidth: 5, hints: ["Collection indexes start at 0."] }
          ),
          languageQuestion(
            "FOUND-PROG-LIST-004",
            "code-editor",
            "coding-debugging",
            "Create a collection called students containing Aisha, Ben and Chloe in that order.",
            "The collection declaration stores the three text values in the requested order.",
            {
              python: { starterCode: "# Create the list below\n", rules: { required: [{ pattern: "students\\s*=\\s*\\[\\s*[\"']Aisha[\"']\\s*,\\s*[\"']Ben[\"']\\s*,\\s*[\"']Chloe[\"']\\s*\\]", flags: "m" }] }, feedback: feedback("Python uses a list literal such as students = [\"Aisha\", \"Ben\", \"Chloe\"].") },
              javascript: { starterCode: "// Create the array below\n", rules: { required: [{ pattern: "(?:const|let)\\s+students\\s*=\\s*\\[\\s*[\"']Aisha[\"']\\s*,\\s*[\"']Ben[\"']\\s*,\\s*[\"']Chloe[\"']\\s*\\]\\s*;?", flags: "m" }] }, feedback: feedback("JavaScript uses an array literal declared with const or let and keeps the requested item order.") },
              csharp: { starterCode: "// Create the array below\n", rules: { required: [{ pattern: "string\\s*\\[\\s*\\]\\s+students\\s*=\\s*\\{\\s*\"Aisha\"\\s*,\\s*\"Ben\"\\s*,\\s*\"Chloe\"\\s*\\}\\s*;", flags: "m" }] }, feedback: feedback("C# declares the element type and array: string[] students = { \"Aisha\", \"Ben\", \"Chloe\" };.") }
            },
            { editorRows: 6, hints: ["Use the collection literal syntax for your language."] }
          ),
          languageQuestion(
            "FOUND-PROG-LIST-005",
            "line-select",
            "coding-debugging",
            "Select the loop line that accesses one position beyond the final item.",
            "A collection of length 3 has valid indexes 0, 1 and 2, so the loop boundary must exclude 3.",
            {
              python: { code: "names = [\"Ari\", \"Bo\", \"Chen\"]\nfor index in range(len(names) + 1):\n    print(names[index])", answer: "2", feedback: feedback("Python should use range(len(names)); adding 1 produces the invalid index 3.") },
              javascript: { code: "const names = [\"Ari\", \"Bo\", \"Chen\"];\nfor (let index = 0; index <= names.length; index++) {\n    console.log(names[index]);\n}", answer: "2", feedback: feedback("JavaScript should use index < names.length because the final valid index is length - 1.") },
              csharp: { code: "string[] names = { \"Ari\", \"Bo\", \"Chen\" };\nfor (int index = 0; index <= names.Length; index++)\n{\n    Console.WriteLine(names[index]);\n}", answer: "2", feedback: feedback("C# should use index < names.Length because the final valid index is Length - 1.") }
            },
            { hints: ["Compare the loop's largest index with length minus one."] }
          )
        ]
      },
      {
        id: "debugging",
        title: "Debugging",
        intro: "Identify faulty lines and edit small programs to correct syntax and logic errors.",
        questions: [
          languageQuestion(
            "FOUND-PROG-DEBUG-001",
            "line-select",
            "coding-debugging",
            "Select the line containing the faulty equality comparison.",
            "The faulty line assigns a value where the condition needs an equality comparison.",
            {
              python: { code: "age = 18\nif age = 18:\n    print(\"Adult\")", answer: "2", feedback: feedback("Python uses == to compare values. Replace = with == on line 2.") },
              javascript: { code: "let age = 18;\nif (age = 18) {\n    console.log(\"Adult\");\n}", answer: "2", feedback: feedback("JavaScript uses === for a strict comparison. Line 2 currently assigns 18 to age.") },
              csharp: { code: "int age = 18;\nif (age = 18)\n{\n    Console.WriteLine(\"Adult\");\n}", answer: "2", feedback: feedback("C# uses == for equality. Line 2 currently attempts an assignment instead of a Boolean comparison.") }
            },
            { hints: ["Assignment and equality use different operators."] }
          ),
          languageQuestion(
            "FOUND-PROG-DEBUG-002",
            "code-gap",
            "coding-debugging",
            "Fix the boundary so the discount applies to totals of 50 or more.",
            "The inclusive >= comparison applies the discount at 50 and above.",
            {
              python: { beforeGap: "total = 50\nif total ", afterGap: " 50:\n    discount = 5", answers: [">="] },
              javascript: { beforeGap: "const total = 50;\nif (total ", afterGap: " 50) {\n    const discount = 5;\n}", answers: [">="] },
              csharp: { beforeGap: "decimal total = 50m;\nif (total ", afterGap: " 50m)\n{\n    decimal discount = 5m;\n}", answers: [">="] }
            },
            { gapWidth: 5, hints: ["The value 50 itself must pass the condition."] }
          ),
          languageQuestion(
            "FOUND-PROG-DEBUG-003",
            "line-select",
            "coding-debugging",
            "Select the line that causes the collection boundary error.",
            "The loop must stop before the collection length because indexing starts at zero.",
            {
              python: { code: "names = [\"Ari\", \"Bo\", \"Chen\", \"Dia\"]\nfor index in range(5):\n    print(names[index])", answer: "2", feedback: feedback("Python should use range(len(names)) or range(4); range(5) also produces invalid index 4.") },
              javascript: { code: "const names = [\"Ari\", \"Bo\", \"Chen\", \"Dia\"];\nfor (let index = 0; index <= names.length; index++) {\n    console.log(names[index]);\n}", answer: "2", feedback: feedback("JavaScript should use index < names.length; <= includes invalid index 4.") },
              csharp: { code: "string[] names = { \"Ari\", \"Bo\", \"Chen\", \"Dia\" };\nfor (int index = 0; index <= names.Length; index++)\n{\n    Console.WriteLine(names[index]);\n}", answer: "2", feedback: feedback("C# should use index < names.Length; <= includes invalid index 4.") }
            },
            { hints: ["For four items, identify the final valid zero-based index."] }
          ),
          languageQuestion(
            "FOUND-PROG-DEBUG-004",
            "code-editor",
            "coding-debugging",
            "Correct the inconsistent variable name in the final calculation.",
            "Variable names must match exactly, including underscores and capital letters.",
            {
              python: { starterCode: "order_total = 12.50\ntax = 0.20\nfinal_total = orderTotal * (1 + tax)", rules: { required: [{ pattern: "final_total\\s*=\\s*order_total\\s*\\*", flags: "m" }], prohibited: [{ pattern: "orderTotal", flags: "m" }] }, feedback: feedback("Python's defined variable is order_total, so the final line must use that exact snake_case name.") },
              javascript: { starterCode: "const orderTotal = 12.50;\nconst tax = 0.20;\nconst finalTotal = order_total * (1 + tax);", rules: { required: [{ pattern: "finalTotal\\s*=\\s*orderTotal\\s*\\*", flags: "m" }], prohibited: [{ pattern: "order_total", flags: "m" }] }, feedback: feedback("JavaScript's defined variable is orderTotal, so the final line must use that exact camelCase name.") },
              csharp: { starterCode: "decimal orderTotal = 12.50m;\ndecimal tax = 0.20m;\ndecimal finalTotal = order_total * (1 + tax);", rules: { required: [{ pattern: "finalTotal\\s*=\\s*orderTotal\\s*\\*", flags: "m" }], prohibited: [{ pattern: "order_total", flags: "m" }] }, feedback: feedback("C#'s defined variable is orderTotal, so the final line must use that exact camelCase name.") }
            },
            { editorRows: 6, hints: ["Compare the spelling of the declared variable with its later use."] }
          ),
          languageQuestion(
            "FOUND-PROG-DEBUG-005",
            "code-editor",
            "coding-debugging",
            "Edit the function so it returns the calculated area to its caller.",
            "The function needs a return statement that sends the calculated area back to the caller.",
            {
              python: { starterCode: "def rectangle_area(width, height):\n    area = width * height", rules: { required: [{ pattern: "def\\s+rectangle_area\\s*\\(", flags: "m" }, { pattern: "\\n\\s+return\\s+area", flags: "m" }] }, feedback: feedback("Python needs an indented return area line after the calculation.") },
              javascript: { starterCode: "function rectangleArea(width, height) {\n    const area = width * height;\n}", rules: { required: [{ pattern: "function\\s+rectangleArea\\s*\\(", flags: "m" }, { pattern: "return\\s+area\\s*;?", flags: "m" }] }, feedback: feedback("JavaScript needs return area; inside the function before the closing brace.") },
              csharp: { starterCode: "static int RectangleArea(int width, int height)\n{\n    int area = width * height;\n}", rules: { required: [{ pattern: "static\\s+int\\s+RectangleArea\\s*\\(", flags: "m" }, { pattern: "return\\s+area\\s*;", flags: "m" }] }, feedback: feedback("C# declares an int return type, so the method needs return area; before its closing brace.") }
            },
            { editorRows: 8, hints: ["The calculation exists, but its value is not sent back."] }
          )
        ]
      },
      {
        id: "basic-sql",
        title: "Basic SQL",
        intro: "Complete and debug shared SQL statements without connecting to or changing a live database.",
        questions: [
          matching(
            "FOUND-PROG-SQL-001",
            "Match each relational database term to its meaning.",
            [{ id: "table", label: "A structured collection about one subject" }, { id: "record", label: "One complete row about an item" }, { id: "field", label: "One named column or attribute" }, { id: "pk", label: "A value that uniquely identifies each row" }],
            [["table", "Table"], ["record", "Record/row"], ["field", "Field/column"], ["pk", "Primary key"]],
            { table: "table", record: "record", field: "field", pk: "pk" },
            "Tables contain records, records contain fields, and a primary key uniquely identifies each record.",
            "knowledge"
          ),
          {
            id: "FOUND-PROG-SQL-002",
            type: "predict-output",
            skill: "code-reading",
            prompt: "Which first name is returned by this query?",
            code: "SELECT first_name\nFROM customers\nWHERE active = true;",
            answers: ["Amina"],
            caseSensitive: false,
            table: { caption: "customers table", headers: ["customer_id", "first_name", "membership_type", "active"], rows: [["C01", "Amina", "Standard", "true"], ["C02", "Leo", "Standard", "false"], ["C03", "Maya", "Premium", "false"]] },
            feedback: feedback("WHERE active = true keeps only C01, and SELECT first_name returns Amina."),
            languageLabel: "SQL",
            hints: ["Apply the WHERE filter before reading the selected field."]
          },
          {
            id: "FOUND-PROG-SQL-003",
            type: "code-gap",
            skill: "coding-debugging",
            prompt: "Complete the query so it returns only Premium customers.",
            beforeGap: "SELECT first_name\nFROM customers\n",
            afterGap: ";",
            answers: ["WHERE membership_type = 'Premium'", "where membership_type = 'Premium'"],
            caseSensitive: false,
            gapWidth: 36,
            feedback: feedback("A WHERE clause filters rows, and the text value Premium is written in quotes."),
            languageLabel: "SQL",
            hints: ["Use the membership_type field in a WHERE clause."]
          },
          {
            id: "FOUND-PROG-SQL-004",
            type: "code-order",
            skill: "coding-debugging",
            prompt: "Reorder the fragments to form a valid INSERT statement.",
            items: [
              { id: "insert", code: "INSERT INTO customers", label: "INSERT clause" },
              { id: "fields", code: "    (customer_id, first_name, active)", label: "field list" },
              { id: "values", code: "VALUES ('C04', 'Noah', true);", label: "VALUES clause" }
            ],
            initialOrder: ["values", "insert", "fields"],
            answer: ["insert", "fields", "values"],
            feedback: feedback("INSERT INTO names the table, the field list identifies the columns, and VALUES supplies the new row."),
            languageLabel: "SQL",
            hints: ["Start by naming the table that will receive the row."]
          },
          {
            id: "FOUND-PROG-SQL-005",
            type: "code-editor",
            skill: "coding-debugging",
            prompt: "Edit the statement so it updates only customer C02.",
            starterCode: "UPDATE customers\nSET active = true;",
            rules: { required: [{ pattern: "UPDATE\\s+customers", flags: "i" }, { pattern: "SET\\s+active\\s*=\\s*true", flags: "i" }, { pattern: "WHERE\\s+customer_id\\s*=\\s*['\"]C02['\"]", flags: "i" }] },
            feedback: feedback("WHERE customer_id = 'C02' limits the update to one known record; without it every row would change."),
            languageLabel: "SQL",
            editorRows: 6,
            hints: ["The existing statement lacks the clause that limits affected rows.", "Filter using the primary key customer_id."]
          }
        ]
      }
    ]
  };
})();
