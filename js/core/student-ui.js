(function () {
  "use strict";

  var utils = window.AppUtils;
  var core = window.LearningPlatformCore;
  var platform = window.LearningPlatform && window.LearningPlatform.platform;
  var studentContext = window.StudentContext;
  var accountDialog;
  var liveStatus;

  function renderAccount(student) {
    document.querySelectorAll("[data-student-account]").forEach(function (mount) {
      if (!student) {
        mount.innerHTML = '<button class="student-account__button" type="button" data-student-sign-in>Student sign in</button>';
        mount.querySelector("[data-student-sign-in]").addEventListener("click", function (event) {
          accountDialog.open(event.currentTarget);
        });
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
        });
      });
    });
  }

  utils.onReady(function () {
    accountDialog = core.createAccountDialog({
      authService: platform.auth,
      learnerContext: platform.learner,
      onboardingService: platform.onboarding
    });
    document.body.appendChild(accountDialog.element);

    liveStatus = document.createElement("p");
    liveStatus.className = "visually-hidden";
    liveStatus.setAttribute("aria-live", "polite");
    document.body.appendChild(liveStatus);
    studentContext.subscribe(renderAccount);
  });

  window.StudentSignInUI = Object.freeze({
    usesSupabase: function () { return true; },
    usesCoreAccountDialog: function () { return true; }
  });
})();
