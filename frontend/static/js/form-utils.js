// Form Utilities Module
// Handles form validation, UI helpers, and common form operations

class FormUtils {
    constructor() {
        this.initializeEventListeners();
    }

    // Error and success message handling
    displayErrorMessage(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('active');
            
            // Add shake animation for emphasis
            errorElement.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                errorElement.style.animation = '';
            }, 500);
        }
    }

    clearErrorMessage(elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close" aria-label="Close notification">×</button>
        `;
        
        document.body.appendChild(notification);
        
        // Add close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.closeNotification(notification);
        });
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto-close after 5 seconds
        setTimeout(() => {
            this.closeNotification(notification);
        }, 5000);
    }

    closeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    // Password visibility toggle
    togglePasswordVisibility(passwordFieldId, iconId) {
        const passwordField = document.getElementById(passwordFieldId);
        const icon = document.getElementById(iconId);

        if (passwordField && icon) {
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                icon.textContent = '🙈';
                icon.setAttribute('aria-label', 'Hide password');
            } else {
                passwordField.type = 'password';
                icon.textContent = '👁️';
                icon.setAttribute('aria-label', 'Show password');
            }
        }
    }

    // Input clearing functionality
    clearInput(inputId, errorId) {
        const inputElement = document.getElementById(inputId);
        const errorElement = document.getElementById(errorId);
        
        if (inputElement) {
            inputElement.value = '';
            inputElement.focus();
            
            // Trigger events for any listeners
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        if (errorElement) {
            this.clearErrorMessage(errorId);
        }
    }

    // Email validation
    validateEmail(email) {
        const allowedDomains = [
            'gmail.com', 'yahoo.com', 'outlook.com', 
            'hotmail.com', 'aol.com', 'icloud.com',
            'protonmail.com', 'zoho.com'
        ];
        
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        
        if (!emailRegex.test(email)) {
            return false;
        }
        
        const domain = email.split('@')[1].toLowerCase();
        return allowedDomains.includes(domain) || domain.endsWith('.edu') || domain.endsWith('.edu.in');
    }

    // Password validation
    validatePassword(password) {
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const isLongEnough = password.length >= 8;
        
        return hasUppercase && hasLowercase && hasNumbers && hasSpecial && isLongEnough;
    }

    // Username validation
    validateUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    }

    // Loading state management
    hideLoader() {
        const loaders = [
            document.querySelector('.loader'),
            document.querySelector('.loader-overlay'),
            document.querySelector('.loading-overlay')
        ];
        
        loaders.forEach(loader => {
            if (loader) {
                loader.style.display = 'none';
            }
        });
    }

    showLoader() {
        const loaders = [
            document.querySelector('.loader'),
            document.querySelector('.loader-overlay'),
            document.querySelector('.loading-overlay')
        ];
        
        loaders.forEach(loader => {
            if (loader) {
                loader.style.display = loader.classList.contains('loading-overlay') ? 'flex' : 'block';
            }
        });
    }

    // Form validation helpers
    validateRequired(value, fieldName) {
        if (!value || value.trim() === '') {
            return {
                isValid: false,
                message: `${fieldName} is required`
            };
        }
        return { isValid: true };
    }

    validateLength(value, minLength, maxLength, fieldName) {
        if (value.length < minLength) {
            return {
                isValid: false,
                message: `${fieldName} must be at least ${minLength} characters`
            };
        }
        if (maxLength && value.length > maxLength) {
            return {
                isValid: false,
                message: `${fieldName} must be no more than ${maxLength} characters`
            };
        }
        return { isValid: true };
    }

    validatePattern(value, pattern, fieldName, patternDescription) {
        if (!pattern.test(value)) {
            return {
                isValid: false,
                message: `${fieldName} ${patternDescription}`
            };
        }
        return { isValid: true };
    }

    // Utility functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Event listeners for common functionality
    initializeEventListeners() {
        // Initialize clear button functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('clear-icon')) {
                const inputId = this.getClearInputId(e.target.id);
                const errorId = `${inputId}Error`;
                this.clearInput(inputId, errorId);
            }
        });

        // Add keyboard navigation for form elements
        document.addEventListener('keydown', (e) => {
            // Enter key on buttons
            if (e.key === 'Enter' && e.target.classList.contains('voice-icon')) {
                e.target.click();
            }
            
            // Escape key to clear current input
            if (e.key === 'Escape' && e.target.matches('input, textarea')) {
                const inputId = e.target.id;
                const errorId = `${inputId}Error`;
                this.clearInput(inputId, errorId);
            }
        });

        // Add focus management
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, textarea, select')) {
                e.target.closest('.form-group')?.classList.add('focused');
            }
        });

        document.addEventListener('focusout', (e) => {
            if (e.target.matches('input, textarea, select')) {
                e.target.closest('.form-group')?.classList.remove('focused');
            }
        });
    }

    getClearInputId(clearButtonId) {
        // Map clear button IDs to input IDs
        const idMap = {
            'clearSignInEmail': 'signInEmail',
            'clearSignInPassword': 'signInPassword',
            'clearSignUpUsername': 'signUpUsername',
            'clearSignUpEmail': 'signUpEmail',
            'clearSignUpPassword': 'signUpPassword',
            'clearForgotPasswordEmail': 'forgotPasswordEmail',
            'clearFullName': 'fullName',
            'clearPhoneNumber': 'phoneNumber',
            'clearAddress': 'address',
            'clearInitialDeposit': 'initialDeposit'
        };
        
        return idMap[clearButtonId] || clearButtonId.replace('clear', '').toLowerCase();
    }

    // Form submission helpers
    serializeForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            
            // Clear all error messages
            const errorElements = form.querySelectorAll('.error-message');
            errorElements.forEach(element => {
                this.clearErrorMessage(element.id);
            });
        }
    }
}

// Add shake animation to CSS if not already present
if (!document.querySelector('#shake-animation')) {
    const style = document.createElement('style');
    style.id = 'shake-animation';
    style.textContent = `
        @keyframes shake {
            0%, 20%, 40%, 60%, 80%, 100% {
                transform: translateX(0);
            }
            10%, 30%, 50%, 70%, 90% {
                transform: translateX(-5px);
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for use in other modules
window.FormUtils = FormUtils;
