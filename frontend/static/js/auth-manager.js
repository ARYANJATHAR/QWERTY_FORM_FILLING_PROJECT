// Authentication Module
// Handles sign in, sign up, and authentication-related functionality

class AuthManager {
    constructor() {
        this.apiClient = new ApiClient();
        this.formUtils = new FormUtils();
        this.voiceRecognition = new VoiceRecognition();
        this.init();
    }

    init() {
        this.initializeFormHandlers();
        this.initializeVoiceControls();
        this.initializePasswordToggles();
        this.initializeClearButtons();
        this.setupModalHandlers();
        this.initializeFormToggling();
    }

    initializeFormHandlers() {
        // Sign In Form
        const signInForm = document.getElementById('signInForm');
        if (signInForm) {
            signInForm.addEventListener('submit', (e) => this.handleSignIn(e));
        }

        // Sign Up Form
        const signUpForm = document.getElementById('signUpForm');
        if (signUpForm) {
            signUpForm.addEventListener('submit', (e) => this.handleSignUp(e));
        }

        // Forgot Password Form
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }
    }

    initializeVoiceControls() {
        // Voice input for all relevant fields
        const voiceFields = [
            { button: 'voiceIconSignInEmail', input: 'signInEmail', status: 'voiceStatusSignInEmail' },
            { button: 'voiceIconSignInPassword', input: 'signInPassword', status: 'voiceStatusSignInPassword' },
            { button: 'voiceIconSignUpEmail', input: 'signUpEmail', status: 'voiceStatusSignUpEmail' },
            { button: 'voiceIconSignUpUsername', input: 'signUpUsername', status: 'voiceStatusSignUpUsername' },
            { button: 'voiceIconSignUpPassword', input: 'signUpPassword', status: 'voiceStatusSignUpPassword' },
            { button: 'voiceIconForgotPasswordEmail', input: 'forgotPasswordEmail', status: 'voiceStatusForgotPasswordEmail' }
        ];

        voiceFields.forEach(({ button, input, status }) => {
            const element = document.getElementById(button);
            if (element) {
                element.addEventListener('click', () => {
                    this.voiceRecognition.startVoiceInput(input, status);
                });
            }
        });
    }

    initializePasswordToggles() {
        const toggles = [
            { field: 'signInPassword', icon: 'toggleSignInPassword' },
            { field: 'signUpPassword', icon: 'toggleSignUpPassword' }
        ];

        toggles.forEach(({ field, icon }) => {
            const iconElement = document.getElementById(icon);
            if (iconElement) {
                iconElement.addEventListener('click', () => {
                    this.formUtils.togglePasswordVisibility(field, icon);
                });
            }
        });
    }

    initializeClearButtons() {
        const clearButtons = [
            { button: 'clearSignInEmail', input: 'signInEmail' },
            { button: 'clearSignInPassword', input: 'signInPassword' },
            { button: 'clearSignUpUsername', input: 'signUpUsername' },
            { button: 'clearSignUpEmail', input: 'signUpEmail' },
            { button: 'clearSignUpPassword', input: 'signUpPassword' },
            { button: 'clearForgotPasswordEmail', input: 'forgotPasswordEmail' }
        ];

        clearButtons.forEach(({ button, input }) => {
            const element = document.getElementById(button);
            if (element) {
                element.addEventListener('click', () => {
                    const inputElement = document.getElementById(input);
                    if (inputElement) {
                        inputElement.value = '';
                        inputElement.focus();
                    }
                });
            }
        });
    }

    initializeFormToggling() {
        // Toggle between sign in and sign up forms
        const signUpLink = document.getElementById('signUpLink');
        const signInLink = document.getElementById('signInLink');
        
        if (signUpLink) {
            signUpLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSignUpForm();
            });
        }
        
        if (signInLink) {
            signInLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSignInForm();
            });
        }
    }

    setupModalHandlers() {
        // Forgot password modal
        const forgotPasswordLink = document.getElementById('forgotPasswordLink');
        const modal = document.getElementById('forgotPasswordModal');
        const closeModal = document.querySelector('.modal-close');

        if (forgotPasswordLink && modal) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.add('active');
            });
        }

        if (closeModal && modal) {
            closeModal.addEventListener('click', () => {
                modal.classList.remove('active');
                this.clearModalForm();
            });
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    this.clearModalForm();
                }
            });
        }
    }

    clearModalForm() {
        const form = document.getElementById('forgotPasswordForm');
        if (form) {
            form.reset();
            this.formUtils.clearErrorMessage('forgotPasswordEmailError');
        }
    }

    showSignInForm() {
        const signInWrapper = document.getElementById('signInWrapper');
        const signUpWrapper = document.getElementById('signUpWrapper');
        
        if (signInWrapper && signUpWrapper) {
            signInWrapper.classList.remove('hidden');
            signUpWrapper.classList.add('hidden');
            this.clearAllErrors();
        }
    }

    showSignUpForm() {
        const signInWrapper = document.getElementById('signInWrapper');
        const signUpWrapper = document.getElementById('signUpWrapper');
        
        if (signInWrapper && signUpWrapper) {
            signInWrapper.classList.add('hidden');
            signUpWrapper.classList.remove('hidden');
            this.clearAllErrors();
        }
    }

    async handleSignIn(event) {
        event.preventDefault();
        
        const email = document.getElementById('signInEmail').value.trim();
        const password = document.getElementById('signInPassword').value;

        // Clear previous errors
        this.formUtils.clearErrorMessage('signInEmailError');
        this.formUtils.clearErrorMessage('signInPasswordError');

        // Validate inputs
        if (!email) {
            this.formUtils.displayErrorMessage('signInEmailError', 'Email is required');
            return;
        }

        if (!this.formUtils.validateEmail(email)) {
            this.formUtils.displayErrorMessage('signInEmailError', 'Please enter a valid email address');
            return;
        }

        if (!password) {
            this.formUtils.displayErrorMessage('signInPasswordError', 'Password is required');
            return;
        }

        this.formUtils.showLoader();

        try {
            const result = await this.apiClient.signIn({ email, password });
            
            if (result.success) {
                this.formUtils.showNotification('Sign in successful!', 'success');
                // Store auth state
                sessionStorage.setItem('authenticated', 'true');
                // Redirect to bank form
                setTimeout(() => {
                    window.location.href = '/bank_form.html';
                }, 1500);
            } else {
                this.formUtils.displayErrorMessage('signInPasswordError', result.data.message || 'Invalid credentials');
            }
        } catch (error) {
            this.formUtils.displayErrorMessage('signInPasswordError', 'Network error occurred');
        } finally {
            this.formUtils.hideLoader();
        }
    }

    async handleSignUp(event) {
        event.preventDefault();
        
        const username = document.getElementById('signUpUsername').value.trim();
        const email = document.getElementById('signUpEmail').value.trim();
        const password = document.getElementById('signUpPassword').value;
        const termsAccepted = document.getElementById('termsCheckbox').checked;

        // Clear previous errors
        this.formUtils.clearErrorMessage('signUpUsernameError');
        this.formUtils.clearErrorMessage('signUpEmailError');
        this.formUtils.clearErrorMessage('signUpPasswordError');

        // Validate inputs
        if (!username) {
            this.formUtils.displayErrorMessage('signUpUsernameError', 'Username is required');
            return;
        }

        if (!this.formUtils.validateUsername(username)) {
            this.formUtils.displayErrorMessage('signUpUsernameError', 'Username must be 3-20 characters, letters, numbers, and underscores only');
            return;
        }

        if (!email) {
            this.formUtils.displayErrorMessage('signUpEmailError', 'Email is required');
            return;
        }

        if (!this.formUtils.validateEmail(email)) {
            this.formUtils.displayErrorMessage('signUpEmailError', 'Please enter a valid email address');
            return;
        }

        if (!password) {
            this.formUtils.displayErrorMessage('signUpPasswordError', 'Password is required');
            return;
        }

        if (!this.formUtils.validatePassword(password)) {
            this.formUtils.displayErrorMessage('signUpPasswordError', 'Password must be at least 8 characters with uppercase, lowercase, number, and special character');
            return;
        }

        if (!termsAccepted) {
            this.formUtils.showNotification('Please accept the terms and conditions', 'error');
            return;
        }

        this.formUtils.showLoader();

        try {
            const result = await this.apiClient.signUp({ username, email, password });
            
            if (result.success) {
                this.formUtils.showNotification('Sign up successful! Please check your email to verify your account.', 'success');
                // Clear form
                document.getElementById('signUpForm').reset();
                // Switch to sign in form after a delay
                setTimeout(() => {
                    this.showSignInForm();
                }, 2000);
            } else {
                this.formUtils.displayErrorMessage('signUpEmailError', result.data.message || 'Sign up failed');
            }
        } catch (error) {
            this.formUtils.displayErrorMessage('signUpEmailError', 'Network error occurred');
        } finally {
            this.formUtils.hideLoader();
        }
    }

    async handleForgotPassword(event) {
        event.preventDefault();
        
        const email = document.getElementById('forgotPasswordEmail').value.trim();

        // Clear previous errors
        this.formUtils.clearErrorMessage('forgotPasswordEmailError');

        if (!email) {
            this.formUtils.displayErrorMessage('forgotPasswordEmailError', 'Email is required');
            return;
        }

        if (!this.formUtils.validateEmail(email)) {
            this.formUtils.displayErrorMessage('forgotPasswordEmailError', 'Please enter a valid email address');
            return;
        }

        const submitButton = document.querySelector('#forgotPasswordForm button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;

        try {
            const result = await this.apiClient.forgotPassword(email);
            
            if (result.success) {
                this.formUtils.showNotification('Password reset instructions sent to your email.', 'success');
                document.getElementById('forgotPasswordModal').classList.remove('active');
                this.clearModalForm();
            } else {
                this.formUtils.displayErrorMessage('forgotPasswordEmailError', result.data.message || 'Failed to send reset email');
            }
        } catch (error) {
            this.formUtils.displayErrorMessage('forgotPasswordEmailError', 'Network error occurred');
        } finally {
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Export for use in other modules
window.AuthManager = AuthManager;
