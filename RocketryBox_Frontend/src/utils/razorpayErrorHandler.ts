/**
 * Razorpay Error Handler
 * Handles various Razorpay errors and provides fallback mechanisms
 */

export interface RazorpayError {
  code?: string;
  description?: string;
  field?: string;
  reason?: string;
  source?: string;
  step?: string;
  metadata?: any;
}

export interface ErrorHandlerResponse {
  canRetry: boolean;
  userMessage: string;
  technicalMessage: string;
  suggestedAction: string;
  fallbackOptions?: string[];
}

export class RazorpayErrorHandler {

  /**
   * Handle Razorpay checkout errors
   */
  static handleCheckoutError(error: any): ErrorHandlerResponse {
    console.error('🚨 Razorpay Checkout Error:', error);

    // Handle network errors (500 Internal Server Error)
    if (error.status === 500 || error.statusCode === 500) {
      return {
        canRetry: true,
        userMessage: 'Payment service is temporarily unavailable. Please try again in a few minutes.',
        technicalMessage: 'Razorpay server returned 500 Internal Server Error',
        suggestedAction: 'Retry after 2-3 minutes or contact support',
        fallbackOptions: [
          'Wait 2-3 minutes and try again',
          'Clear browser cache and cookies',
          'Try using a different browser',
          'Contact customer support'
        ]
      };
    }

    // Handle authentication errors
    if (error.status === 401 || error.code === 'BAD_REQUEST_ERROR') {
      return {
        canRetry: false,
        userMessage: 'Payment configuration error. Please contact support.',
        technicalMessage: 'Razorpay authentication failed or invalid API key',
        suggestedAction: 'Contact technical support',
        fallbackOptions: [
          'Contact customer support',
          'Report this issue'
        ]
      };
    }

    // Handle validation errors
    if (error.status === 400) {
      return {
        canRetry: true,
        userMessage: 'There was an issue with your payment details. Please check and try again.',
        technicalMessage: 'Bad request - validation error',
        suggestedAction: 'Check payment details and retry',
        fallbackOptions: [
          'Verify all payment details are correct',
          'Try a different payment method',
          'Contact support if issue persists'
        ]
      };
    }

    // Handle network connectivity issues
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
      return {
        canRetry: true,
        userMessage: 'Network connection issue. Please check your internet connection and try again.',
        technicalMessage: 'Network connectivity error',
        suggestedAction: 'Check internet connection and retry',
        fallbackOptions: [
          'Check your internet connection',
          'Try again with a stable network',
          'Switch to mobile data if using WiFi'
        ]
      };
    }

    // Handle modal dismissed/cancelled
    if (error.reason === 'MODAL_DISMISSED') {
      return {
        canRetry: true,
        userMessage: 'Payment was cancelled. You can try again when ready.',
        technicalMessage: 'User dismissed payment modal',
        suggestedAction: 'User can retry when ready',
        fallbackOptions: [
          'Click "Pay Now" to try again',
          'Choose a different payment method'
        ]
      };
    }

    // Handle script loading errors
    if (error.message?.includes('Razorpay') && error.message?.includes('not loaded')) {
      return {
        canRetry: true,
        userMessage: 'Payment system is loading. Please refresh the page and try again.',
        technicalMessage: 'Razorpay script not loaded properly',
        suggestedAction: 'Refresh page and retry',
        fallbackOptions: [
          'Refresh the page',
          'Clear browser cache',
          'Try a different browser'
        ]
      };
    }

    // Handle account validation errors (likely cause of the 500 error)
    if (error.message?.includes('validate/account') || error.url?.includes('validate/account')) {
      return {
        canRetry: true,
        userMessage: 'Payment service validation failed. This is usually temporary. Please try again.',
        technicalMessage: 'Razorpay account validation API returned error',
        suggestedAction: 'Wait a few minutes and retry',
        fallbackOptions: [
          'Wait 2-3 minutes and try again',
          'Try refreshing the page',
          'Clear browser cache and cookies',
          'Contact support if issue persists'
        ]
      };
    }

    // Default error handling
    return {
      canRetry: true,
      userMessage: 'An unexpected error occurred during payment. Please try again.',
      technicalMessage: error.message || 'Unknown Razorpay error',
      suggestedAction: 'Retry or contact support',
      fallbackOptions: [
        'Try again',
        'Refresh the page',
        'Contact customer support'
      ]
    };
  }

  /**
   * Enhanced Razorpay initialization with error handling
   */
  static initializeRazorpay(options: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if Razorpay is loaded
      if (typeof (window as any).Razorpay === 'undefined') {
        reject(new Error('Razorpay library is not loaded. Please refresh the page and try again.'));
        return;
      }

      // Add error handling to the options
      const enhancedOptions = {
        ...options,
        modal: {
          ...options.modal,
          ondismiss: () => {
            console.log('💔 Payment modal dismissed by user');
            reject({ reason: 'MODAL_DISMISSED', message: 'Payment was cancelled by user' });
          },
          escape: true,
          backdropclose: false // Prevent accidental closure
        },
        // Add retry configuration
        retry: {
          enabled: true,
          max_count: 3
        },
        // Add timeout handling
        timeout: 300, // 5 minutes
        // Enhanced handler with error handling
        handler: (response: any) => {
          console.log('✅ Payment successful:', response);
          resolve(response);
        }
      };

      try {
        const razorpay = new (window as any).Razorpay(enhancedOptions);

        // Handle payment failures
        razorpay.on('payment.failed', (response: any) => {
          console.error('💥 Payment failed:', response);
          const errorHandler = this.handleCheckoutError(response.error);
          reject({
            ...response.error,
            errorHandler
          });
        });

        // Open the payment modal
        razorpay.open();

      } catch (error) {
        console.error('🚨 Failed to initialize Razorpay:', error);
        reject(error);
      }
    });
  }

  /**
   * Retry mechanism for failed payments
   */
  static async retryPayment(originalOptions: any, maxRetries: number = 3): Promise<any> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Payment attempt ${attempt}/${maxRetries}`);

        // Add delay between retries
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }

        const result = await this.initializeRazorpay(originalOptions);
        console.log(`✅ Payment successful on attempt ${attempt}`);
        return result;

      } catch (error) {
        console.error(`❌ Payment attempt ${attempt} failed:`, error);
        lastError = error;

        // Don't retry for certain errors
        const errorHandler = this.handleCheckoutError(error);
        if (!errorHandler.canRetry) {
          console.log('🚫 Error is not retryable, stopping attempts');
          break;
        }
      }
    }

    console.error('💀 All payment attempts failed');
    throw lastError;
  }

  /**
   * Check Razorpay service status
   */
  static async checkServiceStatus(): Promise<{ isHealthy: boolean; message: string }> {
    try {
      // Try to load Razorpay script if not already loaded
      if (typeof (window as any).Razorpay === 'undefined') {
        await this.loadRazorpayScript();
      }

      return {
        isHealthy: true,
        message: 'Razorpay service is available'
      };
    } catch (error) {
      return {
        isHealthy: false,
        message: 'Razorpay service is not available'
      };
    }
  }

  /**
   * Load Razorpay script dynamically
   */
  static loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof (window as any).Razorpay !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        console.log('✅ Razorpay script loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Failed to load Razorpay script');
        reject(new Error('Failed to load Razorpay script'));
      };

      document.head.appendChild(script);
    });
  }
}
