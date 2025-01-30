import io
import os
import logging
import bcrypt
import requests
import json
import uuid
from datetime import datetime, timedelta, timezone
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_session import Session
from flask_mail import Mail, Message
from dotenv import load_dotenv
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=15)  # Session expires after 15 minutes  # Reduced session lifetime
app.config['SESSION_COOKIE_SECURE'] = True  # Only send cookies over HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent client-side script access
Session(app)

# Flask-Mail Configuration
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')  # e.g., 'smtp.gmail.com'
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))  # Default is 587 for TLS
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')  # Your email
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')  # Your email password or app password
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@example.com')

mail = Mail(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),  # Log to a file
        logging.StreamHandler()  # Log to console
    ]
)

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

def make_supabase_request(method, path, data=None, params=None):
    """
    Make a request to the Supabase API with robust error handling.
    """
    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    url = f"{SUPABASE_URL}{path}"

    try:
        logging.info(f"Making Supabase API request: {method} {url}")
        logging.debug(f"Request data: {data}")
        logging.debug(f"Request params: {params}")

        response = requests.request(method, url, headers=headers, json=data, params=params)
        response.raise_for_status()  # Raise an exception for HTTP errors

        logging.info(f"Supabase API response: {response.status_code}")
        logging.debug(f"Response content: {response.content}")

        return response.json() if response.content else True

    except requests.exceptions.RequestException as e:
        logging.error(f"Supabase API request failed: {e}")
        return None

    except json.JSONDecodeError as e:
        logging.error(f"Failed to decode Supabase API response: {e}")
        return None

    except Exception as e:
        logging.error(f"Unexpected error during Supabase API request: {e}")
        return None

def validate_email(email):
    """
    Validate email format and enforce allowed domains.
    """
    allowed_domains = [
        'gmail.com',
        'yahoo.com',
        'outlook.com',
        'hotmail.com',
        'aol.com',
        'icloud.com'
    ]

    import re
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

    if not re.match(pattern, email):
        return False

    domain = email.split('@')[1]
    return domain in allowed_domains

def transform_payload(data):
    """
    Transform camelCase keys to lowercase to match Supabase column names.
    Handle optional fields (middleName, nomineeName, nomineeRelationship, nomineeContact).
    """
    key_mapping = {
        "firstName": "firstname",
        "middleName": "middlename",    # Optional field
        "lastName": "lastname",
        "dob": "dob",
        "gender": "gender",
        "maritalStatus": "maritalstatus",
        "nationality": "nationality",
        "mothersMaidenName": "mothersmaidenname",
        "residentialStreet": "residentialstreet",
        "residentialCity": "residentialcity",
        "residentialState": "residentialstate",
        "residentialZip": "residentialzip",
        "mobilePhone": "mobilephone",
        "email": "email",
        "employmentStatus": "employmentstatus",
        "occupation": "occupation",
        "monthlyIncome": "monthlyincome",
        "incomeSource": "incomesource",
        "accountType": "accounttype",
        "initialDeposit": "initialdeposit",
        "accountPurpose": "accountpurpose",
        "modeOfOperation": "modeofoperation",
        "nomineeName": "nomineename",                  # Optional field
        "nomineeRelationship": "nomineerelationship",  # Optional field
        "nomineeContact": "nomineecontact",            # Optional field
    }

    transformed_data = {}
    for key, value in data.items():
        # Use the mapped key if it exists, otherwise use the original key
        transformed_key = key_mapping.get(key, key)
        transformed_data[transformed_key] = value

    # Ensure optional fields are included with default values if missing
    if "middlename" not in transformed_data or not transformed_data["middlename"]:
        transformed_data["middlename"] = None  # Set to NULL if not provided

    if "nomineename" not in transformed_data or not transformed_data["nomineename"]:
        transformed_data["nomineename"] = None  # Set to NULL if not provided

    if "nomineerelationship" not in transformed_data or not transformed_data["nomineerelationship"]:
        transformed_data["nomineerelationship"] = None  # Set to NULL if not provided

    if "nomineecontact" not in transformed_data or not transformed_data["nomineecontact"]:
        transformed_data["nomineecontact"] = None  # Set to NULL if not provided

    return transformed_data

