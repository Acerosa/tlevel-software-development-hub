(function () {
  "use strict";

  var config = window.APP_CONFIG;
  var utils = window.AppUtils;

  function navigationItem(item, currentPage, root) {
    var currentAttribute = item.id === currentPage ? ' aria-current="page"' : "";
    var currentClass = item.id === currentPage ? " site-nav__link--current" : "";
    var href = utils.createSitePath(root, item.path);

    return (
      '<li class="site-nav__item">' +
      '<a class="site-nav__link' + currentClass + '" href="' + href + '"' +
      currentAttribute + ">" + item.label + "</a>" +
      "</li>"
    );
  }

  function renderHeader() {
    var headerMount = document.querySelector("[data-site-header]");
    if (!headerMount) {
      return;
    }

    var currentPage = document.body.dataset.page || "home";
    var root = document.body.dataset.root || ".";
    var links = config.navigation
      .map(function (item) {
        return navigationItem(item, currentPage, root);
      })
      .join("");

    headerMount.innerHTML =
      '<header class="site-header">' +
      '<div class="site-header__bar page-width">' +
      '<a class="brand" href="' + utils.createSitePath(root, "") + '" aria-label="' +
      config.siteName + ' home">' +
      '<span class="brand__mark" aria-hidden="true">&lt;/&gt;</span>' +
      '<span class="brand__text"><span class="brand__kicker">T Level Digital</span>' +
      '<span class="brand__name">Software Development Hub</span></span></a>' +
      '<button class="nav-toggle" type="button" aria-expanded="false" ' +
      'aria-controls="global-navigation"><span class="nav-toggle__icon" aria-hidden="true">' +
      '<span></span><span></span><span></span></span><span>Menu</span></button>' +
      "</div>" +
      '<nav class="site-nav" id="global-navigation" aria-label="Main navigation">' +
      '<div class="page-width"><ul class="site-nav__list">' + links + "</ul></div>" +
      "</nav></header>";

    initialiseMenu(headerMount);
  }

  function initialiseMenu(headerMount) {
    var button = headerMount.querySelector(".nav-toggle");
    var navigation = headerMount.querySelector(".site-nav");
    var desktopQuery = window.matchMedia("(min-width: 48rem)");

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

    desktopQuery.addEventListener("change", function (event) {
      if (event.matches) {
        closeMenu(false);
      }
    });
  }

  function renderFooterDetails() {
    utils.setText("[data-current-phase]", config.currentPhase);
    utils.setText("[data-current-year]", String(new Date().getFullYear()));
  }

  utils.onReady(function () {
    renderHeader();
    renderFooterDetails();
  });
})();
