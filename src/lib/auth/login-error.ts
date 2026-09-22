import { isAuthApiError } from "@supabase/supabase-js";

export type LoginErrorClassification = "INVALID_CREDENTIALS" | "AUTH_UNAVAILABLE";

export function classifyLoginError(error: unknown): LoginErrorClassification {
  if (!error) return "AUTH_UNAVAILABLE";

  if (isAuthApiError(error)) {
    const invalidCredentialsCodes = [
      "invalid_credentials",
      "email_not_confirmed",
      "phone_not_confirmed",
      "user_banned"
    ];

    if (error.code && invalidCredentialsCodes.includes(error.code)) {
      return "INVALID_CREDENTIALS";
    }

    // Infrastructure, availability or unmapped codes return AUTH_UNAVAILABLE
    // (e.g. unexpected_failure, request_timeout, hook_timeout, hook_timeout_after_retry, over_request_rate_limit)
    return "AUTH_UNAVAILABLE";
  }

  return "AUTH_UNAVAILABLE";
}