def generate_pdf(form_data):
    """
    Generate a PDF that looks like the online form, with boxes and filled-in data.
    Replace empty or None values with "NOT PROVIDED" for optional fields.
    """
    # Create a buffer to hold the PDF
    pdf_buffer = io.BytesIO()

    # Create a PDF document
    doc = SimpleDocTemplate(pdf_buffer, pagesize=letter)
    styles = getSampleStyleSheet()

    # Content for the PDF
    content = []

    # Add a title
    title = Paragraph("<b>Bank Account Application Form</b>", styles['Title'])
    content.append(title)
    content.append(Spacer(1, 12))  # Add some space

    # Replace None or empty values with "NOT PROVIDED"
    for key, value in form_data.items():
        if value is None or value == "":
            form_data[key] = "NOT PROVIDED"

    # Section 1: Personal Information
    personal_info = [
        ["Personal Information", ""],
        ["First Name:", form_data.get('firstname', 'NOT PROVIDED')],
        ["Middle Name:", form_data.get('middlename', 'NOT PROVIDED')],  # Optional field
        ["Last Name:", form_data.get('lastname', 'NOT PROVIDED')],
        ["Date of Birth:", form_data.get('dob', 'NOT PROVIDED')],
        ["Gender:", form_data.get('gender', 'NOT PROVIDED')],
        ["Marital Status:", form_data.get('maritalstatus', 'NOT PROVIDED')],
        ["Nationality:", form_data.get('nationality', 'NOT PROVIDED')],
        ["Mother's Maiden Name:", form_data.get('mothersmaidenname', 'NOT PROVIDED')],
        ["Residential Address:", f"{form_data.get('residentialstreet', 'NOT PROVIDED')}, {form_data.get('residentialcity', 'NOT PROVIDED')}, {form_data.get('residentialstate', 'NOT PROVIDED')} - {form_data.get('residentialzip', 'NOT PROVIDED')}"],
        ["Mobile Phone:", form_data.get('mobilephone', 'NOT PROVIDED')],
        ["Email Address:", form_data.get('email', 'NOT PROVIDED')],
    ]

    # Create a table for personal information
    personal_table = Table(personal_info, colWidths=[150, 350])
    personal_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    content.append(KeepTogether(personal_table))
    content.append(Spacer(1, 24))  # Add space between sections

    # Section 2: Employment and Income Information
    employment_info = [
        ["Employment & Income Info", ""],
        ["Employment Status:", form_data.get('employmentstatus', 'NOT PROVIDED')],
        ["Occupation:", form_data.get('occupation', 'NOT PROVIDED')],
        ["Monthly Income:", f"{form_data.get('monthlyincome', 'NOT PROVIDED')}"],
        ["Source of Income:", form_data.get('incomesource', 'NOT PROVIDED')]
    ]

    # Create a table for employment information
    employment_table = Table(employment_info, colWidths=[150, 350])
    employment_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('WORDWRAP', (0, 0), (-1, -1), True),  # Enable text wrapping
        ('ROWHEIGHT', (0, 0), (-1, 0), 24),  # Increase row height for the header
    ]))

    content.append(KeepTogether(employment_table))
    content.append(Spacer(1, 24))  # Add space between sections

    # Section 3: Account Details
    account_info = [
        ["Account Details", ""],
        ["Account Type:", form_data.get('accounttype', 'NOT PROVIDED')],
        ["Initial Deposit Amount:", f"{form_data.get('initialdeposit', 'NOT PROVIDED')}"],
        ["Account Purpose:", form_data.get('accountpurpose', 'NOT PROVIDED')],
        ["Mode of Operation:", form_data.get('modeofoperation', 'NOT PROVIDED')],
    ]

    # Create a table for account details
    account_table = Table(account_info, colWidths=[150, 350])
    account_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    content.append(KeepTogether(account_table))
    content.append(Spacer(1, 24))  # Add space between sections

    # Section 4: Nominee Information
    nominee_info = [
        ["Nominee Information", ""],
        ["Nominee Name:", form_data.get('nomineename', 'NOT PROVIDED')],  # Optional field
        ["Nominee Relationship:", form_data.get('nomineerelationship', 'NOT PROVIDED')],  # Optional field
        ["Nominee Contact:", form_data.get('nomineecontact', 'NOT PROVIDED')],  # Optional field
    ]

    # Create a table for nominee information
    nominee_table = Table(nominee_info, colWidths=[150, 350])
    nominee_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    content.append(KeepTogether(nominee_table))

    # Build the PDF
    doc.build(content)

    # Return the PDF buffer
    pdf_buffer.seek(0)
    return pdf_buffer

