// Bank Form Module
// Handles bank form submission and related functionality

class BankFormManager {
    constructor() {
        this.apiClient = new ApiClient();
        this.formUtils = new FormUtils();
        this.voiceRecognition = new VoiceRecognition();
        this.init();
    }

    init() {
        this.initializeFormHandler();
        this.initializeVoiceControls();
        this.initializeLogoutHandler();
        this.initializeInputValidation();
        this.initializeClearButtons();
    }

    initializeFormHandler() {
        const bankForm = document.getElementById('bankForm');
        if (bankForm) {
            bankForm.addEventListener('submit', (e) => this.handleFormSubmission(e));
        }
    }

    initializeVoiceControls() {
        const voiceFields = [
            { button: 'voiceFullName', input: 'fullName' },
            { button: 'voicePhone', input: 'phoneNumber' },
            { button: 'voiceAddress', input: 'address' },
            { button: 'voiceDeposit', input: 'initialDeposit' }
        ];

        voiceFields.forEach(({ button, input }) => {
            const element = document.getElementById(button);
            if (element) {
                element.addEventListener('click', () => {
                    this.voiceRecognition.startVoiceInput(input);
                });
            }
        });
    }

    initializeLogoutHandler() {
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    initializeClearButtons() {
        const clearFields = [
            { button: 'clearFullName', input: 'fullName', error: 'fullNameError' },
            { button: 'clearPhoneNumber', input: 'phoneNumber', error: 'phoneNumberError' },
            { button: 'clearAddress', input: 'address', error: 'addressError' },
            { button: 'clearInitialDeposit', input: 'initialDeposit', error: 'initialDepositError' }
        ];

        clearFields.forEach(({ button, input, error }) => {
            const element = document.getElementById(button);
            if (element) {
                element.addEventListener('click', () => {
                    this.formUtils.clearInput(input, error);
                });
            }
        });
    }

    initializeInputValidation() {
        // Real-time validation for form fields
        const formFields = [
            { id: 'fullName', validator: this.validateFullName.bind(this) },
            { id: 'phoneNumber', validator: this.validatePhoneNumber.bind(this) },
            { id: 'address', validator: this.validateAddress.bind(this) },
            { id: 'initialDeposit', validator: this.validateInitialDeposit.bind(this) },
            { id: 'dateOfBirth', validator: this.validateDateOfBirth.bind(this) },
            { id: 'accountType', validator: this.validateAccountType.bind(this) }
        ];

        formFields.forEach(({ id, validator }) => {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener('input', () => validator(field.value.trim()));
                field.addEventListener('blur', () => validator(field.value.trim()));
            }
        });
    }

    validateFullName(value) {
        const errorId = 'fullNameError';
        
        if (!value) {
            this.formUtils.clearErrorMessage(errorId);
            return true; // Don't show error for empty field during typing
        }

        const isValid = value.length >= 2 && /^[a-zA-Z\s]+$/.test(value);
        const errorMessage = 'Full name must be at least 2 characters and contain only letters and spaces';

        if (isValid) {
            this.formUtils.clearErrorMessage(errorId);
        } else {
            this.formUtils.displayErrorMessage(errorId, errorMessage);
        }

        return isValid;
    }

    validatePhoneNumber(value) {
        const errorId = 'phoneNumberError';
        
        if (!value) {
            this.formUtils.clearErrorMessage(errorId);
            return true;
        }

        const cleanedValue = value.replace(/\D/g, '');
        const isValid = cleanedValue.length === 10;
        const errorMessage = 'Phone number must be exactly 10 digits';

        if (isValid) {
            this.formUtils.clearErrorMessage(errorId);
        } else {
            this.formUtils.displayErrorMessage(errorId, errorMessage);
        }

        return isValid;
    }

    validateAddress(value) {
        const errorId = 'addressError';
        
        if (!value) {
            this.formUtils.clearErrorMessage(errorId);
            return true;
        }

        const isValid = value.length >= 10;
        const errorMessage = 'Address must be at least 10 characters';

        if (isValid) {
            this.formUtils.clearErrorMessage(errorId);
        } else {
            this.formUtils.displayErrorMessage(errorId, errorMessage);
        }

        return isValid;
    }

