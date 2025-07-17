import unittest
from utils import validate_email

class TestValidation(unittest.TestCase):
    def test_valid_emails(self):
        self.assertTrue(validate_email('user@gmail.com'))
        self.assertTrue(validate_email('user@college.edu.in'))
        self.assertTrue(validate_email('user@subdomain.university.edu.in'))
        self.assertTrue(validate_email('user@icloud.com'))
    def test_invalid_emails(self):
        self.assertFalse(validate_email('user@randomdomain.com'))
        self.assertFalse(validate_email('user@edu.com'))
        self.assertFalse(validate_email('user@.edu.in'))
        self.assertFalse(validate_email('user@outlook.in'))
        self.assertFalse(validate_email('user@invalid'))
        self.assertFalse(validate_email('user@aol'))
        self.assertFalse(validate_email('user@icloud.comm'))
        self.assertFalse(validate_email('user@icloud..com'))

if __name__ == '__main__':
    unittest.main()
