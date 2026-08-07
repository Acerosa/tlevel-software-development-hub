(function () {
  "use strict";

  function options(items) {
    return items.map(function (item) { return { value: item[0], label: item[1] }; });
  }

  function feedback(explanation) {
    return { correct: explanation, incorrect: explanation };
  }

  function single(id, prompt, items, answer, explanation, extra) {
    return Object.assign({
      id: id,
      type: "single",
      prompt: prompt,
      options: options(items),
      answer: answer,
      feedback: feedback(explanation)
    }, extra || {});
  }

  function multiple(id, prompt, items, answer, explanation, extra) {
    return Object.assign({
      id: id,
      type: "multiple",
      prompt: prompt,
      options: options(items),
      answer: answer,
      feedback: feedback(explanation)
    }, extra || {});
  }

  window.FoundationActivityData = {
    id: "foundations-programming-diagnostic",
    version: "1.0.0",
    title: "Programming Diagnostic",
    resultIntro: "This diagnostic shows what you remembered today. Use the section indicators to choose where to practise next.",
    sections: [
      {
        id: "variables",
        title: "Variables",
        intro: "Trace stored values, choose suitable identifiers and connect values to transferable data-type concepts.",
        questions: [
          single(
            "FOUND-PROG-VAR-001",
            "What does the assignment statement score = 12 do?",
            [["store", "Stores the value 12 in a variable named score"], ["compare", "Checks whether score equals 12"], ["display", "Displays 12 on the screen"], ["type", "Changes score into a number"]],
            "store",
            "Assignment stores a value under a variable name so the program can use or update it later."
          ),
          single(
            "FOUND-PROG-VAR-002",
            "What value is displayed?",
            [["5", "5"], ["8", "8"], ["11", "11"], ["16", "16"]],
            "11",
            "points starts at 5, increases by 3 to 8, then increases by another 3 to 11.",
            { code: "points = 5\nbonus = 3\npoints = points + bonus\npoints = points + bonus\nDISPLAY points" }
          ),
          multiple(
            "FOUND-PROG-VAR-003",
            "Which two identifiers communicate their purpose clearly?",
            [["totalPrice", "totalPrice"], ["x", "x"], ["student_count", "student_count"], ["thing", "thing"]],
            ["totalPrice", "student_count"],
            "Meaningful identifiers such as totalPrice and student_count make the value's purpose clear to another developer."
          ),
          {
            id: "FOUND-PROG-VAR-004",
            type: "matching",
            prompt: "Match each value to the most suitable conceptual data type.",
            rows: [
              { id: "name", label: "\"Amina\"" },
              { id: "attempts", label: "3" },
              { id: "price", label: "12.50" },
              { id: "active", label: "true" }
            ],
            options: options([["text", "String/Text"], ["integer", "Integer"], ["decimal", "Decimal"], ["boolean", "Boolean"]]),
            answer: { name: "text", attempts: "integer", price: "decimal", active: "boolean" },
            feedback: feedback("Text stores characters, integers store whole numbers, decimals store fractional numbers and Booleans store true or false.")
          },
          {
            id: "FOUND-PROG-VAR-005",
            type: "text",
            prompt: "What value does lives contain at the end?",
            answerLabel: "Final value",
            answers: ["2", "two"],
            code: "lives = 3\nlives = lives - 1",
            feedback: feedback("The second assignment uses the current value 3, subtracts 1 and stores the updated value 2.")
          }
        ]
      },
      {
        id: "selection",
        title: "Selection",
        intro: "Use Boolean conditions to predict which branch a program will execute.",
        questions: [
          single(
            "FOUND-PROG-SEL-001",
            "Which condition is true when age is 18?",
            [["lt", "age < 18"], ["gte", "age >= 18"], ["neq", "age != 18"], ["gt", "age > 18"]],
            "gte",
            "The >= operator means greater than or equal to, so it includes the value 18."
          ),
          single(
            "FOUND-PROG-SEL-002",
            "Which message is displayed?",
            [["gold", "Gold"], ["silver", "Silver"], ["bronze", "Bronze"], ["none", "Nothing"]],
            "silver",
            "72 is not at least 80, but it is at least 60, so the else-if branch displays Silver.",
            { code: "score = 72\nIF score >= 80\n  DISPLAY \"Gold\"\nELSE IF score >= 60\n  DISPLAY \"Silver\"\nELSE\n  DISPLAY \"Bronze\"\nEND IF" }
          ),
          multiple(
            "FOUND-PROG-SEL-003",
            "Which two values make loggedIn AND accountActive true?",
            [["logged", "loggedIn is true"], ["notLogged", "loggedIn is false"], ["active", "accountActive is true"], ["inactive", "accountActive is false"]],
            ["logged", "active"],
            "AND requires both conditions to be true, so the user must be logged in and the account must be active."
          ),
          {
            id: "FOUND-PROG-SEL-004",
            type: "text",
            prompt: "Fill the comparison operator so 10, 11 and 12 are accepted: age ___ 10",
            answerLabel: "Comparison operator",
            answers: [">="],
            feedback: feedback(">= includes 10 itself as well as every value greater than 10.")
          },
          single(
            "FOUND-PROG-SEL-005",
            "What is the final value of deliveryCost?",
            [["0", "0"], ["3", "3"], ["5", "5"], ["8", "8"]],
            "3",
            "The order is not over 40, but the customer is a member, so the second branch sets deliveryCost to 3.",
            { code: "total = 35\nmember = true\nIF total > 40\n  deliveryCost = 0\nELSE IF member == true\n  deliveryCost = 3\nELSE\n  deliveryCost = 5\nEND IF" }
          )
        ]
      },
      {
        id: "iteration",
        title: "Iteration",
        intro: "Reason about count-controlled and condition-controlled loops, including common boundary errors.",
        questions: [
          single(
            "FOUND-PROG-ITER-001",
            "Why is iteration useful?",
            [["repeat", "It repeats a set of instructions under a defined condition"], ["store", "It permanently stores data"], ["choose", "It always chooses between two branches"], ["design", "It draws an interface automatically"]],
            "repeat",
            "A loop repeats instructions while a condition holds or for a controlled number of times."
          ),
          single(
            "FOUND-PROG-ITER-002",
            "How many times is Tick displayed?",
            [["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"]],
            "5",
            "The counter takes the values 0, 1, 2, 3 and 4. The loop stops before 5, so it executes five times.",
            { code: "FOR counter = 0 TO 4\n  DISPLAY \"Tick\"\nEND FOR" }
          ),
          single(
            "FOUND-PROG-ITER-003",
            "What boundary mistake is present if the valid list indexes are 0 to 4?",
            [["none", "There is no mistake"], ["oneTooMany", "The loop tries to access items[5]"], ["skipsZero", "The loop skips items[0]"], ["infinite", "The loop never changes index"]],
            "oneTooMany",
            "Using <= 5 includes index 5. A five-item zero-indexed list ends at index 4, so this is an off-by-one error.",
            { code: "FOR index = 0; index <= 5; index = index + 1\n  DISPLAY items[index]\nEND FOR" }
          ),
          single(
            "FOUND-PROG-ITER-004",
            "Why can this while loop continue forever?",
            [["condition", "The condition is initially false"], ["update", "attempts is never updated inside the loop"], ["display", "DISPLAY cannot be used in a loop"], ["name", "attempts is an invalid identifier"]],
            "update",
            "attempts remains 0, so attempts < 3 never becomes false. A condition-controlled loop needs progress towards its stopping condition.",
            { code: "attempts = 0\nWHILE attempts < 3\n  DISPLAY \"Try again\"\nEND WHILE" }
          ),
          {
            id: "FOUND-PROG-ITER-005",
            type: "order",
            prompt: "Put the loop actions in the order that displays 1, 2 and 3, then stops.",
            items: [
              { id: "initialise", label: "Set count to 1" },
              { id: "check", label: "Check whether count is at most 3" },
              { id: "display", label: "Display count" },
              { id: "update", label: "Increase count by 1" }
            ],
            answer: ["initialise", "check", "display", "update"],
            feedback: feedback("Initialise before the loop, check the condition, perform the required action and then update the control variable.")
          }
        ]
      },
      {
        id: "functions",
        title: "Functions",
        intro: "Connect function calls, parameters and return values to modular, maintainable programs.",
        questions: [
          single(
            "FOUND-PROG-FUNC-001",
            "What is a main benefit of placing a repeated calculation in a function?",
            [["reuse", "The calculation can be named, reused and tested separately"], ["speed", "The program is guaranteed to run faster"], ["storage", "The function stores every result permanently"], ["input", "The function removes the need for inputs"]],
            "reuse",
            "A named function decomposes the program into a reusable unit that can be understood and tested separately."
          ),
          {
            id: "FOUND-PROG-FUNC-002",
            type: "matching",
            prompt: "Match the function vocabulary to the example.",
            rows: [
              { id: "parameter", label: "name in FUNCTION greet(name)" },
              { id: "argument", label: "\"Ravi\" in greet(\"Ravi\")" },
              { id: "return", label: "the value sent back by a function" }
            ],
            options: options([["parameter", "Parameter"], ["argument", "Argument"], ["return", "Return value"]]),
            answer: { parameter: "parameter", argument: "argument", return: "return" },
            feedback: feedback("A parameter names an expected input, an argument is the supplied value, and a return value is sent back to the caller.")
          },
          single(
            "FOUND-PROG-FUNC-003",
            "What value is stored in total?",
            [["4", "4"], ["6", "6"], ["10", "10"], ["nothing", "No value"]],
            "10",
            "The arguments 4 and 6 are assigned to a and b, and the function returns their sum, 10.",
            { code: "FUNCTION add(a, b)\n  RETURN a + b\nEND FUNCTION\n\ntotal = add(4, 6)" }
          ),
          single(
            "FOUND-PROG-FUNC-004",
            "Why does result not receive the calculated price?",
            [["name", "calculateTotal is too long"], ["return", "The function calculates total but does not return it"], ["parameter", "price cannot be a parameter"], ["call", "Functions cannot be called from assignments"]],
            "return",
            "A local calculation is not automatically sent to the caller. RETURN total is needed if the caller must receive it.",
            { code: "FUNCTION calculateTotal(price, quantity)\n  total = price * quantity\nEND FUNCTION\n\nresult = calculateTotal(8, 2)" }
          ),
          multiple(
            "FOUND-PROG-FUNC-005",
            "Which two changes improve decomposition in a long checkout program?",
            [["functions", "Create named functions for validation and total calculation"], ["duplicate", "Copy the same calculation into every branch"], ["names", "Give each function a name that describes one responsibility"], ["global", "Put every value in one global variable"]],
            ["functions", "names"],
            "Small functions with one clearly named responsibility make the program easier to understand, change and test."
          )
        ]
      },
      {
        id: "arrays-lists",
        title: "Arrays/Lists",
        intro: "Work with indexed collections and recognise when a collection is more suitable than unrelated variables.",
        questions: [
          single(
            "FOUND-PROG-LIST-001",
            "When is an array/list more suitable than separate variables?",
            [["collection", "When storing a collection of related values such as weekly scores"], ["single", "When storing one fixed course title"], ["boolean", "Only when storing true or false"], ["database", "Only when a database is unavailable"]],
            "collection",
            "Arrays/lists keep related values together and allow the same processing to be applied across the collection."
          ),
          single(
            "FOUND-PROG-LIST-002",
            "What value is displayed with zero-based indexing?",
            [["red", "red"], ["green", "green"], ["blue", "blue"], ["error", "An error"]],
            "green",
            "Zero-based indexing makes red index 0 and green index 1.",
            { code: "colours = [\"red\", \"green\", \"blue\"]\nDISPLAY colours[1]" }
          ),
          single(
            "FOUND-PROG-LIST-003",
            "What does scores contain after the update?",
            [["a", "[4, 6, 8]"], ["b", "[4, 10, 8]"], ["c", "[10, 6, 8]"], ["d", "[4, 6, 10]"]],
            "b",
            "Index 1 identifies the second value, so 6 is replaced by 10.",
            { code: "scores = [4, 6, 8]\nscores[1] = 10" }
          ),
          {
            id: "FOUND-PROG-LIST-004",
            type: "text",
            prompt: "What total is displayed?",
            answerLabel: "Displayed total",
            answers: ["9", "nine"],
            code: "values = [2, 3, 4]\ntotal = 0\nFOR EACH value IN values\n  total = total + value\nEND FOR\nDISPLAY total",
            feedback: feedback("The loop adds 2, then 3, then 4 to the running total, producing 9.")
          },
          single(
            "FOUND-PROG-LIST-005",
            "Which loop safely visits every item in a zero-indexed list?",
            [["lt", "index starts at 0 and continues while index < length"], ["lte", "index starts at 0 and continues while index <= length"], ["one", "index starts at 1 and continues while index < length"], ["fixed", "index is always 0"]],
            "lt",
            "For a list of length n, valid indexes are 0 to n - 1. The condition index < length covers exactly those indexes."
          )
        ]
      },
      {
        id: "debugging",
        title: "Debugging",
        intro: "Identify syntax and logical faults, then choose a correction that addresses the cause.",
        questions: [
          single(
            "FOUND-PROG-DEBUG-001",
            "What is wrong, and what change would fix it?",
            [["colon", "The if statement is missing its required colon"], ["operator", "Replace > with +"], ["name", "Rename score to number"], ["indent", "Remove all indentation"]],
            "colon",
            "In this Python-style example, the if header must end with a colon before its indented body.",
            { code: "score = 8\nif score > 5\n    print(\"High\")" }
          ),
          single(
            "FOUND-PROG-DEBUG-002",
            "The discount should apply to totals of 50 or more. Which fix is needed?",
            [["gte", "Change total > 50 to total >= 50"], ["lt", "Change total > 50 to total < 50"], ["value", "Change discount to 50"], ["else", "Remove the condition"]],
            "gte",
            "The current condition excludes exactly 50. Using >= matches the stated inclusive boundary.",
            { code: "IF total > 50\n  discount = 5\nEND IF" }
          ),
          single(
            "FOUND-PROG-DEBUG-003",
            "The loop should display all four names. What causes the error?",
            [["boundary", "The loop includes index 4 even though the last valid index is 3"], ["list", "A list cannot contain names"], ["start", "A loop cannot start at 0"], ["display", "DISPLAY changes the list"]],
            "boundary",
            "A four-item zero-indexed list has indexes 0 to 3. The inclusive upper bound 4 causes an off-by-one access.",
            { code: "names = [\"Ari\", \"Bo\", \"Chen\", \"Dia\"]\nFOR index = 0 TO 4\n  DISPLAY names[index]\nEND FOR" }
          ),
          single(
            "FOUND-PROG-DEBUG-004",
            "Why does the final line fail?",
            [["wrongName", "The code refers to orderTotal instead of the defined variable order_total"], ["decimal", "12.50 cannot be stored"], ["tax", "Tax must be text"], ["multiply", "Multiplication is not allowed"]],
            "wrongName",
            "Variable names must match exactly. orderTotal and order_total are different identifiers.",
            { code: "order_total = 12.50\ntax = 0.20\nfinal_total = orderTotal * (1 + tax)" }
          ),
          single(
            "FOUND-PROG-DEBUG-005",
            "What change makes the function provide the calculated value to its caller?",
            [["return", "Add RETURN area after the calculation"], ["global", "Rename area to global"], ["print", "Delete the calculation"], ["parameter", "Remove both parameters"]],
            "return",
            "The function needs RETURN area so the calling statement receives the calculated result.",
            { code: "FUNCTION rectangleArea(width, height)\n  area = width * height\nEND FUNCTION" }
          )
        ]
      },
      {
        id: "basic-sql",
        title: "Basic SQL",
        intro: "Interpret a small relational table and recognise the purpose of introductory SQL statements without executing code.",
        questions: [
          {
            id: "FOUND-PROG-SQL-001",
            type: "matching",
            prompt: "Match each relational database term to its meaning.",
            rows: [
              { id: "table", label: "A structured collection about one subject" },
              { id: "record", label: "One complete row about an item" },
              { id: "field", label: "One named column or attribute" },
              { id: "pk", label: "A value that uniquely identifies each row" }
            ],
            options: options([["table", "Table"], ["record", "Record/row"], ["field", "Field/column"], ["pk", "Primary key"]]),
            answer: { table: "table", record: "record", field: "field", pk: "pk" },
            feedback: feedback("Tables contain records, records contain fields, and a primary key uniquely identifies each record.")
          },
          single(
            "FOUND-PROG-SQL-002",
            "Which names does the query return?",
            [["amina", "Amina only"], ["leo", "Leo only"], ["both", "Amina and Leo"], ["all", "All three customers"]],
            "amina",
            "WHERE active = true keeps active rows. SELECT first_name returns only the first_name field, so the result is Amina.",
            {
              code: "SELECT first_name\nFROM customers\nWHERE active = true;",
              table: { caption: "customers table", headers: ["customer_id", "first_name", "membership_type", "active"], rows: [["C01", "Amina", "Standard", "true"], ["C02", "Leo", "Standard", "false"], ["C03", "Maya", "Premium", "false"]] }
            }
          ),
          single(
            "FOUND-PROG-SQL-003",
            "Which field is the best primary key for the customers table?",
            [["id", "customer_id"], ["name", "first_name"], ["type", "membership_type"], ["active", "active"]],
            "id",
            "customer_id is designed to be unique and stable. Names, membership types and active flags can be shared by many records."
          ),
          single(
            "FOUND-PROG-SQL-004",
            "Which statement adds a new customer row?",
            [["insert", "INSERT INTO customers (...) VALUES (...);"], ["select", "SELECT * FROM customers;"], ["update", "UPDATE customers SET active = true;"], ["from", "FROM customers WHERE active = true;"]],
            "insert",
            "INSERT adds a new record. SELECT reads records and UPDATE changes existing records."
          ),
          single(
            "FOUND-PROG-SQL-005",
            "What does this statement change?",
            [["one", "It changes C02 so active becomes true"], ["all", "It changes every customer"], ["new", "It inserts a new customer"], ["delete", "It removes C02"]],
            "one",
            "UPDATE changes existing data, SET gives the new value, and WHERE limits the change to customer C02.",
            { code: "UPDATE customers\nSET active = true\nWHERE customer_id = 'C02';" }
          )
        ]
      }
    ]
  };
})();