def send_pdf_email(pdf_data, recipient_email):
    """
    Send an email with the generated PDF attached.
    """
    try:
        msg = Message(
            subject='Bank Form Submission',  # Email subject
            sender=app.config['MAIL_DEFAULT_SENDER'],  # Sender email
            recipients=[recipient_email]  # Recipient email(s)
        )

        # Attach the PDF file
        pdf_data.seek(0)  # Ensure the file pointer is at the beginning
        msg.attach(
            filename="bank_form.pdf",
            content_type="application/pdf",
            data=pdf_data.read()
        )

        # Send the email using Flask-Mail
        mail.send(msg)
        
        logging.info(f"PDF sent successfully to {recipient_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {e}")
        return False

def send_verification_email(email, verification_link):
    """Send a verification email to the user."""
    try:
        msg = Message(
            subject="Verify Your Email Address",
            sender=app.config['MAIL_DEFAULT_SENDER'],
            recipients=[email],
        )
        msg.body = f"Click the link below to verify your email address:\n\n{verification_link}"
        mail.send(msg)
        logging.info(f"Verification email sent to {email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send verification email: {e}")
        return False

@app.route('/')
def index():
    return redirect(url_for('auth_form'))

@app.route('/auth/auth_form.html')
def auth_form():
    return render_template('auth_form.html')

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    try:
        # Check if the username already exists
        username_query = {"username": f"eq.{username}"}
        username_response = make_supabase_request("GET", "/rest/v1/users", params=username_query)

        if isinstance(username_response, list) and len(username_response) > 0:
            # Username already exists
            return jsonify({"message": "Username already taken. Please choose a different username."}), 400

        # Check if the email already exists
        email_query = {"email": f"eq.{email}"}
        email_response = make_supabase_request("GET", "/rest/v1/users", params=email_query)

        if isinstance(email_response, list) and len(email_response) > 0:
            # Email already exists
            return jsonify({"message": "Email already registered. Please use a different email."}), 400

        # Hash the password using bcrypt
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        # Generate a unique verification token
        verification_token = str(uuid.uuid4())
        verification_token_expiry = datetime.utcnow() + timedelta(hours=24)  # Token expires in 24 hours

        # Insert new user
        payload = {
            "username": username,
            "email": email,
            "password": hashed_password.decode('utf-8'),  # Store as string
             "verification_token": verification_token,
            "verification_token_expiry": verification_token_expiry.isoformat(),
             "is_verified": False,
        }

        response = make_supabase_request("POST", "/rest/v1/users", data=payload)

        if response:
            # Send verification email
            verification_link = f"{request.url_root}verify-email?token={verification_token}"
            if send_verification_email(email, verification_link):
                 return jsonify({"message": "Signup successful. Please check your email to verify your account."}), 200
            else:
                 logging.error(f"Failed to send verification email after successful signup for: {email}")
                 return jsonify({"message": "Signup successful, but failed to send email, please try again later."}), 500

        else:
            return jsonify({"message": "Signup failed", "error": "No response from Supabase"}), 500

    except Exception as e:
        logging.error(f"Error during signup: {e}")
        return jsonify({"message": "Signup failed", "error": str(e)}), 500

