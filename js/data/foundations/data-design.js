(function () {
  "use strict";

  function options(items) {
    return items.map(function (item) { return { value: item[0], label: item[1] }; });
  }

  function feedback(explanation) {
    return { correct: explanation, incorrect: explanation };
  }

  function single(id, prompt, items, answer, explanation, extra) {
    return Object.assign({ id: id, type: "single", prompt: prompt, options: options(items), answer: answer, feedback: feedback(explanation) }, extra || {});
  }

  window.FoundationActivityData = {
    id: "foundations-data-design",
    version: "1.0.0",
    title: "Data Design Knowledge Check",
    resultIntro: "Use this summary to identify which data-design building blocks need more practice before designing a larger solution.",
    sections: [
      {
        id: "data-structure",
        title: "Fields, records and tables",
        intro: "Northbridge College stores information about students, clubs and club memberships. Begin with the structure of a relational dataset.",
        questions: [
          {
            id: "FOUND-DATA-001",
            type: "matching",
            prompt: "Match each data term to the example.",
            rows: [
              { id: "field", label: "email" },
              { id: "record", label: "S104, Amina Shah, true" },
              { id: "table", label: "All student records with the same columns" },
              { id: "entity", label: "The real-world Student concept being described" }
            ],
            options: options([["field", "Field"], ["record", "Record"], ["table", "Table"], ["entity", "Entity"]]),
            answer: { field: "field", record: "record", table: "table", entity: "entity" },
            feedback: feedback("A field stores one attribute, a record combines fields for one instance, a table holds consistent records and an entity is the concept represented.")
          },
          single(
            "FOUND-DATA-002",
            "Which description is a record?",
            [["row", "One row containing all stored values for club C12"], ["column", "The weekly_fee column"], ["table", "The complete Clubs table"], ["rule", "The rule that capacity must be positive"]],
            "row",
            "A record is one complete row about one instance, such as one club."
          ),
          single(
            "FOUND-DATA-003",
            "Why should every record in a table use the same defined fields?",
            [["consistent", "It keeps the structure consistent for storage, validation and processing"], ["names", "It guarantees every value is unique"], ["size", "It makes all text the same length"], ["security", "It automatically encrypts the data"]],
            "consistent",
            "A consistent schema lets the solution interpret, validate and query each record reliably."
          ),
          single(
            "FOUND-DATA-004",
            "Which name follows a clear, consistent field naming convention?",
            [["joined", "joined_on"], ["space", "Joined On Date!!!"], ["x", "x1"], ["mixed", "jOiNeDdAtE"]],
            "joined",
            "joined_on is concise, meaningful and follows a predictable lowercase underscore convention. Other conventions can also work when applied consistently."
          )
        ]
      },
      {
        id: "data-types",
        title: "Data types and field design",
        intro: "Choose conceptual data types that suit the meaning and operations required by each field.",
        questions: [
          single(
            "FOUND-DATA-TYPE-001",
            "Which conceptual type best fits student_id values such as S00107?",
            [["text", "String/Text"], ["integer", "Integer"], ["decimal", "Decimal"], ["boolean", "Boolean"]],
            "text",
            "The ID contains a letter and leading zeroes, and it is an identifier rather than a value used in arithmetic."
          ),
          single(
            "FOUND-DATA-TYPE-002",
            "Which conceptual type best fits a club capacity of 24 places?",
            [["integer", "Integer"], ["text", "String/Text"], ["date", "Date"], ["boolean", "Boolean"]],
            "integer",
            "Capacity is a count of whole places, so an integer supports comparison and arithmetic."
          ),
          single(
            "FOUND-DATA-TYPE-003",
            "Which conceptual type best fits a weekly fee of 7.50?",
            [["decimal", "Decimal"], ["integer", "Integer"], ["boolean", "Boolean"], ["date", "Date"]],
            "decimal",
            "A decimal type represents values with a fractional part. Financial systems may use a dedicated fixed-precision money representation."
          ),
          single(
            "FOUND-DATA-TYPE-004",
            "Which conceptual type best fits whether a membership is active?",
            [["boolean", "Boolean"], ["description", "Long text"], ["decimal", "Decimal"], ["date", "Date"]],
            "boolean",
            "A two-state active flag maps naturally to true or false."
          ),
          single(
            "FOUND-DATA-TYPE-005",
            "Why set a sensible maximum length for club_name?",
            [["quality", "It documents the expected data and prevents unexpectedly large values"], ["unique", "It makes every club name unique"], ["type", "It converts the name into a number"], ["required", "It makes the field optional"]],
            "quality",
            "A justified length supports validation, storage planning and interface design, but it does not create uniqueness or required status."
          )
        ]
      },
      {
        id: "keys-relationships",
        title: "Keys and relationships",
        intro: "Use the accessible entity representation to identify keys and the relationships created by a membership record.",
        questions: [
          single(
            "FOUND-DATA-KEY-001",
            "Which field is the primary key of Student?",
            [["student", "student_id"], ["name", "full_name"], ["email", "email"], ["active", "active"]],
            "student",
            "student_id is intended to identify each student record uniquely and remain stable when a name changes.",
            { erd: { label: "Entity relationship overview for Students, Clubs and Memberships", entities: [{ name: "Student", fields: ["PK student_id", "full_name", "email", "active"] }, { name: "Club", fields: ["PK club_id", "club_name", "weekly_fee", "capacity"] }, { name: "Membership", fields: ["PK membership_id", "FK student_id", "FK club_id", "joined_on", "status"] }], relationships: "One Student can have many Membership records. One Club can have many Membership records." } }
          ),
          single(
            "FOUND-DATA-KEY-002",
            "Which two fields are foreign keys in Membership?",
            [["both", "student_id and club_id"], ["membership", "membership_id and status"], ["date", "joined_on and status"], ["names", "student_name and club_name"]],
            "both",
            "student_id links to Student and club_id links to Club. They are foreign keys because they refer to primary keys in other tables."
          ),
          single(
            "FOUND-DATA-KEY-003",
            "What relationship exists from Club to Membership?",
            [["one-many", "One-to-many"], ["one-one", "One-to-one"], ["many-one", "Many clubs must share one membership record"], ["none", "No relationship"]],
            "one-many",
            "One club can have many membership records, while each membership record refers to one club."
          ),
          single(
            "FOUND-DATA-KEY-004",
            "Why is club_id usually a better identifier than club_name?",
            [["stable", "An ID can remain unique and stable even if the displayed name changes"], ["short", "IDs are always one character long"], ["secret", "IDs are secret passwords"], ["number", "Only numbers can be identifiers"]],
            "stable",
            "A purpose-designed ID avoids ambiguity and can remain stable when a descriptive name is corrected or changed."
          )
        ]
      },
      {
        id: "validation-dictionary",
        title: "Validation and data dictionary",
        intro: "Choose controls that keep stored values within the rules defined by the data design.",
        questions: [
          single(
            "FOUND-DATA-VAL-001",
            "Which validation best ensures capacity is between 1 and 60?",
            [["range", "Range check"], ["format", "Format check"], ["lookup", "Lookup/list check"], ["required", "Required-field check only"]],
            "range",
            "A range check compares the numeric input with an allowed minimum and maximum."
          ),
          single(
            "FOUND-DATA-VAL-002",
            "Which validation best restricts status to Pending, Active or Cancelled?",
            [["lookup", "Lookup/list check"], ["length", "Length check"], ["range", "Numeric range check"], ["type", "Date type check"]],
            "lookup",
            "A lookup or allowed-values list restricts the field to the three defined status values."
          ),
          single(
            "FOUND-DATA-VAL-003",
            "What does setting club_name to Required prevent?",
            [["empty", "Saving a club record without a name"], ["duplicate", "Two clubs having the same name"], ["long", "A name being too long"], ["case", "Lowercase characters"]],
            "empty",
            "Required validation checks presence. Uniqueness and length need separate rules."
          ),
          single(
            "FOUND-DATA-VAL-004",
            "Which validation is most suitable for a value expected in the form AB12 3CD?",
            [["format", "Format/input-mask check"], ["boolean", "Boolean check"], ["range", "Range from 1 to 10"], ["lookup", "Club lookup"]],
            "format",
            "A format rule or input mask can check the expected pattern of letters, numbers and spacing."
          ),
          {
            id: "FOUND-DATA-DICT-001",
            type: "matching",
            prompt: "Complete the missing data dictionary decisions for Club.",
            context: "A data dictionary records agreed field meanings, types, sizes, required status and validation so implementation stays consistent.",
            table: { caption: "Incomplete Club data dictionary", headers: ["Field", "Purpose", "Missing decision"], rows: [["club_id", "Unique club identifier", "Data type"], ["club_name", "Displayed club name", "Size"], ["capacity", "Maximum member places", "Validation"], ["weekly_fee", "Fee charged each week", "Required?"]] },
            rows: [
              { id: "idType", label: "club_id data type" },
              { id: "nameSize", label: "club_name size" },
              { id: "capacityValidation", label: "capacity validation" },
              { id: "feeRequired", label: "weekly_fee required status" }
            ],
            options: options([["text", "String/Text"], ["fifty", "Maximum 50 characters"], ["range", "Integer from 1 to 60"], ["yes", "Required: Yes"]]),
            answer: { idType: "text", nameSize: "fifty", capacityValidation: "range", feeRequired: "yes" },
            feedback: feedback("The identifier is text, the display name has a justified length, capacity has a numeric range, and the fee is required for every club record in this design.")
          }
        ]
      }
    ]
  };
})();
