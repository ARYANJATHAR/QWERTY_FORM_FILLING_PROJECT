// Voice Recognition Module
// Handles all voice input functionality

class VoiceRecognition {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.currentInput = null;
        this.initializeRecognition();
    }

    initializeRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
    }

    startVoiceInput(inputId) {
        if (!this.recognition) {
            const statusElementId = this.getStatusElementId(inputId);
            this.updateVoiceStatus(statusElementId, "Speech recognition not supported in this browser.");
            return;
        }

        if (this.isListening) {
            this.stopListening();
            return;
        }

        this.currentInput = inputId;
        this.isListening = true;
        const inputElement = document.getElementById(inputId);
        const statusElementId = this.getStatusElementId(inputId);

        if (!inputElement) {
            console.error(`Input element with ID ${inputId} not found`);
            return;
        }

        // Update voice button appearance
        const voiceButton = document.querySelector(`[onclick*="${inputId}"], [data-input="${inputId}"]`);
        if (voiceButton) {
            voiceButton.classList.add('listening');
        }

        this.updateVoiceStatus(statusElementId, "Listening... Click again to stop.");

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (interimTranscript) {
                this.updateVoiceStatus(statusElementId, `Listening: "${interimTranscript}"`);
            }

            if (finalTranscript) {
                const processedText = this.processVoiceInput(finalTranscript, inputId);
                inputElement.value = processedText;
                
                // Trigger input event for validation
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                
                this.updateVoiceStatus(statusElementId, `Captured: "${processedText}"`);
                
                // Clear status after 3 seconds
                setTimeout(() => {
                    this.updateVoiceStatus(statusElementId, "");
                }, 3000);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMessage = 'Voice recognition error. ';
            
            switch (event.error) {
                case 'no-speech':
                    errorMessage += 'No speech detected. Try again.';
                    break;
                case 'audio-capture':
                    errorMessage += 'Microphone not accessible.';
                    break;
                case 'not-allowed':
                    errorMessage += 'Microphone permission denied.';
                    break;
                case 'network':
                    errorMessage += 'Network error occurred.';
                    break;
                default:
                    errorMessage += 'Please try again.';
            }
            
            this.updateVoiceStatus(statusElementId, errorMessage);
            this.stopListening();
        };

        this.recognition.onend = () => {
            this.stopListening();
        };

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start recognition:', error);
            this.updateVoiceStatus(statusElementId, 'Failed to start voice recognition.');
            this.stopListening();
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        
        this.isListening = false;
        
        // Remove listening class from voice button
        const voiceButtons = document.querySelectorAll('.voice-icon.listening');
        voiceButtons.forEach(button => {
            button.classList.remove('listening');
        });
        
        this.currentInput = null;
    }

    processVoiceInput(voiceInput, inputId) {
        let processedText = voiceInput.trim();
        
        // Handle email inputs
        if (inputId.toLowerCase().includes('email')) {
            processedText = this.formatEmailFromVoice(processedText);
        }
        
        // Handle phone number inputs
        if (inputId.toLowerCase().includes('phone')) {
            processedText = this.formatPhoneFromVoice(processedText);
        }
        
        // Handle deposit amount inputs
        if (inputId.toLowerCase().includes('deposit')) {
            processedText = this.formatNumberFromVoice(processedText);
        }
        
        // Handle username inputs - remove spaces
        if (inputId.toLowerCase().includes('username')) {
            processedText = processedText.replace(/\s+/g, '').toLowerCase();
        }
        
        // Capitalize first letter for name fields
        if (inputId.toLowerCase().includes('name')) {
            processedText = this.capitalizeWords(processedText);
        }
        
        return processedText;
    }

    formatEmailFromVoice(voiceInput) {
        let email = voiceInput.toLowerCase().trim();
        
        // Common replacements for voice input
        const replacements = {
            ' at ': '@',
            ' dot ': '.',
            ' dash ': '-',
            ' underscore ': '_',
            'gmail': 'gmail.com',
            'yahoo': 'yahoo.com',
            'outlook': 'outlook.com',
            'hotmail': 'hotmail.com',
            'icloud': 'icloud.com'
        };

        Object.entries(replacements).forEach(([key, value]) => {
            email = email.replace(new RegExp(key, 'g'), value);
        });

        return email.replace(/\s+/g, '');
    }

    formatPhoneFromVoice(voiceInput) {
        // Extract only numbers from voice input
        const numbers = voiceInput.replace(/\D/g, '');
        
        // Format as 10-digit number
        if (numbers.length === 10) {
            return numbers;
        } else if (numbers.length === 11 && numbers.startsWith('1')) {
            return numbers.substring(1);
        }
        
        return numbers;
    }

    formatNumberFromVoice(voiceInput) {
        // Extract numbers from voice input
        const numbers = voiceInput.replace(/[^\d.]/g, '');
        return numbers;
    }

    capitalizeWords(text) {
        return text.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }

    getStatusElementId(inputId) {
        // Map input IDs to their corresponding voice status element IDs
        const statusIdMap = {
            // Bank form
            'fullName': 'voiceStatusFullName',
            'phoneNumber': 'voiceStatusPhone',
            'address': 'voiceStatusAddress',
            'initialDeposit': 'voiceStatusDeposit',
            // Auth form - Sign In
            'signInEmail': 'voiceStatusSignInEmail',
            'signInPassword': 'voiceStatusTextSignInPassword',
            // Auth form - Sign Up
            'signUpUsername': 'voiceStatusTextSignUpUsername',
            'signUpEmail': 'voiceStatusTextSignUpEmail',
            'signUpPassword': 'voiceStatusTextSignUpPassword',
            // Auth form - Forgot Password
            'forgotPasswordEmail': 'voiceStatusTextForgotPasswordEmail'
        };
        
        return statusIdMap[inputId] || `voiceStatus${inputId}`;
    }

    updateVoiceStatus(elementId, message) {
        const statusElement = document.getElementById(elementId);
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.display = message ? 'block' : 'none';
            
            // Add visual feedback
            if (message.includes('Listening')) {
                statusElement.style.color = 'var(--primary-color)';
            } else if (message.includes('error') || message.includes('Error')) {
                statusElement.style.color = 'var(--error-color)';
            } else if (message.includes('Captured')) {
                statusElement.style.color = 'var(--success-color)';
            } else {
                statusElement.style.color = 'var(--text-secondary)';
            }
        }
    }
}

// Export for use in other modules
window.VoiceRecognition = VoiceRecognition;