@app.route('/verify-email', methods=['GET'])
def verify_email():
    """Verify email address using the token."""
    token = request.args.get('token')
    if not token:
        return jsonify({"message": "Invalid verification link."}), 400

    try:
            # Retrieve the user based on the verification token
            query = {"verification_token": f"eq.{token}"}
            user_response = make_supabase_request("GET", "/rest/v1/users", params=query)

            if not isinstance(user_response, list) or len(user_response) == 0:
                logging.error(f"Invalid or expired verification token: {token}")
                return jsonify({"message": "Invalid or expired verification link."}), 400
            
            user = user_response[0]
            # Check if verification_token_expiry exists and is not None
            if not user.get('verification_token_expiry'):
                logging.error(f"Verification token expiry not found for user: {user['email']}")
                return jsonify({"message": "Invalid or expired verification token."}), 400

            verification_token_expiry_str = user['verification_token_expiry']
            
             # Fix the date string by truncating fractional seconds to 6 digits
            if '.' in verification_token_expiry_str:
               date_part, time_part = verification_token_expiry_str.split('.')
               time_part = time_part.split('+')[0]  # Remove timezone if present
               time_part = time_part[:6]  # Truncate to 6 digits
               verification_token_expiry_str = f"{date_part}.{time_part}+00:00"  # Reconstruct the date string
             
            # Parse the fixed date string
            verification_token_expiry = datetime.fromisoformat(verification_token_expiry_str)

            # Make datetime.utcnow() timezone-aware
            current_time = datetime.utcnow().replace(tzinfo=timezone.utc)
            
            # Check if the verification token has expired
            if current_time > verification_token_expiry:
                logging.error(f"Verification token expired: {token}")
                make_supabase_request("PATCH", f"/rest/v1/users?id=eq.{user['id']}", data={"verification_token": None, "verification_token_expiry": None})
                return jsonify({"message": "Verification link has expired. Please sign up again."}), 400
            
            # Mark user as verified and clear the token
            update_payload = {
                "is_verified": True,
                "verification_token": None,
                "verification_token_expiry": None,
            }

            make_supabase_request("PATCH", f"/rest/v1/users?id=eq.{user['id']}", data=update_payload)
            logging.info(f"Email verified successfully for: {user['email']}")
            return redirect(url_for('auth_form') + '?verified=true')
    except Exception as e:
        logging.error(f"Error during email verification: {e}")
        return jsonify({"message": "Email verification failed, please try again later"}), 500

@app.route('/signin', methods=['POST'])
def signin():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    try:
        # Retrieve the user based on email
        query = {"email": f"eq.{email}"}
        logging.debug(f"Supabase Query: {query}")
        user_response = make_supabase_request("GET", f"/rest/v1/users", params=query)

        # Check if the user exists
        if not isinstance(user_response, list):
            logging.error("Unexpected response format from Supabase API")
            return jsonify({"message": "Signin failed"}), 500

        if len(user_response) == 0:
            logging.warning(f"User not found for email: {email}")
            return jsonify({"message": "Invalid email or password"}), 401

        logging.debug(f"Supabase Response: {user_response}")
        user = user_response[0]
        logging.debug(f"User data: {user}")
        
         # Check if the user is verified
        if not user.get('is_verified'):
           logging.warning(f"User attempted to sign in without verification for email: {email}")
           return jsonify({"message": "Please verify your email address before signing in"}), 403


        # Verify the password using bcrypt
        if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            # Password is correct, set session
            session['email'] = email
            session['username'] = user['username']
            session.permanent = True

            logging.info(f"Signin successful for user: {user['username']}")
            return jsonify({"message": "Signin successful", "username": user['username']}), 200
        else:
            # Password is incorrect
            logging.warning(f"Password verification failed for user: {user['username']}")
            return jsonify({"message": "Invalid email or password"}), 401

    except Exception as e:
        logging.error(f"Error during signin: {e}")
        return jsonify({"message": "Signin failed"}), 500

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')

    try:
        # Validate email format and domain
        if not validate_email(email):
            return jsonify({"message": "Invalid email format or domain. Only gmail.com, yahoo.com, outlook.com, hotmail.com, aol.com, and icloud.com domains are allowed."}), 400

        # Check if the email exists in the database
        query = {"email": f"eq.{email}"}
        user_response = make_supabase_request("GET", "/rest/v1/users", params=query)

        if not isinstance(user_response, list) or len(user_response) == 0:
            logging.warning(f"Password reset requested for non-existent email: {email}")
            # Return a generic success message to avoid revealing whether the email exists
            return jsonify({"message": "If the email exists, you will receive a password reset link."}), 200

        user = user_response[0]

        # Generate a unique reset token
        reset_token = str(uuid.uuid4())
        reset_token_expiry = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour

        # Store the reset token and expiry in the database
        update_payload = {
            "reset_token": reset_token,
            "reset_token_expiry": reset_token_expiry.isoformat(),
        }
        make_supabase_request("PATCH", f"/rest/v1/users?id=eq.{user['id']}", data=update_payload)

        # Send the password reset email
        reset_link = f"{request.url_root}reset-password?token={reset_token}"
        msg = Message(
            subject="Password Reset Request",
            sender=app.config['MAIL_DEFAULT_SENDER'],
            recipients=[email],
        )
        msg.body = f"Click the link below to reset your password:\n\n{reset_link}\n\nThis link will expire in 1 hour."

        try:
            mail.send(msg)
            logging.info(f"Password reset email sent to {email}")
        except Exception as e:
            logging.error(f"Failed to send password reset email: {e}")
            return jsonify({"message": "Failed to send password reset email. Please try again later."}), 500

        return jsonify({"message": "If the email exists, you will receive a password reset link."}), 200

    except Exception as e:
        logging.error(f"Error during forgot password: {e}")
        return jsonify({"message": "Failed to process your request. Please try again later."}), 500

