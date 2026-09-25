import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings


def send_password_reset_email(address: str, token: str):
    """Send a reset message only when a real SMTP transport is configured."""
    message = EmailMessage()
    message["Subject"] = "Reset your ProofLens password"
    message["From"] = settings.email_from
    message["To"] = address
    message.set_content(
        "A password reset was requested for your ProofLens account. "
        "Use this one-time link within 30 minutes:\n\n"
        f"{settings.frontend_url}/reset-password?token={token}\n\n"
        "If you did not request this, you can ignore this message."
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as client:
        client.starttls(context=ssl.create_default_context())
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)
