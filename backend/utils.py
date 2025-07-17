import re

def validate_email(email: str) -> bool:
    """
    Validate basic email structure and restrict domains to:
      – gmail.com, yahoo.com, outlook.com, hotmail.com, aol.com, icloud.com
      – Any '.edu.in' domain (e.g. 'college.edu.in', 'uni.edu.in')
    """
    # Basic email structure validation
    pattern = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$'
    if not re.match(pattern, email):
        return False
    
    # Extract domain and check for invalid patterns
    domain = email.split('@', 1)[1].lower()
    
    # Check for consecutive dots or dots at start/end
    if '..' in domain or domain.startswith('.') or domain.endswith('.'):
        return False
    
    allowed_exact = {
        'gmail.com',
        'yahoo.com',
        'outlook.com',
        'hotmail.com',
        'aol.com',
        'icloud.com',
    }
    if domain in allowed_exact or domain.endswith('.edu.in'):
        return True
    return False