@app.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    if request.method == 'GET':
        # Handle GET request (render the reset password form)
        reset_token = request.args.get('token')
        if not reset_token:
            return jsonify({"message": "Invalid reset link."}), 400

        # Check if the reset token is still valid
        query = {"reset_token": f"eq.{reset_token}"}
        user_response = make_supabase_request("GET", "/rest/v1/users", params=query)

        if not isinstance(user_response, list) or len(user_response) == 0:
            logging.error(f"Invalid or expired reset token: {reset_token}")
            return jsonify({"message": "Invalid or expired reset token."}), 400

        user = user_response[0]

        # Check if reset_token_expiry exists and is not None
        if not user.get('reset_token_expiry'):
            logging.error(f"Reset token expiry not found for user: {user['email']}")
            return jsonify({"message": "Invalid or expired reset token."}), 400

        reset_token_expiry_str = user['reset_token_expiry']

        # Fix the date string by truncating fractional seconds to 6 digits
        if '.' in reset_token_expiry_str:
            date_part, time_part = reset_token_expiry_str.split('.')
            time_part = time_part.split('+')[0]  # Remove timezone if present
            time_part = time_part[:6]  # Truncate to 6 digits
            reset_token_expiry_str = f"{date_part}.{time_part}+00:00"  # Reconstruct the date string

        # Parse the fixed date string
        reset_token_expiry = datetime.fromisoformat(reset_token_expiry_str)

        # Make datetime.utcnow() timezone-aware
        current_time = datetime.utcnow().replace(tzinfo=timezone.utc)

        # Check if the reset token has expired
        if current_time > reset_token_expiry:
            logging.error(f"Reset token expired: {reset_token}")
            make_supabase_request("PATCH", f"/rest/v1/users?id=eq.{user['id']}", data={"reset_token": None, "reset_token_expiry": None})
            return jsonify({"message": "Reset token has expired. Please request a new one."}), 400

        return render_template('reset_password.html', token=reset_token)
    elif request.method == 'POST':
        # Handle POST request (process the password reset)
        data = request.json
        reset_token = data.get('token')
        new_password = data.get('newPassword')

        # Do not log the password
        logging.info(f"Reset password request received. Token: {reset_token}")

        # Validate the new password length
        if len(new_password) != 6:
            logging.error(f"Invalid password length: {len(new_password)}")
            return jsonify({"message": "Password must be exactly 6 characters long."}), 400
        
        try:
            # Retrieve the user based on the reset token
            query = {"reset_token": f"eq.{reset_token}"}
            user_response = make_supabase_request("GET", "/rest/v1/users", params=query)

            if not isinstance(user_response, list) or len(user_response) == 0:
                logging.error(f"Invalid or expired reset token: {reset_token}")
                return jsonify({"message": "Invalid or expired reset token."}), 400

            user = user_response[0]

            # Check if reset_token_expiry exists and is not None
            if not user.get('reset_token_expiry'):
                logging.error(f"Reset token expiry not found for user: {user['email']}")
                return jsonify({"message": "Invalid or expired reset token."}), 400

            reset_token_expiry_str = user['reset_token_expiry']

            # Fix the date string by truncating fractional seconds to 6 digits
            if '.' in reset_token_expiry_str:
                date_part, time_part = reset_token_expiry_str.split('.')
                time_part = time_part.split('+')[0]  # Remove timezone if present
                time_part = time_part[:6]  # Truncate to 6 digits
                reset_token_expiry_str = f"{date_part}.{time_part}+00:00"  # Reconstruct the date string

            # Parse the fixed date string
            reset_token_expiry = datetime.fromisoformat(reset_token_expiry_str)

            # Make datetime.utcnow() timezone-aware
            current_time = datetime.utcnow().replace(tzinfo=timezone.utc)

            # Check if the reset token has expired
            if current_time > reset_token_expiry:
                logging.error(f"Reset token expired: {reset_token}")
                make_supabase_request("PATCH", f"/rest/v1/users?id=eq.{user['id']}", data={"reset_token": None, "reset_token_expiry": None})
                return jsonify({"message": "Reset token has expired. Please request a new one."}), 400

            # Hash the new password
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())

            # Update the user's password and clear the reset token
            update_payload = {
                "password": hashed_password.decode('utf-8'),
                "reset_token": None,
                "reset_token_expiry": None,
            }
            make_supabase_request("PATCH", f"/rest/v1/users?id=eq.{user['id']}", data=update_payload)
            logging.info(f"Password reset successful for user: {user['email']}")
            return jsonify({"message": "Password reset successful. You can now log in with your new password."}), 200
        except Exception as e:
            logging.error(f"Error during password reset: {e}")
            return jsonify({"message": "Failed to reset password. Please try again later."}), 500
        

