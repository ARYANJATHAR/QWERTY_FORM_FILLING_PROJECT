// API Client Module
// Handles all backend API communication

class ApiClient {
    constructor() {
        this.baseUrl = '';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    async makeRequest(url, options = {}) {
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        try {
            const response = await fetch(this.baseUrl + url, config);
            const data = await response.json();
            
            return {
                success: response.ok,
                status: response.status,
                data: data
            };
        } catch (error) {
            console.error('API Request failed:', error);
            return {
                success: false,
                status: 0,
                data: { message: 'Network error occurred' }
            };
        }
    }

    // Authentication endpoints
    async signUp(userData) {
        return this.makeRequest('/signup', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async signIn(credentials) {
        return this.makeRequest('/signin', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async logout() {
        return this.makeRequest('/logout', {
            method: 'POST'
        });
    }

    async forgotPassword(email) {
        return this.makeRequest('/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    // Bank form endpoints
    async submitBankForm(formData) {
        return this.makeRequest('/submit-bank-form', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
    }

    // Email verification
    async verifyEmail(token) {
        return this.makeRequest(`/verify-email?token=${token}`, {
            method: 'GET'
        });
    }
}

// Export for use in other modules
window.ApiClient = ApiClient;
