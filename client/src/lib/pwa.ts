// PWA Service Worker registration and utilities

let deferredPrompt: any = null;

// Register service worker
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
      
      // Update available
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              if (confirm('A new version of the app is available. Refresh to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// Handle install prompt
export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Store the event so it can be triggered later
    (window as any).deferredPrompt = e;
  });
}

// Show install prompt
export async function showInstallPrompt() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    (window as any).deferredPrompt = null;
    return outcome === 'accepted';
  }
  return false;
}

// Check if app is installed
export function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// Request notification permission
export async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// Initialize PWA features
export function initializePWA() {
  registerServiceWorker();
  setupInstallPrompt();
  
  // Add to home screen prompt for iOS
  if (isIOSDevice() && !isAppInstalled()) {
    // Show iOS install instructions if needed
    console.log('iOS device detected - app can be added to home screen');
  }
}

// Detect iOS devices
function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Check for app updates
export async function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
    }
  }
}