@app.route('/check-auth', methods=['GET'])
def check_auth():
    if 'email' in session:
        logging.info(f"User authenticated: {session.get('username', 'User')}")
        return jsonify({
            "isAuthenticated": True,
            "username": session.get('username', 'User')
        }), 200
    else:
        logging.warning("User not authenticated")
        return jsonify({
            "isAuthenticated": False
        }), 401

@app.route('/bankform/bank_form.html')
def bank_form():
    if 'email' not in session:
        logging.warning("User not authenticated, redirecting to auth form")
        return redirect(url_for('auth_form'))

    logging.info(f"Rendering bank form for user: {session.get('username', 'User')}")
    return render_template('bank_form.html')

@app.route('/sign-out', methods=['POST'])
def sign_out():
    logging.info("Sign out endpoint hit!")
    session.clear()  # Clear the entire session
    logging.info("Session cleared")
    return jsonify(message='Logged out successfully', isAuthenticated=False)

@app.route('/submit-bank-form', methods=['POST'])
def submit_bank_form():
    if 'email' not in session:
        logging.warning("Unauthorized access to submit-bank-form")
        return jsonify({"message": "Unauthorized"}), 401

    # Parse JSON data from the request
    data = request.json
    logging.info("Received bank form data: %s", data)  # Log the received data
    email = session['email']

    try:
        # Retrieve the user based on email
        query = {"email": f"eq.{email}"}
        user_response = make_supabase_request("GET", f"/rest/v1/users", params=query)

        if user_response and len(user_response) > 0:
            user = user_response[0]
            logging.info(f"User found: {user}")

            # Transform the payload keys to match Supabase column names
            transformed_payload = transform_payload(data)

            # Add the user_id to the payload
            transformed_payload["user_id"] = user['id']

            logging.info("Transformed payload for Supabase: %s", transformed_payload)

            # Insert the form data into Supabase
            response = make_supabase_request("POST", "/rest/v1/bank_forms", data=transformed_payload)

            if response:
                logging.info("Form data inserted successfully!")

                # Generate the PDF from the form data
                pdf_data = generate_pdf(transformed_payload)

                # Send the PDF via email to the user (or another email)
                if send_pdf_email(pdf_data, user['email']):
                    return jsonify({"message": "Form submission successful and PDF sent to email"}), 200
                else:
                    return jsonify({"message": "Form submission successful, but failed to send email"}), 500
            else:
                logging.error("Failed to insert form data into Supabase")
                return jsonify({"message": "Form submission failed"}), 500
        else:
            logging.error("User not found in database")
            return jsonify({"message": "User not found"}), 404

    except Exception as e:
        logging.error(f"Error submitting form: {e}")
        return jsonify({"message": "Form submission failed", "error": str(e)}), 500

@app.before_request
def check_session_expiry():
    if 'email' in session:
        # Check if the session has expired
        if datetime.utcnow() > session.get('_fresh', datetime.utcnow()):
            session.clear()  # Clear the session if it has expired
            return jsonify({"message": "Session expired"}), 401

if __name__ == '__main__':
    app.run(debug=True)