    validateInitialDeposit(value) {
        const errorId = 'initialDepositError';
        
        if (!value) {
            this.formUtils.clearErrorMessage(errorId);
            return true;
        }

        const amount = parseFloat(value);
        const isValid = !isNaN(amount) && amount >= 1000;
        const errorMessage = 'Initial deposit must be at least ₹1000';

        if (isValid) {
            this.formUtils.clearErrorMessage(errorId);
        } else {
            this.formUtils.displayErrorMessage(errorId, errorMessage);
        }

        return isValid;
    }

    validateDateOfBirth(value) {
        const errorId = 'dateOfBirthError';
        
        if (!value) {
            this.formUtils.clearErrorMessage(errorId);
            return true;
        }

        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        const isValid = age >= 18 && age <= 100;
        const errorMessage = 'You must be between 18 and 100 years old';

        if (isValid) {
            this.formUtils.clearErrorMessage(errorId);
        } else {
            this.formUtils.displayErrorMessage(errorId, errorMessage);
        }

        return isValid;
    }

    validateAccountType(value) {
        const errorId = 'accountTypeError';
        
        if (!value) {
            this.formUtils.clearErrorMessage(errorId);
            return true;
        }

        const validTypes = ['savings', 'current', 'fd'];
        const isValid = validTypes.includes(value);
        const errorMessage = 'Please select a valid account type';

        if (isValid) {
            this.formUtils.clearErrorMessage(errorId);
        } else {
            this.formUtils.displayErrorMessage(errorId, errorMessage);
        }

        return isValid;
    }

    async handleFormSubmission(event) {
        event.preventDefault();

        // Validate all fields
        const requiredFields = [
            { id: 'fullName', validator: this.validateFullName.bind(this), name: 'Full Name' },
            { id: 'dateOfBirth', validator: this.validateDateOfBirth.bind(this), name: 'Date of Birth' },
            { id: 'phoneNumber', validator: this.validatePhoneNumber.bind(this), name: 'Phone Number' },
            { id: 'address', validator: this.validateAddress.bind(this), name: 'Address' },
            { id: 'accountType', validator: this.validateAccountType.bind(this), name: 'Account Type' },
            { id: 'initialDeposit', validator: this.validateInitialDeposit.bind(this), name: 'Initial Deposit' }
        ];

        let isFormValid = true;
        const formData = {};

        requiredFields.forEach(({ id, validator, name }) => {
            const field = document.getElementById(id);
            const value = field.value.trim();
            
            if (!value) {
                this.formUtils.displayErrorMessage(`${id}Error`, `${name} is required`);
                isFormValid = false;
            } else if (!validator(value)) {
                isFormValid = false;
            } else {
                formData[id] = value;
            }
        });

        if (!isFormValid) {
            this.formUtils.showNotification('Please correct the errors and try again', 'error');
            // Scroll to first error
            const firstError = document.querySelector('.error-message.active');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }

        // Disable form submission button
        const submitButton = document.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Processing...';
        submitButton.disabled = true;

        try {
            const result = await this.apiClient.submitBankForm(formData);
            
            if (result.success) {
                this.formUtils.showNotification('Bank form submitted successfully! PDF sent to your email.', 'success');
                // Reset form after successful submission
                setTimeout(() => {
                    document.getElementById('bankForm').reset();
                    this.clearAllErrors();
                }, 2000);
            } else {
                this.formUtils.showNotification(result.data.message || 'Failed to submit form. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.formUtils.showNotification('Network error occurred. Please check your connection and try again.', 'error');
        } finally {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    clearAllErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            this.formUtils.clearErrorMessage(element.id);
        });
    }

    async handleLogout() {
        const confirmLogout = confirm('Are you sure you want to logout?');
        if (!confirmLogout) return;

        try {
            const result = await this.apiClient.logout();
            
            if (result.success) {
                this.formUtils.showNotification('Logged out successfully', 'success');
                // Clear session storage
                sessionStorage.removeItem('authenticated');
                // Redirect to auth form
                setTimeout(() => {
                    window.location.href = '/auth_form.html';
                }, 1500);
            } else {
                this.formUtils.showNotification('Logout failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.formUtils.showNotification('Network error occurred during logout', 'error');
        }
    }

    // Format phone number as user types
    formatPhoneNumber(phoneNumber) {
        const cleaned = phoneNumber.replace(/\D/g, '');
        if (cleaned.length <= 10) {
            return cleaned;
        }
        return cleaned.substring(0, 10);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BankFormManager();
});

// Export for use in other modules
window.BankFormManager = BankFormManager;
