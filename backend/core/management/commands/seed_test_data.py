"""
Management command: seed_test_data

Creates test clients and warehouse receipts for development/testing.
Safe to run multiple times — skips records that already exist.

Usage:
    python manage.py seed_test_data
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


TEST_CLIENTS = [
    {"name": "Maria", "last_name": "Rodriguez", "email": "maria.rodriguez@test.acg", "client_type": "person", "cellphone": "555-0101", "city": "Miami"},
    {"name": "James", "last_name": "Chen", "email": "james.chen@test.acg", "client_type": "person", "cellphone": "555-0102", "city": "Los Angeles"},
    {"name": "Sofia", "last_name": "Morales", "email": "sofia.morales@test.acg", "client_type": "person", "cellphone": "555-0103", "city": "Houston"},
    {"name": "Tech Solutions", "last_name": "", "email": "orders@techsolutions.test.acg", "client_type": "company", "cellphone": "555-0104", "city": "New York"},
    {"name": "Carlos", "last_name": "Fernandez", "email": "carlos.fernandez@test.acg", "client_type": "person", "cellphone": "555-0105", "city": "Chicago"},
    {"name": "Global Imports LLC", "last_name": "", "email": "receiving@globalimports.test.acg", "client_type": "company", "cellphone": "555-0106", "city": "Dallas"},
]

# (client_email, tracking_number, carrier, status, description, weight_value, weight_unit, shipping_method)
TEST_WRS = [
    ("maria.rodriguez@test.acg",  "1Z999AA10123456784", "UPS",    "ACTIVE",    "Winter clothing order",       3.2,  "LB", "GROUND"),
    ("maria.rodriguez@test.acg",  "9400111899223397658832", "USPS", "SHIPPED", "Electronics accessories",     1.1,  "LB", "AIR"),
    ("james.chen@test.acg",       "1Z999AA10123456785", "UPS",    "ACTIVE",    "Computer parts",              8.5,  "LB", "GROUND"),
    ("james.chen@test.acg",       "794644792798",       "FEDEX",  "INACTIVE",  "Books and stationery",        4.3,  "LB", "OCEAN"),
    ("sofia.morales@test.acg",    "1Z999AA10123456786", "UPS",    "ACTIVE",    "Kitchen appliances",          12.0, "LB", "GROUND"),
    ("sofia.morales@test.acg",    "9400111899223397658833", "USPS", "CANCELLED","Fragile glassware",          2.8,  "LB", "AIR"),
    ("orders@techsolutions.test.acg", "794644792799",   "FEDEX",  "ACTIVE",    "Server hardware",            25.0, "LB", "GROUND"),
    ("orders@techsolutions.test.acg", "1Z999AA10123456787", "UPS", "SHIPPED",  "Networking equipment",       18.3, "LB", "AIR"),
    ("orders@techsolutions.test.acg", "9400111899223397658834", "USPS", "INACTIVE", "Office supplies",         5.5, "LB", "GROUND"),
    ("carlos.fernandez@test.acg", "794644792800",       "FEDEX",  "ACTIVE",    "Clothing and shoes",          6.7, "LB", "OCEAN"),
    ("receiving@globalimports.test.acg", "1Z999AA10123456788", "UPS", "ACTIVE", "Industrial components",    42.0,  "LB", "OCEAN"),
    ("receiving@globalimports.test.acg", "9400111899223397658835", "USPS", "SHIPPED", "Promotional materials", 3.9, "LB", "AIR"),
]


class Command(BaseCommand):
    help = "Seed test clients and warehouse receipts (idempotent)."

    def handle(self, *args, **options):
        from company.models import Company
        from clients.models import Client
        from receiving.models import WarehouseReceipt

        # ── Find company ──────────────────────────────────────────────────────
        company = Company.objects.first()
        if not company:
            raise CommandError("No company found. Create one via the app before seeding.")

        self.stdout.write(f"Using company: {company.name} (id={company.pk})")

        clients_created = 0
        clients_skipped = 0
        wrs_created = 0
        wrs_skipped = 0

        with transaction.atomic():
            # ── Create clients ────────────────────────────────────────────────
            email_to_client = {}
            for spec in TEST_CLIENTS:
                existing = Client.objects.filter(email__iexact=spec["email"], company=company).first()
                if existing:
                    clients_skipped += 1
                    email_to_client[spec["email"]] = existing
                    continue

                client = Client.objects.create(
                    company=company,
                    name=spec["name"],
                    last_name=spec["last_name"],
                    email=spec["email"],
                    client_type=spec["client_type"],
                    cellphone=spec["cellphone"],
                    city=spec["city"],
                    is_active=True,
                )
                # client_code is auto-set on post_save; refresh to get it
                client.refresh_from_db()
                email_to_client[spec["email"]] = client
                clients_created += 1
                self.stdout.write(f"  Created client: {client.client_code} — {client.name} {client.last_name}".rstrip())

            # ── Create warehouse receipts ─────────────────────────────────────
            wr_counter = WarehouseReceipt.objects.filter(company=company).count()

            for (client_email, tracking, carrier, status, description, weight, weight_unit, ship_method) in TEST_WRS:
                client = email_to_client.get(client_email)
                if not client:
                    self.stdout.write(self.style.WARNING(f"  Skipping WR — client not found for {client_email}"))
                    continue

                # Idempotency: match on tracking number within the company
                if WarehouseReceipt.objects.filter(company=company, tracking_number=tracking).exists():
                    wrs_skipped += 1
                    continue

                wr_counter += 1
                wr_number = f"WR-{company.pk}-{wr_counter:06d}"
                # Ensure wr_number is unique (unlikely collision but safe)
                while WarehouseReceipt.objects.filter(wr_number=wr_number).exists():
                    wr_counter += 1
                    wr_number = f"WR-{company.pk}-{wr_counter:06d}"

                wr = WarehouseReceipt.objects.create(
                    company=company,
                    client=client,
                    wr_number=wr_number,
                    tracking_number=tracking,
                    carrier=carrier,
                    status=status,
                    description=description,
                    weight_value=weight,
                    weight_unit=weight_unit,
                    shipping_method=ship_method,
                    allow_repacking=True,
                )
                wrs_created += 1
                self.stdout.write(f"  Created WR: {wr.wr_number} ({wr.status}) — {client.name}")

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("── Seed complete ─────────────────────────"))
        self.stdout.write(f"  Clients created : {clients_created}")
        self.stdout.write(f"  Clients skipped : {clients_skipped} (already exist)")
        self.stdout.write(f"  WRs created     : {wrs_created}")
        self.stdout.write(f"  WRs skipped     : {wrs_skipped} (already exist)")
        self.stdout.write(self.style.SUCCESS("──────────────────────────────────────────"))
