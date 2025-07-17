import unittest
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from backend.app import app
from backend.utils import validate_email

class TestBackendRoutes(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_index_redirect(self):
        """Test that index route redirects to auth form"""
        response = self.app.get('/')
        self.assertEqual(response.status_code, 302)  # Redirect status

    def test_auth_form_route(self):
        """Test that auth form route is accessible"""
        response = self.app.get('/auth/auth_form.html')
        self.assertEqual(response.status_code, 200)

    def test_bank_form_without_auth(self):
        """Test that bank form redirects when not authenticated"""
        response = self.app.get('/bankform/bank_form.html')
        self.assertEqual(response.status_code, 302)  # Should redirect to auth

    def test_email_validation(self):
        """Test email validation function"""
        # Valid emails
        self.assertTrue(validate_email('test@gmail.com'))
        self.assertTrue(validate_email('user@college.edu.in'))
        self.assertTrue(validate_email('admin@yahoo.com'))
        
        # Invalid emails
        self.assertFalse(validate_email('invalid@domain.com'))
        self.assertFalse(validate_email('user@.edu.in'))
        self.assertFalse(validate_email('user..test@gmail.com'))

if __name__ == '__main__':
    unittest.main()
