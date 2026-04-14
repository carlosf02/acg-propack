from django.apps import AppConfig


class CompanyConfig(AppConfig):
    name = "company"

    def ready(self):
        from . import signals  # noqa: F401
