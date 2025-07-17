// Main Application Script
// Coordinates all modules and initializes the application

class App {
    constructor() {
        this.themeManager = null;
        this.init();
    }

    init() {
        // Initialize theme manager first
        this.themeManager = new ThemeManager();
        
        // Initialize PWA functionality
        this.initializePWA();
        
        // Initialize common functionality
        this.initializeCommonFeatures();
        
        // Log application start
        console.log('Voice-Enabled Bank Form Application initialized');
    }

    initializePWA() {
        // Register service worker for PWA functionality
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/static/service-worker.js')
                    .then((registration) => {
                        console.log('SW registered: ', registration);
                    })
                    .catch((registrationError) => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }

        // Handle install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button if needed
            const installButton = document.getElementById('installButton');
            if (installButton) {
                installButton.style.display = 'block';
                installButton.addEventListener('click', () => {
                    installButton.style.display = 'none';
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the install prompt');
                        }
                        deferredPrompt = null;
                    });
                });
            }
        });
    }

    initializeCommonFeatures() {
        // Hide loader when page loads
        window.addEventListener('load', () => {
            const formUtils = new FormUtils();
            formUtils.hideLoader();
        });

        // Handle network status
        this.handleNetworkStatus();
        
        // Initialize accessibility features
        this.initializeAccessibility();
    }

    handleNetworkStatus() {
        const showNetworkStatus = (online) => {
            const formUtils = new FormUtils();
            if (online) {
                formUtils.showNotification('Connection restored', 'success');
            } else {
                formUtils.showNotification('No internet connection', 'error');
            }
        };

        window.addEventListener('online', () => showNetworkStatus(true));
        window.addEventListener('offline', () => showNetworkStatus(false));
    }

    initializeAccessibility() {
        // Keyboard navigation support
        document.addEventListener('keydown', (e) => {
            // Escape key to close modals
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal[style*="block"]');
                modals.forEach(modal => {
                    modal.style.display = 'none';
                });
            }
            
            // Enter key to trigger voice input if focused on voice icon
            if (e.key === 'Enter' && e.target.classList.contains('voice-icon')) {
                e.target.click();
            }
        });

        // Add focus indicators for voice icons
        const voiceIcons = document.querySelectorAll('.voice-icon');
        voiceIcons.forEach(icon => {
            icon.setAttribute('tabindex', '0');
            icon.setAttribute('role', 'button');
        });
    }

    // Utility method to get current page type
    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('auth_form') || path === '/') {
            return 'auth';
        } else if (path.includes('bank_form')) {
            return 'bank';
        }
        return 'unknown';
    }

    // Method to check if user is authenticated
    isAuthenticated() {
        // This could be enhanced to check session storage or make an API call
        return document.cookie.includes('session=') || sessionStorage.getItem('authenticated') === 'true';
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

// Export for global access
window.App = App;
