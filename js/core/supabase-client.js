(function () {
  "use strict";

  var config = window.SUPABASE_CONFIG || {};
  var hostedClient = null;
  var hostedSession = null;
  var refreshInFlight = null;

  function SupabaseClientError(code, message, status) {
    this.name = "SupabaseClientError";
    this.code = code || "SUPABASE_ERROR";
    this.message = message || "The Supabase service could not complete the request.";
    this.status = status || 0;
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

  function hasValidConfiguration() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(projectUrl()) &&
      Boolean(publishableKey());
  }

  function library() {
    return window.supabase && typeof window.supabase.createClient === "function"
      ? window.supabase
      : null;
  }

  function client() {
    var sdk = library();
    if (!sdk || !hasValidConfiguration()) {
      return null;
    }
    if (!hostedClient) {
      hostedClient = sdk.createClient(projectUrl(), publishableKey(), {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      });
    }
    return hostedClient;
  }

  function requireConfiguration() {
    if (!hasValidConfiguration()) {
      throw new SupabaseClientError("CONFIGURATION_ERROR");
    }
  }

  /*
   * This small REST fallback exists for the repository's VM test harnesses,
   * which do not load the browser SDK. Production pages load @supabase/supabase-js
   * and the SDK owns Auth persistence and token refresh.
   */
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

  function fallbackGetSession() {
    var stored;
    try {
      stored = window.localStorage && window.localStorage.getItem(storageKey());
    } catch (error) {
      return null;
    }
    if (!stored) {
      return null;
    }
    try {
      var session = JSON.parse(stored);
      return validSession(session) ? session : null;
    } catch (error) {
      return null;
    }
  }

  function fallbackSaveSession(session) {
    if (!validSession(session)) {
      throw new SupabaseClientError("INVALID_AUTH_RESPONSE");
    }
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify(session));
    } catch (error) {
      throw new SupabaseClientError("SESSION_STORAGE_ERROR");
    }
    return session;
  }

  function clearSession() {
    hostedSession = null;
    var activeClient = client();
    if (activeClient) {
      if (activeClient.auth && typeof activeClient.auth.signOut === "function") {
        activeClient.auth.signOut().catch(function () {});
      }
      return true;
    }
    try {
      window.localStorage.removeItem(storageKey());
      return true;
    } catch (error) {
      return false;
    }
  }

  function normaliseHostedSession(session) {
    hostedSession = session || null;
    return hostedSession;
  }

  function responseError(payload, status) {
    var code = payload && (payload.code || payload.error_code || payload.error);
    var message = payload && (payload.message || payload.error_description || payload.msg);
    return new SupabaseClientError(
      typeof code === "string" && code ? code : "HTTP_" + String(status || 0),
      typeof message === "string" && message
        ? message
        : "The Supabase request was not successful.",
      status
    );
  }

  function fetchJson(path, options) {
    options = options || {};
    try {
      requireConfiguration();
    } catch (error) {
      return Promise.reject(error);
    }

    var controller = typeof AbortController === "function" ? new AbortController() : null;
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

  function getSession() {
    return hostedClient ? hostedSession : fallbackGetSession();
  }

  function getSessionAsync() {
    var activeClient = client();
    if (!activeClient) {
      return Promise.resolve(fallbackGetSession());
    }
    return activeClient.auth.getSession().then(function (result) {
      if (result.error) {
        throw new SupabaseClientError(
          result.error.code || "AUTH_SESSION_ERROR",
          result.error.message
        );
      }
      return normaliseHostedSession(result.data && result.data.session);
    });
  }

  function refreshSession() {
    if (client()) {
      return getSessionAsync();
    }
    var session = fallbackGetSession();
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
    }).then(function (payload) {
      var next = {
        accessToken: payload && payload.access_token || "",
        refreshToken: payload && payload.refresh_token || "",
        expiresAt: Number(payload && payload.expires_at),
        userId: payload && payload.user && payload.user.id || ""
      };
      return fallbackSaveSession(next);
    }).then(function (nextSession) {
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
    return getSessionAsync().then(function (session) {
      if (!session) {
        throw new SupabaseClientError("AUTHENTICATION_REQUIRED");
      }
      if (client() || session.expiresAt > Math.floor(Date.now() / 1000) + 60) {
        return session;
      }
      return refreshSession();
    });
  }

  function authenticatedRequest(path, options) {
    return validAccessSession().then(function (session) {
      var accessToken = session.access_token || session.accessToken;
      return fetchJson(path, Object.assign({}, options || {}, {
        accessToken: accessToken
      }));
    });
  }

  function signInWithPassword(email, password) {
    var valid = typeof email === "string" && email.trim() &&
      typeof password === "string" && password;
    if (!valid) {
      return Promise.reject(new SupabaseClientError("INVALID_AUTH_CREDENTIALS"));
    }
    var activeClient = client();
    if (activeClient) {
      return activeClient.auth.signInWithPassword({
        email: email.trim(),
        password: password
      }).then(function (result) {
        if (result.error) {
          throw new SupabaseClientError(
            result.error.code || "AUTHENTICATION_FAILED",
            result.error.message
          );
        }
        return normaliseHostedSession(result.data && result.data.session);
      });
    }
    return fetchJson("/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password: password })
    }).then(function (payload) {
      return fallbackSaveSession({
        accessToken: payload && payload.access_token || "",
        refreshToken: payload && payload.refresh_token || "",
        expiresAt: Number(payload && payload.expires_at),
        userId: payload && payload.user && payload.user.id || ""
      });
    });
  }

  function signOut() {
    var activeClient = client();
    if (activeClient) {
      return activeClient.auth.signOut().then(function (result) {
        if (result.error) {
          throw new SupabaseClientError("SIGN_OUT_FAILED", result.error.message);
        }
        clearSession();
        return true;
      });
    }
    var session = fallbackGetSession();
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

  function onAuthStateChange(listener) {
    var activeClient = client();
    if (!activeClient || typeof listener !== "function") {
      return function () {};
    }
    var subscription = activeClient.auth.onAuthStateChange(function (event, session) {
      normaliseHostedSession(session);
      listener(event, session);
    });
    return function () {
      if (subscription && subscription.data && subscription.data.subscription) {
        subscription.data.subscription.unsubscribe();
      }
    };
  }

  window.SupabaseClient = Object.freeze({
    isConfigured: hasValidConfiguration,
    hasSdk: function () { return Boolean(client()); },
    getClient: client,
    getSession: getSession,
    getSessionAsync: getSessionAsync,
    hasSession: function () { return Boolean(getSession()); },
    clearSession: clearSession,
    signInWithPassword: signInWithPassword,
    signOut: signOut,
    onAuthStateChange: onAuthStateChange,
    request: authenticatedRequest,
    Error: SupabaseClientError
  });
})();
