export const AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED";
export const AUTH_FORBIDDEN = "AUTH_FORBIDDEN";
export const AUTH_INFRASTRUCTURE_UNAVAILABLE = "AUTH_INFRASTRUCTURE_UNAVAILABLE";
export const AUTH_CONFIGURATION_INVALID = "AUTH_CONFIGURATION_INVALID";

export type AuthorizationErrorCode =
  | typeof AUTH_UNAUTHORIZED
  | typeof AUTH_FORBIDDEN
  | typeof AUTH_INFRASTRUCTURE_UNAVAILABLE
  | typeof AUTH_CONFIGURATION_INVALID;

abstract class AuthorizationError extends Error {
  abstract readonly code: AuthorizationErrorCode;
}

export class UnauthorizedError extends AuthorizationError {
  readonly code = AUTH_UNAUTHORIZED;

  constructor() {
    super("Authentication required.");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AuthorizationError {
  readonly code = AUTH_FORBIDDEN;

  constructor() {
    super("Insufficient permissions.");
    this.name = "ForbiddenError";
  }
}

export class AuthInfrastructureError extends AuthorizationError {
  readonly code = AUTH_INFRASTRUCTURE_UNAVAILABLE;

  constructor() {
    super("Authentication infrastructure is unavailable.");
    this.name = "AuthInfrastructureError";
  }
}

export class AuthConfigurationError extends AuthorizationError {
  readonly code = AUTH_CONFIGURATION_INVALID;

  constructor() {
    super("Authorization configuration is invalid.");
    this.name = "AuthConfigurationError";
  }
}
