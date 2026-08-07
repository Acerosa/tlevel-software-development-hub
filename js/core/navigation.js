(function () {
  "use strict";

  var config = window.APP_CONFIG;
  var utils = window.AppUtils;

  function pageLink(item, currentPage, root, className) {
    var isCurrent = item.id === currentPage;
    var currentAttribute = isCurrent ? ' aria-current="page"' : "";
    var currentClass = isCurrent ? " " + className + "__link--current" : "";
    var href = utils.createSitePath(root, item.path);

    return (
      '<li class="' + className + '__item">' +
      '<a class="' + className + '__link' + currentClass + '" href="' + href + '"' +
      currentAttribute + ">" + item.label + "</a>" +
      "</li>"
    );
  }

  function quickLink(item, currentPage, root, label) {
    var currentAttribute = item.id === currentPage ? ' aria-current="page"' : "";
    return (
      '<li><a class="site-header__link" href="' +
      utils.createSitePath(root, item.path) + '"' + currentAttribute + ">" + label + "</a></li>"
    );
  }

  function renderHeader() {
    var headerMount = document.querySelector("[data-site-header]");
    if (!headerMount) {
      return;
    }

    var currentPage = document.body.dataset.page || "home";
    var root = document.body.dataset.root || ".";
    var mobileLinks = config.navigation
      .map(function (item) {
        return pageLink(item, currentPage, root, "site-nav");
      })
      .join("");
    var home = config.navigation[0];
    var resources = config.navigation.filter(function (item) {
      return item.id === "resources";
    })[0];
    var help = config.navigation.filter(function (item) {
      return item.id === "help";
    })[0];

    headerMount.innerHTML =
      '<header class="site-header">' +
      '<div class="site-header__bar page-width">' +
      '<a class="brand" href="' + utils.createSitePath(root, "") + '">' +
      '<span class="brand__name">Software Development Hub</span>' +
      '<span class="brand__context">T Level Digital</span></a>' +
      '<nav class="site-header__quick" aria-label="Quick links"><ul class="site-header__links">' +
      quickLink(home, currentPage, root, "Course home") +
      quickLink(resources, currentPage, root, "Resources") +
      quickLink(help, currentPage, root, "Help") +
      "</ul></nav>" +
      '<div class="site-header__actions"><div class="student-account" data-student-account></div>' +
      '<button class="nav-toggle" type="button" aria-expanded="false" ' +
      'aria-controls="global-navigation">Menu</button></div>' +
      "</div>" +
      '<nav class="site-nav" id="global-navigation" aria-label="Main navigation">' +
      '<div class="page-width"><ul class="site-nav__list">' + mobileLinks + "</ul></div>" +
      "</nav></header>";

    initialiseMenu(headerMount);
  }

  function renderCourseNavigation() {
    var mounts = document.querySelectorAll("[data-course-navigation]");
    if (!mounts.length) {
      return;
    }

    var currentPage = document.body.dataset.page || "home";
    var root = document.body.dataset.root || ".";
    var sectionIds = [
      "home",
      "course-guide",
      "foundations",
      "projects",
      "task-1",
      "task-2",
      "task-3",
      "assessment-practice"
    ];
    var sections = config.navigation.filter(function (item) {
      return sectionIds.indexOf(item.id) !== -1;
    });
    var links = sections
      .map(function (item) {
        var currentAttribute = item.id === currentPage ? ' aria-current="page"' : "";
        var phaseBadge = item.id === "foundations" ? '<span class="phase-badge">Current</span>' : "";
        var displayLabel = item.id === "home" ? "Course home" : item.label;
        return (
          '<li class="course-navigation__item"><a class="course-navigation__link" href="' +
          utils.createSitePath(root, item.path) + '"' + currentAttribute + ">" +
          "<span>" + displayLabel + "</span>" + phaseBadge + "</a></li>"
        );
      })
      .join("");

    mounts.forEach(function (mount) {
      mount.innerHTML =
        '<aside class="course-navigation" aria-labelledby="course-navigation-title">' +
        '<h2 class="course-navigation__title" id="course-navigation-title">Course sections</h2>' +
        '<nav aria-label="Course sections"><ul class="course-navigation__list">' +
        links + "</ul></nav></aside>";
    });
  }

  function initialiseMenu(headerMount) {
    var button = headerMount.querySelector(".nav-toggle");
    var navigation = headerMount.querySelector(".site-nav");

    function closeMenu(returnFocus) {
      button.setAttribute("aria-expanded", "false");
      navigation.classList.remove("site-nav--open");
      if (returnFocus) {
        button.focus();
      }
    }

    button.addEventListener("click", function () {
      var open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      navigation.classList.toggle("site-nav--open", !open);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
        closeMenu(true);
      }
    });
  }

  function renderFooterDetails() {
    utils.setText("[data-current-phase]", config.currentPhase);
    utils.setText("[data-current-year]", String(new Date().getFullYear()));
  }

  utils.onReady(function () {
    renderHeader();
    renderCourseNavigation();
    renderFooterDetails();
  });
})();
