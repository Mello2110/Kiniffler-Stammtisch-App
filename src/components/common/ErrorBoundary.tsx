"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallbackTitle?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component that catches render errors in child component trees.
 * Prevents a single broken component from crashing the entire page.
 * Must be a class component — React's getDerivedStateFromError only works in class components.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col items-center gap-3 text-center mt-4">
                    <AlertTriangle className="h-8 w-8 text-destructive/70" />
                    <div>
                        <p className="font-semibold text-sm text-destructive/90">
                            {this.props.fallbackTitle ?? "Dieser Bereich konnte nicht geladen werden."}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ein unerwarteter Fehler ist aufgetreten. Die übrigen Inhalte der Seite sind davon nicht betroffen.
                        </p>
                    </div>
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 border rounded-md px-3 py-1.5 hover:bg-muted"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Erneut versuchen
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
