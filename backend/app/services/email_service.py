import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_welcome_email(to_email: str, display_name: str | None) -> EmailMessage:
    greeting = f"Hi {display_name}," if display_name else "Hi,"

    message = EmailMessage()
    message["Subject"] = "Welcome to Sol"
    message["From"] = settings.mail_from or settings.smtp_username
    message["To"] = to_email
    message.set_content(
        f"{greeting}\n\n"
        "Your Sol account has been created.\n\n"
        "Sol is a supportive conversational assistant for emotional wellbeing. "
        "It's not a therapist and doesn't diagnose -- it's here to listen and "
        "offer support when you want to talk something through.\n\n"
        "-- The Sol team"
    )
    return message


def send_welcome_email(to_email: str, display_name: str | None = None) -> None:
    """Best-effort welcome email. Never raises -- a failure here should
    never block or fail account creation, which is the actual point of
    this endpoint."""
    if not settings.smtp_username or not settings.smtp_password:
        logger.warning("SMTP not configured; skipping welcome email to %s", to_email)
        return

    message = _build_welcome_email(to_email, display_name)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except (smtplib.SMTPException, OSError):
        logger.exception("Failed to send welcome email to %s", to_email)
