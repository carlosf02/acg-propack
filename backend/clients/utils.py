"""
clients/utils.py

Utility functions for the clients app.
"""
import logging
import secrets
import string

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings

from .models import UserProfile, UserRole

User = get_user_model()
logger = logging.getLogger(__name__)


def _generate_temp_password(length: int = 12) -> str:
    """Return a random password containing letters and digits."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def provision_client_user(client) -> None:
    """
    Create a Django User + UserProfile (role=CLIENT) for *client* when it has
    an email address and no existing auth user.

    Behaviour:
    - No email on the client record → no-op.
    - Email already exists AND is already linked to this client's profile → no-op (idempotent).
    - Email already exists but belongs to a different account → logs a warning, does nothing
      (we never overwrite or hijack an existing user account).
    - Otherwise → creates User, UserProfile, and sends a welcome e-mail with the
      temporary password via Django's configured EMAIL_BACKEND (console in dev).
    """
    if not client.email:
        logger.debug("Client %s has no email — skipping credential provisioning.", client.pk)
        return

    email = client.email.strip().lower()

    # Check if a User already exists for this email.
    existing_user = User.objects.filter(email__iexact=email).first()

    if existing_user is not None:
        # Is there already a profile that links this user to this same client?
        already_linked = UserProfile.objects.filter(
            user=existing_user,
            client=client,
        ).exists()

        if already_linked:
            logger.debug(
                "UserProfile already linked to client %s — nothing to do.",
                client.pk,
            )
            return

        # A user with that email exists but is NOT linked to this client.
        # We do not touch the existing account to avoid account hijacking.
        logger.warning(
            "A Django User with email '%s' already exists (pk=%s) but is not linked "
            "to client %s. Skipping credential provisioning. "
            "Link manually via the admin if needed.",
            email,
            existing_user.pk,
            client.pk,
        )
        return

    # No existing user — create one.
    temp_password = _generate_temp_password()
    username = email  # use email as username for clients

    new_user = User.objects.create_user(
        username=username,
        email=email,
        password=temp_password,
    )

    UserProfile.objects.create(
        user=new_user,
        role=UserRole.CLIENT,
        client=client,
        is_active=True,
        must_change_password=True,
    )

    logger.info(
        "Provisioned login credentials for client %s (user pk=%s, email=%s).",
        client.pk,
        new_user.pk,
        email,
    )

    _send_welcome_email(email, client, temp_password)


def _send_welcome_email(email: str, client, temp_password: str) -> None:
    """
    Send a welcome e-mail with the temporary password.

    In development (EMAIL_BACKEND = console), the message is printed to stdout.
    In production, swap EMAIL_BACKEND to an SMTP backend and this just works.
    """
    client_name = client.name or email
    subject = "Your ACG ProPack account has been created"
    body = (
        f"Hello {client_name},\n\n"
        f"An account has been created for you on ACG ProPack.\n\n"
        f"Login: {email}\n"
        f"Temporary password: {temp_password}\n\n"
        f"Please log in and change your password as soon as possible.\n\n"
        f"– ACG ProPack Team"
    )
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@acgpropack.com")

    try:
        send_mail(subject, body, from_email, [email], fail_silently=False)
    except Exception:
        # Never let email failure block client creation.
        logger.exception(
            "Failed to send welcome e-mail to %s for client %s. "
            "Credentials were created; password must be sent manually.",
            email,
            client.pk,
        )
