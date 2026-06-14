'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Result, Button } from 'antd';

/** Props for the ErrorBoundary component. */
interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Optional fallback UI to render on error */
  fallback?: ReactNode;
  /** Optional callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/** State for the ErrorBoundary component. */
interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that occurred */
  error: Error | null;
}

/**
 * React Error Boundary that catches JavaScript errors in child components.
 * Renders a fallback UI instead of crashing the entire app.
 *
 * @param props - {@link ErrorBoundaryProps}
 * @returns JSX element wrapping children with error boundary.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />} onError={logError}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle={this.state.error?.message ?? 'An unexpected error occurred.'}
          extra={
            <Button type="primary" onClick={this.handleReset}>
              Try again
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
