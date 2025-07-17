// Theme Management Module
// Handles dark/light theme switching and persistence

class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        this.createThemeToggle();
        this.loadSavedTheme();
        this.attachEventListeners();
    }

    createThemeToggle() {
        // Check if theme toggle already exists
        if (document.querySelector('.theme-switch-wrapper')) {
            return;
        }

        const themeToggle = document.createElement('div');
        themeToggle.className = 'theme-switch-wrapper';
        themeToggle.innerHTML = `
            <label class="theme-switch" for="themeCheckbox">
                <input type="checkbox" id="themeCheckbox" />
                <div class="slider round">
                    <span class="mode-icon">🌙</span>
                    <span class="mode-icon">☀️</span>
                </div>
            </label>
        `;
        
        // Insert after header or at the beginning of body
        const header = document.querySelector('header');
        if (header) {
            header.insertAdjacentElement('afterend', themeToggle);
        } else {
            document.body.insertBefore(themeToggle, document.body.firstChild);
        }
    }

    loadSavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        const checkbox = document.getElementById('themeCheckbox');
        
        if (savedTheme) {
            this.applyTheme(savedTheme);
            if (checkbox) {
                checkbox.checked = savedTheme === 'dark';
            }
        } else {
            // Default to light theme
            this.applyTheme('light');
        }
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    attachEventListeners() {
        // Use event delegation to handle dynamically created checkboxes
        document.addEventListener('change', (e) => {
            if (e.target.id === 'themeCheckbox' || e.target.id === 'checkbox') {
                const isChecked = e.target.checked;
                this.applyTheme(isChecked ? 'dark' : 'light');
            }
        });
    }

    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }
}

// Export for use in other modules
window.ThemeManager = ThemeManager;
