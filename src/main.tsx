import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize Redis only in server environments
const initializeApp = async () => {
  // Only try Redis initialization in server-side environments
  if (typeof window === 'undefined') {
    try {
      const { initializeRedis } = await import('./lib/redis');
      const connected = await initializeRedis();
      if (connected) {
        console.log('🚀 Redis initialized successfully for MLM tree optimization');
      } else {
        console.log('📊 Running in database-only mode (Redis not available)');
      }
    } catch (error) {
      console.log('📊 Browser environment detected - Redis not available');
    }
  } else {
    console.log('📊 Browser environment - Running in database-only mode');
  }
};

// Add global error handler for production debugging
window.addEventListener('error', (event) => {
  console.error('Global error:', {
    message: event.error?.message || event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise
  });
});

// Initialize app
initializeApp();

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
  document.body.innerHTML = '<div style="padding: 20px; font-family: sans-serif;"><h1>Error: Root element not found</h1><p>The application failed to initialize. Please check the console for errors.</p></div>';
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
