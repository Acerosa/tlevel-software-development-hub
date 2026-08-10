(function () {
  "use strict";

  var utils = window.AppUtils;
  var legacyApi = window.StudentApi;
  var studentContext = window.StudentContext;
  var supabaseConfig = window.SUPABASE_CONFIG || {};
  var useSupabase = supabaseConfig.backend === "supabase" &&
    studentContext && typeof studentContext.signInWithPassword === "function";
  var dialog;
  var form;
  var identifierInput;
  var passwordInput;
  var errorMessage;
  var submitButton;
  var loadingMessage;
  var liveStatus;
  var loading = false;
  var authMode = "sign-in";

  var errorMessages = Object.freeze({
    INVALID_STUDENT_ID: "Enter your student ID.",
    STUDENT_NOT_FOUND: "We couldn't find that student ID. Check it and try again.",
    INVALID_AUTH_CREDENTIALS: "Enter your email and password.",
    AUTHENTICATION_FAILED: "Those sign-in details were not recognised.",
    AUTH_SIGN_UP_FAILED: "We couldn't create that account. Check the details and try again.",
    PASSWORD_MISMATCH: "The passwords do not match.",
    INVALID_LOGIN_CREDENTIALS: "Those sign-in details were not recognised.",
    STUDENT_IDENTITY_NOT_FOUND: "Your learner profile is not available. Please speak to your tutor.",
    STUDENT_INACTIVE: "Your student account is not currently active. Please speak to your tutor.",
    CONFIGURATION_ERROR: "Student sign in is not available yet. Please speak to your tutor.",
    NETWORK_ERROR: "We couldn't connect to the student service. Please try again.",
    INVALID_RESPONSE: "Something went wrong while signing you in. Please try again.",
    SESSION_STORAGE_ERROR: "Something went wrong while saving your sign in. Please try again.",
    INTERNAL_ERROR: "Something went wrong while signing you in. Please try again."
  });

  function messageForErrorCode(code) {
    return errorMessages[code] || errorMessages.INTERNAL_ERROR;
  }

  function createDialog() {
    dialog = document.createElement("dialog");
    dialog.className = "student-sign-in-dialog";
    dialog.setAttribute("aria-labelledby", "student-sign-in-heading");
    dialog.setAttribute("aria-describedby", "student-sign-in-help");
    var identityLabel = useSupabase ? "Email address" : "Student ID";
    var identityName = useSupabase ? "email" : "studentId";
    var identityType = useSupabase ? "email" : "text";
    var identityAutocomplete = useSupabase ? "username" : "off";
    var passwordField = useSupabase
      ? '<div class="form-group"><label for="student-password">Password</label>' +
        '<input id="student-password" name="password" type="password" autocomplete="current-password" ' +
        'aria-describedby="student-sign-in-help student-sign-in-error" minlength="8"></div>' +
        '<div class="form-group" data-confirm-password hidden><label for="student-password-confirm">Confirm password</label>' +
        '<input id="student-password-confirm" name="passwordConfirm" type="password" autocomplete="new-password" minlength="8" ' +
        'aria-describedby="student-sign-in-help student-sign-in-error"></div>'
      : "";
    dialog.innerHTML =
      '<div class="student-sign-in-dialog__header">' +
      '<h2 id="student-sign-in-heading">Student sign in</h2>' +
      '<button class="student-sign-in-dialog__close" type="button" data-student-dialog-close>Close</button>' +
      "</div>" +
      '<p id="student-sign-in-help">' +
      (useSupabase ? "Use the email and password provided for your learner account." :
        "Use the student ID allocated to you by your tutor.") + "</p>" +
      '<form class="student-sign-in-form" data-student-sign-in-form novalidate>' +
      '<div class="form-group"><label for="student-identifier">' + identityLabel + "</label>" +
      '<input id="student-identifier" name="' + identityName + '" type="' + identityType +
      '" maxlength="120" autocomplete="' + identityAutocomplete + '" autocapitalize="off" spellcheck="false" ' +
      'aria-describedby="student-sign-in-help student-sign-in-error"></div>' +
      passwordField +
      '<p class="form-error" id="student-sign-in-error" role="alert" aria-live="assertive" tabindex="-1" hidden></p>' +
      '<div class="student-sign-in-form__actions"><button class="primary-button" type="submit" data-student-submit>Continue</button>' +
      '<span class="loading-message" data-student-loading aria-live="polite"></span></div>' +
      (useSupabase ? '<button class="text-button" type="button" data-auth-mode-toggle>Create an account</button>' : '') + '</form>';

    document.body.appendChild(dialog);
    form = dialog.querySelector("[data-student-sign-in-form]");
    identifierInput = dialog.querySelector("#student-identifier");
    passwordInput = dialog.querySelector("#student-password");
    errorMessage = dialog.querySelector("#student-sign-in-error");
    submitButton = dialog.querySelector("[data-student-submit]");
    loadingMessage = dialog.querySelector("[data-student-loading]");

    dialog.querySelector("[data-student-dialog-close]").addEventListener("click", closeDialog);
    form.addEventListener("submit", handleSubmit);
    if (useSupabase) dialog.querySelector("[data-auth-mode-toggle]").addEventListener("click", toggleAuthMode);
  }

  function toggleAuthMode() {
    authMode = authMode === "sign-in" ? "sign-up" : "sign-in";
    dialog.querySelector("#student-sign-in-heading").textContent = authMode === "sign-up" ? "Create learner account" : "Student sign in";
    dialog.querySelector("#student-sign-in-help").textContent = authMode === "sign-up" ? "Create an account with your email address and a password of at least 8 characters." : "Use the email and password provided for your learner account.";
    dialog.querySelector("[data-student-submit]").textContent = authMode === "sign-up" ? "Create account" : "Continue";
    dialog.querySelector("[data-confirm-password]").hidden = authMode !== "sign-up";
    dialog.querySelector("[data-auth-mode-toggle]").textContent = authMode === "sign-up" ? "Back to sign in" : "Create an account";
    clearError();
  }

  function openDialog() {
    clearError();
    form.reset();
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    window.setTimeout(function () { identifierInput.focus(); }, 0);
  }

  function closeDialog() {
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  function clearError() {
    identifierInput.removeAttribute("aria-invalid");
    if (passwordInput) passwordInput.removeAttribute("aria-invalid");
    errorMessage.hidden = true;
    errorMessage.textContent = "";
  }

  function showError(message, focusInput) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
    identifierInput.setAttribute("aria-invalid", "true");
    if (focusInput) {
      identifierInput.focus();
    } else {
      errorMessage.focus();
    }
  }

  function setLoading(value) {
    loading = value;
    form.setAttribute("aria-busy", String(value));
    submitButton.disabled = value;
    submitButton.textContent = value ? "Checking..." : "Continue";
    loadingMessage.textContent = value ? "Checking your sign-in." : "";
  }

  function completeSignIn(student) {
    setLoading(false);
    if (!student) {
      closeDialog();
      liveStatus.textContent = "Account created. Check your email to confirm it before signing in.";
      return;
    }
    closeDialog();
    liveStatus.textContent = "Welcome, " + student.firstName + ". You are signed in.";
    var signOutButton = document.querySelector("[data-student-sign-out]");
    if (signOutButton) signOutButton.focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    clearError();

    var identifier = identifierInput.value.trim();
    var password = passwordInput ? passwordInput.value : "";
    var confirmation = dialog.querySelector("#student-password-confirm");
    if (!identifier || (useSupabase && (!password || password.length < 8))) {
      showError(messageForErrorCode(useSupabase ? "INVALID_AUTH_CREDENTIALS" : "INVALID_STUDENT_ID"), true);
      return;
    }
    if (authMode === "sign-up" && (!confirmation || confirmation.value !== password)) {
      showError(messageForErrorCode("PASSWORD_MISMATCH"), false);
      return;
    }

    setLoading(true);
    var request = useSupabase
      ? (authMode === "sign-up" ? studentContext.signUpWithPassword(identifier, password) : studentContext.signInWithPassword(identifier, password))
      : legacyApi.getStudent(identifier).then(function (student) {
        studentContext.signIn(student);
        return student;
      });
    request.then(completeSignIn).catch(function (error) {
      setLoading(false);
      showError(messageForErrorCode(error && error.code), false);
    });
  }

  function renderAccount(student) {
    document.querySelectorAll("[data-student-account]").forEach(function (mount) {
      if (!student) {
        mount.innerHTML = '<button class="student-account__button" type="button" data-student-sign-in>Student sign in</button>';
        mount.querySelector("[data-student-sign-in]").addEventListener("click", openDialog);
        return;
      }
      mount.innerHTML = '<span class="student-account__name" data-student-name></span>' +
        '<button class="student-account__button" type="button" data-student-sign-out>Sign out</button>';
      mount.querySelector("[data-student-name]").textContent = student.firstName;
      mount.querySelector("[data-student-sign-out]").addEventListener("click", function () {
        studentContext.signOut().then(function () {
          liveStatus.textContent = "You have signed out.";
          var signInButton = document.querySelector("[data-student-sign-in]");
          if (signInButton) signInButton.focus();
        }).catch(function () {
          liveStatus.textContent = "You have signed out.";
        });
      });
    });
  }

  utils.onReady(function () {
    createDialog();
    liveStatus = document.createElement("p");
    liveStatus.className = "visually-hidden";
    liveStatus.setAttribute("aria-live", "polite");
    document.body.appendChild(liveStatus);
    studentContext.subscribe(renderAccount);
  });

  window.StudentSignInUI = Object.freeze({
    messageForErrorCode: messageForErrorCode,
    usesSupabase: function () { return useSupabase; }
  });
})();
