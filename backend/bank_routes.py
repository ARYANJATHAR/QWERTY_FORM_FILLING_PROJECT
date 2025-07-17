from flask import Blueprint, request, session, jsonify, render_template, redirect, url_for, current_app
from backend.utils import validate_email
from backend.email_utils import send_pdf_email
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import io
import logging

bank_bp = Blueprint('bank', __name__)

@bank_bp.route('/bankform/bank_form.html')
def bank_form():
    if 'email' not in session:
        logging.warning("User not authenticated, redirecting to auth form")
        return redirect(url_for('auth.auth_form'))
    logging.info(f"Rendering bank form for user: {session.get('username', 'User')}")
    return render_template('bank_form.html')

@bank_bp.route('/submit-bank-form', methods=['POST'])
def submit_bank_form():
    if 'email' not in session:
        logging.warning("Unauthorized access to submit-bank-form")
        return jsonify({"message": "Unauthorized"}), 401
    
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['fullName', 'dateOfBirth', 'phoneNumber', 'address', 'accountType', 'initialDeposit']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"message": f"Missing required field: {field}"}), 400
        
        # Generate PDF
        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Add content to PDF
        story.append(Paragraph("Bank Account Opening Form", styles['Title']))
        story.append(Spacer(1, 12))
        
        for field, value in data.items():
            if field in required_fields:
                story.append(Paragraph(f"<b>{field.replace('_', ' ').title()}:</b> {value}", styles['Normal']))
                story.append(Spacer(1, 6))
        
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"<b>Submitted by:</b> {session.get('username', 'Unknown')}", styles['Normal']))
        story.append(Paragraph(f"<b>Email:</b> {session.get('email', 'Unknown')}", styles['Normal']))
        
        doc.build(story)
        
        # Send email with PDF
        user_email = session.get('email')
        if send_pdf_email(current_app.extensions['mail'], pdf_buffer, user_email):
            logging.info(f"Bank form submitted and emailed to {user_email}")
            return jsonify({"message": "Form submitted successfully! PDF sent to your email."}), 200
        else:
            return jsonify({"message": "Form submitted but failed to send email"}), 500
            
    except Exception as e:
        logging.error(f"Error submitting bank form: {e}")
        return jsonify({"message": "Failed to submit form"}), 500

@bank_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    logging.info("User logged out")
    return jsonify({"message": "Logged out successfully"}), 200
