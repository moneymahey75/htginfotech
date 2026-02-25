import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Preload critical resources
const preloadResources = async () => {
  const criticalResources = [
    '/htginfotech-logo.png'
  ];

  const promises = criticalResources.map((src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve; // Resolve even on error to not block the app
      img.src = src;
    });
  });

  await Promise.all(promises);
};

// Hide loading screen
const hideLoader = () => {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.classList.add('hidden');
    // Remove from DOM after animation completes
    setTimeout(() => {
      loader.remove();
    }, 500);
  }
};

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

// Initialize app
const startApp = async () => {
  try {
    // Preload critical resources first
    await preloadResources();

    // Initialize app
    await initializeApp();

    // Render React app
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    // Wait for React to render, then hide loader
    setTimeout(hideLoader, 100);
  } catch (error) {
    console.error('Error initializing app:', error);
    // Hide loader even if there's an error
    hideLoader();
  }
};

startApp();
