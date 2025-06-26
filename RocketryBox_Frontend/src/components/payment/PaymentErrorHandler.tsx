import React, { useState } from 'react';
import { ErrorHandlerResponse, RazorpayErrorHandler } from '../../utils/razorpayErrorHandler';

interface PaymentErrorHandlerProps {
  error: any;
  onRetry: () => void;
  onClose: () => void;
}

export const PaymentErrorHandler: React.FC<PaymentErrorHandlerProps> = ({
  error,
  onRetry,
  onClose
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const errorInfo: ErrorHandlerResponse = RazorpayErrorHandler.handleCheckoutError(error);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Payment Issue</h3>
        </div>

        <div className="mb-4">
          <p className="text-gray-700 mb-2">{errorInfo.userMessage}</p>

          {errorInfo.fallbackOptions && errorInfo.fallbackOptions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-600 mb-2">Try these solutions:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {errorInfo.fallbackOptions.map((option, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {option}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {errorInfo.canRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Retrying...
                </span>
              ) : (
                'Try Again'
              )}
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>

        {/* Technical details for debugging */}
        <details className="mt-4">
          <summary className="text-sm text-gray-500 cursor-pointer">Technical Details</summary>
          <div className="mt-2 text-xs text-gray-400 bg-gray-100 p-2 rounded">
            <p><strong>Error:</strong> {errorInfo.technicalMessage}</p>
            <p><strong>Action:</strong> {errorInfo.suggestedAction}</p>
            {error.statusCode && <p><strong>Status Code:</strong> {error.statusCode}</p>}
            {error.code && <p><strong>Error Code:</strong> {error.code}</p>}
          </div>
        </details>
      </div>
    </div>
  );
};

export default PaymentErrorHandler;
