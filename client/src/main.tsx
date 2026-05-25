// ═══════════════════════════════════════════════════════════
// MEDHUB — React Entry Point
// ═══════════════════════════════════════════════════════════

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.js';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: (failureCount, error: unknown) => {
                // Don't retry on 401/403
                if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
                    return false;
                }
                return failureCount < 2;
            },
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>,
);
