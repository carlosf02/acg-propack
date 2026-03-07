from django.contrib.auth import authenticate, login, logout, get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

User = get_user_model()


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_check(request):
    return Response({"status": "authenticated"})


@ensure_csrf_cookie
@api_view(["GET"])
@permission_classes([AllowAny])
def csrf(request):
    """Bootstrap endpoint: sets the csrftoken cookie so the SPA can read it."""
    return Response({"csrf": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """
    Accepts { "identifier": "<username_or_email>", "password": "<password>" }.
    Supports login by username or email.
    On success sets a session cookie and returns { "ok": true }.
    """
    identifier = request.data.get("identifier", "").strip()
    password = request.data.get("password", "")

    if not identifier or not password:
        return Response(
            {"detail": "identifier and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Resolve email → username so authenticate() can verify the password.
    username = identifier
    if "@" in identifier:
        try:
            user_obj = User.objects.get(email__iexact=identifier)
            username = user_obj.username
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    login(request, user)
    return Response({"ok": True})


@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    """Clears the current session."""
    logout(request)
    return Response({"ok": True})


@api_view(["POST"])
@permission_classes([AllowAny])
def signup_view(request):
    """
    Accepts { "username": "...", "email": "...", "password": "..." }.
    Creates a new user, logs them in, returns { "ok": true }.
    Does NOT create a company.
    """
    username = request.data.get("username", "").strip()
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "")

    if not username or not email or not password:
        return Response(
            {"detail": "username, email, and password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username__iexact=username).exists():
        return Response(
            {"detail": "A user with that username already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"detail": "A user with that email already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.create_user(username=username, email=email, password=password)
    login(request, user)
    return Response({"ok": True}, status=status.HTTP_201_CREATED)
