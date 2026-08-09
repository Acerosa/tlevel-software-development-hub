(function () {
  "use strict";

  var client = window.SupabaseClient;

  function safeProfile(payload) {
    var row = Array.isArray(payload) ? payload[0] : null;
    if (!row ||
        typeof row.student_number !== "string" || !row.student_number.trim() ||
        typeof row.first_name !== "string" || !row.first_name.trim() ||
        typeof row.display_name !== "string") {
      var error = new Error("The authenticated learner profile is unavailable.");
      error.code = "STUDENT_IDENTITY_NOT_FOUND";
      throw error;
    }
    return {
      studentNumber: row.student_number.trim(),
      firstName: row.first_name.trim(),
      displayName: row.display_name.trim()
    };
  }

  function getProfile() {
    return client.request(
      "/rest/v1/my_profile?select=student_number,first_name,display_name&limit=1",
      { schema: "api" }
    ).then(safeProfile);
  }

  function signInWithPassword(email, password) {
    return client.signInWithPassword(email, password).then(function () {
      return getProfile();
    }).catch(function (error) {
      client.clearSession();
      throw error;
    });
  }

  function restoreProfile() {
    return client.hasSession() ? getProfile() : Promise.resolve(null);
  }

  window.SupabaseAuth = Object.freeze({
    signInWithPassword: signInWithPassword,
    restoreProfile: restoreProfile,
    getProfile: getProfile,
    signOut: client.signOut,
    hasSession: client.hasSession
  });
})();
