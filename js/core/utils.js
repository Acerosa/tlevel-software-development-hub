(function () {
  "use strict";

  window.AppUtils = Object.freeze({
    onReady: function (callback) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback, { once: true });
        return;
      }

      callback();
    },

    createSitePath: function (root, path) {
      var cleanRoot = root || ".";
      return path ? cleanRoot + "/" + path : cleanRoot + "/";
    },

    setText: function (selector, value) {
      var element = document.querySelector(selector);
      if (element) {
        element.textContent = value;
      }
    }
  });
})();
