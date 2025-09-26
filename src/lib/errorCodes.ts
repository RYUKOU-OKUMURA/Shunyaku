// Centralized error codes and helpers for the app
// Keep codes stable to allow consistent detection and handling across modules.

export const ErrorCodes = {
  // General/network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // DeepL HTTP status mapping
  DEEPL_BAD_REQUEST: 'DEEPL_BAD_REQUEST', // 400
  DEEPL_FORBIDDEN: 'DEEPL_FORBIDDEN', // 403
  DEEPL_NOT_FOUND: 'DEEPL_NOT_FOUND', // 404
  DEEPL_REQUEST_TOO_LARGE: 'DEEPL_REQUEST_TOO_LARGE', // 413
  DEEPL_RATE_LIMIT_EXCEEDED: 'DEEPL_RATE_LIMIT_EXCEEDED', // 429
  DEEPL_QUOTA_EXCEEDED: 'DEEPL_QUOTA_EXCEEDED', // 456
  DEEPL_SERVICE_UNAVAILABLE: 'DEEPL_SERVICE_UNAVAILABLE', // 503
  DEEPL_UNKNOWN_ERROR: 'DEEPL_UNKNOWN_ERROR',

  // Translation workflow
  TRANSLATION_ERROR: 'TRANSLATION_ERROR',
  BATCH_TRANSLATION_ERROR: 'BATCH_TRANSLATION_ERROR',
  BATCH_PROCESSING_ERROR: 'BATCH_PROCESSING_ERROR',

  // Usage/languages
  USAGE_FETCH_ERROR: 'USAGE_FETCH_ERROR',
  LANGUAGES_FETCH_ERROR: 'LANGUAGES_FETCH_ERROR',

  // OCR
  OCR_SERVICE_ERROR: 'OCR_SERVICE_ERROR',
  OCR_PROCESSING_ERROR: 'OCR_PROCESSING_ERROR',

  // Clipboard
  CLIPBOARD_WRITE_ERROR: 'CLIPBOARD_WRITE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Map HTTP status code to standardized error code
export function mapHttpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCodes.DEEPL_BAD_REQUEST;
    case 403:
      return ErrorCodes.DEEPL_FORBIDDEN;
    case 404:
      return ErrorCodes.DEEPL_NOT_FOUND;
    case 413:
      return ErrorCodes.DEEPL_REQUEST_TOO_LARGE;
    case 429:
      return ErrorCodes.DEEPL_RATE_LIMIT_EXCEEDED;
    case 456:
      return ErrorCodes.DEEPL_QUOTA_EXCEEDED;
    case 503:
      return ErrorCodes.DEEPL_SERVICE_UNAVAILABLE;
    default:
      return ErrorCodes.DEEPL_UNKNOWN_ERROR;
  }
}

// Human-friendly messages for DeepL HTTP statuses
export function messageForStatus(status: number): string {
  const messages: Record<number, string> = {
    400: 'Bad request. Please check your request parameters.',
    403: 'Forbidden. Invalid API key or insufficient permissions.',
    404: 'Resource not found.',
    413: 'Request entity too large. Text is too long.',
    429: 'Too many requests. Rate limit exceeded.',
    456: 'Quota exceeded. You have reached your usage limit.',
    503: 'Service unavailable. Please try again later.',
  };
  return messages[status] || `HTTP ${status} error`;
}
