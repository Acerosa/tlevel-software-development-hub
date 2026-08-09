(function () {
  "use strict";

  var client = window.SupabaseClient;

  function rows(payload) {
    return Array.isArray(payload) ? payload : [];
  }

  function request(view, query) {
    return client.request("/rest/v1/" + view + "?" + (query || "select=*"), {
      schema: "api"
    }).then(rows);
  }

  function studentProgress() {
    return Promise.all([
      request("my_activity_progress", "select=*&order=activity_key.asc"),
      request("my_attempts", "select=*&order=received_at.asc"),
      request("my_assignments", "select=*&order=activity_key.asc")
    ]).then(function (values) {
      return {
        activities: values[0],
        attempts: values[1],
        assignments: values[2]
      };
    });
  }

  var teacherViews = Object.freeze({
    learners: "teacher_group_learners",
    attempts: "teacher_group_attempts",
    responses: "teacher_group_responses",
    activityAnalytics: "teacher_group_activity_analytics",
    topicAnalytics: "teacher_group_topic_analytics",
    questionAnalytics: "teacher_group_question_analytics",
    studentProgress: "teacher_group_student_progress"
  });

  function teacherAnalytics() {
    return Promise.all([
      request(teacherViews.learners),
      request(teacherViews.attempts),
      request(teacherViews.responses),
      request(teacherViews.activityAnalytics),
      request(teacherViews.topicAnalytics),
      request(teacherViews.questionAnalytics),
      request(teacherViews.studentProgress)
    ]).then(function (values) {
      return {
        learners: values[0],
        attempts: values[1],
        responses: values[2],
        activityAnalytics: values[3],
        topicAnalytics: values[4],
        questionAnalytics: values[5],
        studentProgress: values[6]
      };
    });
  }

  window.SupabaseAnalytics = Object.freeze({
    studentProgress: studentProgress,
    teacherAnalytics: teacherAnalytics,
    teacherViews: teacherViews,
    getView: request
  });
})();
