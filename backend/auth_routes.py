from flask import Blueprint, request, session, jsonify, render_template, redirect, url_for, current_app
from backend.utils import validate_email
from backend.email_utils import send_verification_email
import bcrypt
import requests
import uuid
from datetime import datetime, timedelta, timezone
import logging

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/')
def index():
    return redirect(url_for('auth.auth_form'))

@auth_bp.route('/auth/auth_form.html')
def auth_form():
    return render_template('auth_form.html')

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    try:
        # Check if the username already exists
        username_query = {"username": f"eq.{username}"}
        username_response = requests.get(f"{current_app.config['SUPABASE_URL']}/rest/v1/users", headers={
            "apikey": current_app.config['SUPABASE_KEY'],
            "Authorization": f"Bearer {current_app.config['SUPABASE_KEY']}"
        }, params=username_query).json()
        if isinstance(username_response, list) and len(username_response) > 0:
            return jsonify({"message": "Username already taken. Please choose a different username."}), 400
        # Check if the email already exists
        email_query = {"email": f"eq.{email}"}
        email_response = requests.get(f"{current_app.config['SUPABASE_URL']}/rest/v1/users", headers={
            "apikey": current_app.config['SUPABASE_KEY'],
            "Authorization": f"Bearer {current_app.config['SUPABASE_KEY']}"
        }, params=email_query).json()
        if isinstance(email_response, list) and len(email_response) > 0:
            return jsonify({"message": "Email already registered. Please use a different email."}), 400
        # Hash the password using bcrypt
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        # Generate a unique verification token
        verification_token = str(uuid.uuid4())
        verification_token_expiry = datetime.utcnow() + timedelta(hours=24)
        # Insert new user
        payload = {
            "username": username,
            "email": email,
            "password": hashed_password.decode('utf-8'),
            "verification_token": verification_token,
            "verification_token_expiry": verification_token_expiry.isoformat(),
            "is_verified": False,
        }
        response = requests.post(f"{current_app.config['SUPABASE_URL']}/rest/v1/users", headers={
            "apikey": current_app.config['SUPABASE_KEY'],
            "Authorization": f"Bearer {current_app.config['SUPABASE_KEY']}",
            "Content-Type": "application/json"
        }, json=payload)
        if response.ok:
            verification_link = f"{request.url_root}verify-email?token={verification_token}"
            if send_verification_email(current_app.extensions['mail'], email, verification_link):
                return jsonify({"message": "Signup successful. Please check your email to verify your account."}), 200
            else:
                return jsonify({"message": "Signup successful, but failed to send email, please try again later."}), 500
        else:
            return jsonify({"message": "Signup failed", "error": "No response from Supabase"}), 500
    except Exception as e:
        logging.error(f"Error during signup: {e}")
        return jsonify({"message": "Signup failed", "error": str(e)}), 500

@auth_bp.route('/signin', methods=['POST'])
def signin():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    try:
        query = {"email": f"eq.{email}"}
        user_response = requests.get(f"{current_app.config['SUPABASE_URL']}/rest/v1/users", headers={
            "apikey": current_app.config['SUPABASE_KEY'],
            "Authorization": f"Bearer {current_app.config['SUPABASE_KEY']}"
        }, params=query).json()
        if not isinstance(user_response, list) or len(user_response) == 0:
            return jsonify({"message": "Invalid email or password"}), 401
        user = user_response[0]
        if not user.get('is_verified'):
            return jsonify({"message": "Please verify your email address before signing in"}), 403
        if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            session['email'] = email
            session['username'] = user['username']
            session.permanent = True
            return jsonify({"message": "Signin successful", "username": user['username']}), 200
        else:
            return jsonify({"message": "Invalid email or password"}), 401
    except Exception as e:
        logging.error(f"Error during signin: {e}")
        return jsonify({"message": "Signin failed"}), 500

@auth_bp.route('/verify-email')
def verify_email():
    token = request.args.get('token')
    if not token:
        return jsonify({"message": "Missing verification token"}), 400
    
    try:
        query = {"verification_token": f"eq.{token}"}
        user_response = requests.get(f"{current_app.config['SUPABASE_URL']}/rest/v1/users", headers={
            "apikey": current_app.config['SUPABASE_KEY'],
            "Authorization": f"Bearer {current_app.config['SUPABASE_KEY']}"
        }, params=query).json()
        
        if not isinstance(user_response, list) or len(user_response) == 0:
            return jsonify({"message": "Invalid verification token"}), 400
        
        user = user_response[0]
        
        # Check if token is expired
        from datetime import datetime
        token_expiry = datetime.fromisoformat(user['verification_token_expiry'].replace('Z', '+00:00'))
        if datetime.utcnow().replace(tzinfo=timezone.utc) > token_expiry:
            return jsonify({"message": "Verification token has expired"}), 400
        
        # Update user as verified
        update_payload = {
            "is_verified": True,
            "verification_token": None,
            "verification_token_expiry": None
        }
        
        update_response = requests.patch(
            f"{current_app.config['SUPABASE_URL']}/rest/v1/users?id=eq.{user['id']}", 
            headers={
                "apikey": current_app.config['SUPABASE_KEY'],
                "Authorization": f"Bearer {current_app.config['SUPABASE_KEY']}",
                "Content-Type": "application/json"
            }, 
            json=update_payload
        )
        
        if update_response.ok:
            return jsonify({"message": "Email verified successfully! You can now sign in."}), 200
        else:
            return jsonify({"message": "Failed to verify email"}), 500
            
    except Exception as e:
        logging.error(f"Error during email verification: {e}")
        return jsonify({"message": "Email verification failed"}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    logging.info("User logged out")
    return jsonify({"message": "Logged out successfully"}), 200
