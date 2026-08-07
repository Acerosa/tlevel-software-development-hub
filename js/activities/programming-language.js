(function () {
  "use strict";

  var languages = Object.freeze([
    Object.freeze({ id: "python", label: "Python", codeLabel: "Python" }),
    Object.freeze({ id: "javascript", label: "JavaScript", codeLabel: "JavaScript" }),
    Object.freeze({ id: "csharp", label: "C#", codeLabel: "C#" })
  ]);

  function languageById(languageId) {
    return languages.filter(function (language) {
      return language.id === languageId;
    })[0] || null;
  }

  function copy(value) {
    if (Array.isArray(value)) {
      return value.map(copy);
    }
    if (value && typeof value === "object") {
      return Object.keys(value).reduce(function (result, key) {
        result[key] = copy(value[key]);
        return result;
      }, {});
    }
    return value;
  }

  function resolveQuestion(question, languageId) {
    var resolved = copy(question);
    var variant;

    if (!question.languages) {
      return resolved;
    }

    variant = question.languages[languageId];
    if (!variant) {
      throw new Error("Question " + question.id + " has no " + languageId + " variant.");
    }

    delete resolved.languages;
    Object.keys(copy(variant)).forEach(function (key) {
      resolved[key] = copy(variant[key]);
    });
    resolved.programmingLanguage = languageId;
    resolved.languageLabel = languageById(languageId).codeLabel;
    return resolved;
  }

  function resolveActivity(activity, languageId) {
    var language = languageById(languageId);
    if (!language) {
      throw new Error("Unsupported programming language: " + languageId + ".");
    }

    var resolved = copy(activity);
    resolved.programmingLanguage = languageId;
    resolved.programmingLanguageLabel = language.label;
    resolved.sections = activity.sections.map(function (section) {
      var resolvedSection = copy(section);
      resolvedSection.questions = section.questions.map(function (question) {
        return resolveQuestion(question, languageId);
      });
      return resolvedSection;
    });
    return resolved;
  }

  function validateActivity(activity) {
    var errors = [];
    if (!activity || !activity.requiresProgrammingLanguage) {
      return errors;
    }

    var configured = activity.supportedProgrammingLanguages || [];
    var expected = languages.map(function (language) { return language.id; });
    if (configured.join("|") !== expected.join("|")) {
      errors.push("Programming Diagnostic language configuration must be Python, JavaScript and C#.");
    }

    activity.sections.forEach(function (section) {
      section.questions.forEach(function (question) {
        if (!question.languages) {
          return;
        }
        expected.forEach(function (languageId) {
          if (!question.languages[languageId]) {
            errors.push(question.id + " is missing its " + languageId + " variant.");
          }
        });
        Object.keys(question.languages).forEach(function (languageId) {
          if (expected.indexOf(languageId) === -1) {
            errors.push(question.id + " contains unsupported language " + languageId + ".");
          }
        });
      });
    });
    return errors;
  }

  window.FoundationProgrammingLanguage = Object.freeze({
    languages: languages,
    languageById: languageById,
    resolveQuestion: resolveQuestion,
    resolveActivity: resolveActivity,
    validateActivity: validateActivity
  });
})();
