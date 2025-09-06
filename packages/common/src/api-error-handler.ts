/**
 * Utility for handling API errors consistently across services
 */
export interface ApiErrorResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

/**
 * Handle API errors in a consistent way across services
 * @param operation Function that performs the API operation
 * @param errorPrefix Prefix for the error message
 * @returns Standardized response with success status, data, and error details
 */
export async function handleApiOperation<T>(
  operation: () => Promise<T>,
  errorPrefix: string
): Promise<ApiErrorResponse<T>> {
  try {
    const data = await operation();
    return {
      success: true,
      data
    };
  } catch (e) {
    let errorMessage = e instanceof Error ? e.message : String(e);
    let errorDetails = undefined;

    if (e && typeof e === 'object' && 'status' in e && 'body' in e) {
      const apiError = e as {status: number; body: any; statusText: string};
      errorMessage = `${errorPrefix}: ${apiError.status} ${apiError.statusText}`;
      errorDetails = apiError.body;
    }

    return {
      success: false,
      error: errorMessage,
      details: errorDetails
    };
  }
}
