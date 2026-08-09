(function () {
  "use strict";

  var config = window.SUPABASE_CONFIG || {};
  var refreshInFlight = null;

  function SupabaseClientError(code, message) {
    this.name = "SupabaseClientError";
    this.code = code || "SUPABASE_ERROR";
    this.message = message || "The Supabase service could not complete the request.";
  }

  SupabaseClientError.prototype = Object.create(Error.prototype);
  SupabaseClientError.prototype.constructor = SupabaseClientError;

  function projectUrl() {
    return typeof config.projectUrl === "string"
      ? config.projectUrl.trim().replace(/\/+$/, "")
      : "";
  }

  function publishableKey() {
    return typeof config.publishableKey === "string"
      ? config.publishableKey.trim()
      : "";
  }

  function isConfigured() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(projectUrl()) &&
      Boolean(publishableKey());
  }

  function requireConfiguration() {
    if (!isConfigured()) {
      throw new SupabaseClientError("CONFIGURATION_ERROR");
    }
  }

  function storageKey() {
    return typeof config.sessionStorageKey === "string" && config.sessionStorageKey.trim()
      ? config.sessionStorageKey.trim()
      : "tlevel.softwareDevelopment.supabaseAuthSession.v1";
  }

  function validSession(session) {
    return Boolean(
      session &&
      typeof session === "object" &&
      typeof session.accessToken === "string" && session.accessToken &&
      typeof session.refreshToken === "string" && session.refreshToken &&
      Number.isFinite(session.expiresAt) &&
      typeof session.userId === "string" && session.userId
    );
  }

  function getSession() {
    var stored;
    try {
      stored = window.localStorage.getItem(storageKey());
    } catch (error) {
      return null;
    }

    if (!stored) {
      return null;
    }

    try {
      var session = JSON.parse(stored);
      if (!validSession(session)) {
        clearSession();
        return null;
      }
      return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        userId: session.userId
      };
    } catch (error) {
      clearSession();
      return null;
    }
  }

  function saveSession(session) {
    if (!validSession(session)) {
      throw new SupabaseClientError("INVALID_AUTH_RESPONSE");
    }
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify(session));
    } catch (error) {
      throw new SupabaseClientError("SESSION_STORAGE_ERROR");
    }
    return getSession();
  }

  function clearSession() {
    try {
      window.localStorage.removeItem(storageKey());
      return true;
    } catch (error) {
      return false;
    }
  }

  function sessionFromAuthPayload(payload) {
    var expiresAt = payload && Number(payload.expires_at);
    if (!Number.isFinite(expiresAt) && payload && Number.isFinite(Number(payload.expires_in))) {
      expiresAt = Math.floor(Date.now() / 1000) + Number(payload.expires_in);
    }
    var session = {
      accessToken: payload && typeof payload.access_token === "string"
        ? payload.access_token : "",
      refreshToken: payload && typeof payload.refresh_token === "string"
        ? payload.refresh_token : "",
      expiresAt: expiresAt,
      userId: payload && payload.user && typeof payload.user.id === "string"
        ? payload.user.id : ""
    };
    return saveSession(session);
  }

  function responseError(payload, status) {
    var code = payload && (
      payload.code || payload.error_code || payload.error
    );
    var message = payload && (
      payload.message || payload.error_description || payload.msg
    );
    return new SupabaseClientError(
      typeof code === "string" && code ? code : "HTTP_" + String(status || 0),
      typeof message === "string" && message
        ? message
        : "The Supabase request was not successful."
    );
  }

  function fetchJson(path, options) {
    options = options || {};
    try {
      requireConfiguration();
    } catch (error) {
      return Promise.reject(error);
    }

    var controller = typeof AbortController === "function"
      ? new AbortController()
      : null;
    var timeout = window.setTimeout(function () {
      if (controller) controller.abort();
    }, config.requestTimeoutMs || 15000);
    var headers = Object.assign({
      apikey: publishableKey(),
      Accept: "application/json"
    }, options.headers || {});
    if (options.schema) {
      headers["Accept-Profile"] = options.schema;
      headers["Content-Profile"] = options.schema;
    }
    if (options.accessToken) {
      headers.Authorization = "Bearer " + options.accessToken;
    }

    return window.fetch(projectUrl() + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body,
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      return response.text().then(function (text) {
        var payload = null;
        if (text) {
          try {
            payload = JSON.parse(text);
          } catch (error) {
            throw new SupabaseClientError("INVALID_RESPONSE");
          }
        }
        if (!response.ok) {
          throw responseError(payload, response.status);
        }
        return payload;
      });
    }).catch(function (error) {
      if (error && error.name === "SupabaseClientError") {
        throw error;
      }
      throw new SupabaseClientError("NETWORK_ERROR");
    }).then(function (payload) {
      window.clearTimeout(timeout);
      return payload;
    }, function (error) {
      window.clearTimeout(timeout);
      throw error;
    });
  }

  function refreshSession() {
    var session = getSession();
    if (!session) {
      return Promise.reject(new SupabaseClientError("AUTHENTICATION_REQUIRED"));
    }
    if (refreshInFlight) {
      return refreshInFlight;
    }
    refreshInFlight = fetchJson("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refreshToken })
    }).then(sessionFromAuthPayload).then(function (nextSession) {
      refreshInFlight = null;
      return nextSession;
    }, function (error) {
      refreshInFlight = null;
      clearSession();
      throw error;
    });
    return refreshInFlight;
  }

  function validAccessSession() {
    var session = getSession();
    if (!session) {
      return Promise.reject(new SupabaseClientError("AUTHENTICATION_REQUIRED"));
    }
    if (session.expiresAt > Math.floor(Date.now() / 1000) + 60) {
      return Promise.resolve(session);
    }
    return refreshSession();
  }

  function authenticatedRequest(path, options) {
    return validAccessSession().then(function (session) {
      return fetchJson(path, Object.assign({}, options || {}, {
        accessToken: session.accessToken
      }));
    });
  }

  function signInWithPassword(email, password) {
    var valid = typeof email === "string" && email.trim() &&
      typeof password === "string" && password;
    if (!valid) {
      return Promise.reject(new SupabaseClientError("INVALID_AUTH_CREDENTIALS"));
    }
    return fetchJson("/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password: password
      })
    }).then(sessionFromAuthPayload);
  }

  function signOut() {
    var session = getSession();
    if (!session) {
      clearSession();
      return Promise.resolve(true);
    }
    return fetchJson("/auth/v1/logout", {
      method: "POST",
      accessToken: session.accessToken
    }).then(function () {
      clearSession();
      return true;
    }, function (error) {
      clearSession();
      throw error;
    });
  }

  window.SupabaseClient = Object.freeze({
    isConfigured: isConfigured,
    getSession: getSession,
    hasSession: function () { return Boolean(getSession()); },
    clearSession: clearSession,
    signInWithPassword: signInWithPassword,
    signOut: signOut,
    request: authenticatedRequest,
    Error: SupabaseClientError
  });
})();
