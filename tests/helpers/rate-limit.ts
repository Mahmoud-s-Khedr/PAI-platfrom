export const rateLimitBindings = {
  AUTH_RATE_LIMITER: { limit: async () => ({ success: true }) },
  AUTHORING_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
