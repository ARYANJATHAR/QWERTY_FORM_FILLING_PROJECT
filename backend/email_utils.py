from flask_mail import Message
from flask import current_app as app
import logging

def send_pdf_email(mail, pdf_data, recipient_email):
    """
    Send an email with the generated PDF attached.
    """
    try:
        msg = Message(
            subject='Bank Form Submission',
            sender=app.config['MAIL_DEFAULT_SENDER'],
            recipients=[recipient_email]
        )
        pdf_data.seek(0)
        msg.attach(
            filename="bank_form.pdf",
            content_type="application/pdf",
            data=pdf_data.read()
        )
        mail.send(msg)
        logging.info(f"PDF sent successfully to {recipient_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {e}")
        return False

def send_verification_email(mail, email, verification_link):
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
