"""
Management command: seed_data

Seeds realistic test data for consolidation, repack, and locker workflows.
Wipes previous test data first (after confirmation) but preserves your
admin user, Company, CompanyMember, AssociateCompany, Office, Warehouse,
and StorageLocation rows.

Usage:
    python manage.py seed_data          # prompts before wiping
    python manage.py seed_data --yes    # skips confirmation
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone


class Command(BaseCommand):
    help = "Seed realistic test data (wipes previous test data first)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Skip confirmation prompt before wiping test data.',
        )
        parser.add_argument(
            '--company',
            type=int,
            default=None,
            help='Company ID to target. Defaults to the first Company that '
                 'has at least one active Office and active Warehouse.',
        )

    def handle(self, *args, **options):
        from clients.models import Client, UserProfile, UserRole
        from company.models import AssociateCompany, Company, Office
        from consolidation.models import (
            Consolidation,
            ConsolidationReceipt,
            ConsolidationStatus,
            ShipType,
        )
        from consolidation.services import (
            add_item_to_consolidation,
            close_consolidation,
        )
        from core.models import WRStatus
        from inventory.models import (
            InventoryBalance,
            InventoryTransaction,
            InventoryTransactionLine,
        )
        from receiving.models import (
            RepackLink,
            RepackOperation,
            WarehouseReceipt,
            WarehouseReceiptLine,
            WarehouseReceiptLineTracking,
        )
        from receiving.services_repack import consolidate_wrs
        from shipping.models import Shipment, ShipmentItem
        from warehouse.models import LocationType, StorageLocation, Warehouse

        # ── Resolve anchors ─────────────────────────────────────────────────
        if options['company'] is not None:
            try:
                company = Company.objects.get(pk=options['company'])
            except Company.DoesNotExist:
                raise CommandError(
                    f"Company id={options['company']} not found."
                )
        else:
            # Pick the first Company that has both an active Office and
            # an active Warehouse — those are required for seeding.
            company = None
            for c in Company.objects.order_by('pk'):
                has_office = Office.objects.filter(
                    company=c, is_active=True
                ).exists()
                has_warehouse = Warehouse.objects.filter(
                    company=c, is_active=True
                ).exists()
                if has_office and has_warehouse:
                    company = c
                    break
            if not company:
                raise CommandError(
                    "No Company found with an active Office and active Warehouse. "
                    "Complete onboarding for one first, or pass --company <id>."
                )

        admin_user = (
            User.objects.filter(is_superuser=True).order_by('pk').first()
        )
        if not admin_user:
            raise CommandError(
                "No superuser exists. Run `python manage.py createsuperuser` first."
            )

        warehouse = (
            Warehouse.objects.filter(company=company, is_active=True)
            .order_by('pk')
            .first()
        )
        if not warehouse:
            raise CommandError(
                f"No active Warehouse for company '{company.name}'. Create one first."
            )

        main_office = (
            Office.objects.filter(company=company, is_active=True)
            .order_by('pk')
            .first()
        )
        if not main_office:
            raise CommandError(
                f"No active Office for company '{company.name}'. Create one first."
            )

        self.stdout.write(self.style.NOTICE(
            f"Company     : {company.name} (id={company.pk})"
        ))
        self.stdout.write(self.style.NOTICE(
            f"Warehouse   : {warehouse.code} — {warehouse.name}"
        ))
        self.stdout.write(self.style.NOTICE(
            f"Sending ofc : {main_office.code or '(no code)'} — {main_office.name}"
        ))
        self.stdout.write(self.style.NOTICE(
            f"Admin user  : {admin_user.username}"
        ))

        # ── Pre-wipe counts ─────────────────────────────────────────────────
        wipe_counts = [
            ('Clients', Client.objects.count()),
            ('Client-portal users', UserProfile.objects.filter(role=UserRole.CLIENT).count()),
            ('WarehouseReceipts', WarehouseReceipt.objects.count()),
            ('RepackOperations', RepackOperation.objects.count()),
            ('Consolidations', Consolidation.objects.count()),
            ('Shipments', Shipment.objects.count()),
            ('InventoryBalances', InventoryBalance.objects.count()),
            ('InventoryTransactions', InventoryTransaction.objects.count()),
        ]

        if not options['yes']:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('About to DELETE:'))
            for label, n in wipe_counts:
                self.stdout.write(f'  {label:<22} {n}')
            self.stdout.write(self.style.WARNING(
                '\nPreserved: superusers, Company, CompanyMember, AssociateCompany, '
                'Office, Warehouse, StorageLocation.'
            ))
            answer = input('\nProceed? [y/N]: ').strip().lower()
            if answer not in ('y', 'yes'):
                self.stdout.write(self.style.ERROR('Aborted.'))
                return

        with transaction.atomic():
            # ── Wipe (FK-safe order) ────────────────────────────────────────
            self.stdout.write('\nWiping previous test data...')
            InventoryTransactionLine.objects.all().delete()
            InventoryTransaction.objects.all().delete()
            InventoryBalance.objects.all().delete()
            ShipmentItem.objects.all().delete()
            Shipment.objects.all().delete()
            ConsolidationReceipt.objects.all().delete()
            Consolidation.objects.all().delete()
            RepackLink.objects.all().delete()
            RepackOperation.objects.all().delete()
            # Null out parent_wr to avoid PROTECT issues on delete
            WarehouseReceipt.objects.update(parent_wr=None)
            WarehouseReceipt.objects.all().delete()  # cascades lines + trackings

            client_user_ids = list(
                UserProfile.objects.filter(role=UserRole.CLIENT)
                .values_list('user_id', flat=True)
            )
            # Delete Users; UserProfile cascades with them
            User.objects.filter(id__in=client_user_ids).delete()
            Client.objects.all().delete()

            # ── Associate companies (idempotent) ────────────────────────────
            associate_specs = [
                ('Las Palmas', 'agency'),
                ('Miami Express', 'agency'),
                ('Caracas Courier', 'courier'),
            ]
            associates = {}
            for name, partner_type in associate_specs:
                ac, _ = AssociateCompany.objects.get_or_create(
                    company=company,
                    name=name,
                    defaults={'partner_type': partner_type, 'is_active': True},
                )
                associates[name] = ac

            # Ensure each associate has at least one Office (needed for
            # Consolidation.receiving_office when it's not the main company).
            associate_offices = {}
            office_city_defaults = {
                'Las Palmas': ('Las Palmas', 'ES'),
                'Miami Express': ('Miami', 'US'),
                'Caracas Courier': ('Caracas', 'VE'),
            }
            for name, ac in associates.items():
                office = Office.objects.filter(
                    associate_company=ac, is_active=True
                ).first()
                if not office:
                    city, country = office_city_defaults[name]
                    office = Office.objects.create(
                        associate_company=ac,
                        company=None,
                        name=f'{name} Main Office',
                        code=f'{name.split()[0][:3].upper()}-01',
                        city=city,
                        country=country,
                        is_active=True,
                    )
                associate_offices[name] = office

            # Storage location for repack outputs
            storage_location = StorageLocation.objects.filter(
                warehouse=warehouse, is_active=True
            ).first()
            if not storage_location:
                storage_location = StorageLocation.objects.create(
                    company=company,
                    warehouse=warehouse,
                    code='SEED-STORE-01',
                    description='Seed data storage location',
                    location_type=LocationType.STORAGE,
                )

            # ── Clients (10: 6 person / 4 company, 3 with partial data) ─────
            # Fields: key, type, name, last_name, email, cellphone, home_phone,
            #         address, city, postal_code, associate_key
            client_specs = [
                ('maria',    'person',  'Maria',   'Rodriguez',
                 'maria.rodriguez@test.acg', '305-555-0101', '305-555-0102',
                 '1200 Ocean Dr', 'Miami', '33139', None),
                ('james',    'person',  'James',   'Chen',
                 None, '213-555-0103', None,
                 '500 W 7th St', None, None, None),           # partial
                ('global',   'company', 'Global Imports LLC', '',
                 'orders@globalimports.test.acg', '214-555-0104', '214-555-0199',
                 '8800 Elm St', 'Dallas', '75201', None),
                ('sofia',    'person',  'Sofia',   'Morales',
                 'sofia.morales@test.acg', '713-555-0105', '713-555-0106',
                 '2400 Kirby Ave', 'Houston', '77098', 'Las Palmas'),
                ('techsol',  'company', 'Tech Solutions',    '',
                 'orders@techsolutions.test.acg', None, None,
                 '450 Madison Ave', 'New York', '10022', 'Las Palmas'),  # partial
                ('carlos',   'person',  'Carlos',  'Fernandez',
                 'carlos.fernandez@test.acg', '312-555-0108', '312-555-0109',
                 '600 N State St', 'Chicago', '60610', 'Miami Express'),
                ('pacific',  'company', 'Pacific Trading Co', '',
                 None, '206-555-0110', None,
                 None, 'Seattle', '98101', 'Miami Express'),  # partial
                ('elena',    'person',  'Elena',   'Garcia',
                 'elena.garcia@test.acg', '407-555-0111', '407-555-0112',
                 '200 Celebration Blvd', 'Orlando', '32830', 'Miami Express'),
                ('ana',      'person',  'Ana',     'Lopez',
                 'ana.lopez@test.acg', '602-555-0113', '602-555-0114',
                 '555 E Camelback Rd', 'Phoenix', '85012', 'Caracas Courier'),
                ('atlantic', 'company', 'Atlantic Holdings', '',
                 'ops@atlantic.test.acg', '617-555-0115', '617-555-0116',
                 '101 Boylston St', 'Boston', '02116', 'Caracas Courier'),
            ]

            clients = {}
            for (key, ctype, name, last, email, cell, home,
                 addr, city, postal, assoc_key) in client_specs:
                c = Client.objects.create(
                    company=company,
                    associate_company=associates[assoc_key] if assoc_key else None,
                    client_type=ctype,
                    name=name,
                    last_name=last,
                    email=email,
                    cellphone=cell,
                    home_phone=home,
                    address=addr,
                    city=city,
                    postal_code=postal,
                    is_active=True,
                )
                c.refresh_from_db()  # pick up auto-assigned client_code
                clients[key] = c

            # ── Warehouse Receipts ──────────────────────────────────────────
            def recipient_from(client):
                if client is None:
                    return None, None
                display = (
                    client.name
                    if client.client_type == 'company'
                    else f"{client.name or ''} {client.last_name or ''}".strip()
                )
                addr_parts = [client.address, client.city, client.postal_code]
                addr = ', '.join([p for p in addr_parts if p])
                return (display or None), (addr or None)

            base_time = timezone.now() - timedelta(days=30)

            # Each spec: (key, client_key, recipient_key, associate_key,
            #             shipping_method, receipt_type, allow_repacking,
            #             location_note, offset_days, lines)
            # lines: list of dicts {package_type, weight, dims (l,w,h),
            #                       pieces, trackings, description}
            wr_specs = [
                # ── MAIN COMPANY (associate=None) — 5 WRs ───────────────────
                ('WR-SEED-01', 'maria', 'elena', None, 'air', 'standard',
                 False, 'Bin A1', 2, [
                    {'package_type': 'box', 'weight': 4.5,
                     'dims': (12, 10, 8), 'pieces': 1,
                     'trackings': ['1Z999AA1010000SEED01'],
                     'description': 'Winter clothing'},
                 ]),
                ('WR-SEED-02', 'maria', 'elena', None, 'air', 'standard',
                 False, 'Bin A2', 5, [
                    {'package_type': 'carton', 'weight': 6.0,
                     'dims': (16, 12, 10), 'pieces': 2,
                     'trackings': ['1Z999AA1010000SEED02A', '1Z999AA1010000SEED02B'],
                     'description': 'Electronics accessories'},
                 ]),
                ('WR-SEED-03', 'james', None, None, 'ground', 'express',
                 True, None, 5, [  # partial: no recipient, no location_note
                    {'package_type': 'envelope', 'weight': 0.5,
                     'dims': (12, 9, 1), 'pieces': 1,
                     'trackings': ['9400111899223SEED03'],
                     'description': 'Legal documents'},
                 ]),
                ('WR-SEED-04', 'global', 'atlantic', None, 'ground', 'refrigerated',
                 True, 'Bay B-cold', 8, [
                    {'package_type': 'pallet', 'weight': 180.0,
                     'dims': (48, 40, 50), 'pieces': 12,
                     'trackings': ['FDX79464479SEED04A'],
                     'description': 'Pharmaceutical pallet'},
                    {'package_type': 'box', 'weight': 15.0,
                     'dims': (20, 16, 12), 'pieces': 4,
                     'trackings': ['FDX79464479SEED04B', 'FDX79464479SEED04C'],
                     'description': 'Vaccine kits'},
                    {'package_type': 'carton', 'weight': 8.0,
                     'dims': (14, 10, 8), 'pieces': 1,
                     'trackings': ['FDX79464479SEED04D'],
                     'description': 'Specimen pouches'},
                 ]),
                ('WR-SEED-05', 'maria', 'elena', None, 'air', 'standard',
                 True, 'Bin A3', 8, [
                    {'package_type': 'box', 'weight': 5.2,
                     'dims': (14, 10, 8), 'pieces': 2,
                     'trackings': ['1Z999AA1010000SEED05A'],
                     'description': 'Shoes'},
                    {'package_type': 'carton', 'weight': 3.1,
                     'dims': (12, 10, 6), 'pieces': 1,
                     'trackings': ['1Z999AA1010000SEED05B'],
                     'description': 'Accessories'},
                 ]),

                # ── LAS PALMAS — 6 WRs ──────────────────────────────────────
                ('WR-SEED-06', 'sofia', 'atlantic', 'Las Palmas', 'sea', 'standard',
                 True, 'Rack C1', 8, [
                    {'package_type': 'box', 'weight': 22.0,
                     'dims': (24, 18, 16), 'pieces': 1,
                     'trackings': ['MSC-SEED-06'],
                     'description': 'Kitchen appliance'},
                 ]),
                ('WR-SEED-07', 'sofia', 'atlantic', 'Las Palmas', 'sea', 'standard',
                 True, 'Rack C1', 12, [
                    {'package_type': 'box', 'weight': 12.0,
                     'dims': (20, 14, 10), 'pieces': 2,
                     'trackings': ['MSC-SEED-07A'],
                     'description': 'Home goods'},
                    {'package_type': 'carton', 'weight': 6.5,
                     'dims': (14, 10, 8), 'pieces': 1,
                     'trackings': ['MSC-SEED-07B'],
                     'description': 'Linens'},
                 ]),
                ('WR-SEED-08', 'sofia', 'atlantic', 'Las Palmas', 'sea', 'standard',
                 True, 'Rack C2', 15, [
                    {'package_type': 'box', 'weight': 8.0,
                     'dims': (16, 12, 10), 'pieces': 1,
                     'trackings': ['MSC-SEED-08'],
                     'description': 'Books'},
                 ]),
                ('WR-SEED-09', 'sofia', 'atlantic', 'Las Palmas', 'sea', 'standard',
                 True, 'Rack C3', 15, [
                    {'package_type': 'carton', 'weight': 4.0,
                     'dims': (14, 10, 6), 'pieces': 4,
                     'trackings': ['MSC-SEED-09A', 'MSC-SEED-09B',
                                   'MSC-SEED-09C', 'MSC-SEED-09D'],
                     'description': 'Multi-piece set'},
                 ]),
                ('WR-SEED-10', 'sofia', 'atlantic', 'Las Palmas', 'sea', 'standard',
                 True, 'Rack C3', 15, [
                    {'package_type': 'box', 'weight': 9.5,
                     'dims': (18, 14, 10), 'pieces': 1,
                     'trackings': ['MSC-SEED-10'],
                     'description': 'Decor items'},
                 ]),
                ('WR-SEED-11', 'techsol', 'atlantic', 'Las Palmas', 'air', 'express',
                 True, None, 15, [  # partial: no location_note
                    {'package_type': 'pallet', 'weight': 120.0,
                     'dims': (48, 40, 48), 'pieces': 1,
                     'trackings': ['DHL-SEED-11A'],
                     'description': 'Server rack'},
                    {'package_type': 'crate', 'weight': 65.0,
                     'dims': (40, 30, 24), 'pieces': 1,
                     'trackings': ['DHL-SEED-11B'],
                     'description': 'Network switch'},
                    {'package_type': 'box', 'weight': 14.0,
                     'dims': (18, 14, 10), 'pieces': 3,
                     'trackings': ['DHL-SEED-11C', 'DHL-SEED-11D'],
                     'description': 'Cables and adapters'},
                    {'package_type': 'envelope', 'weight': 1.5,
                     'dims': (12, 9, 2), 'pieces': 2,
                     'trackings': ['DHL-SEED-11E'],
                     'description': 'Documentation'},
                 ]),

                # ── MIAMI EXPRESS — 4 WRs ───────────────────────────────────
                ('WR-SEED-12', 'carlos', 'elena', 'Miami Express', 'ground', 'standard',
                 True, 'Bin D1', 18, [
                    {'package_type': 'box', 'weight': 11.0,
                     'dims': (20, 14, 10), 'pieces': 1,
                     'trackings': ['MXP-SEED-12'],
                     'description': 'Clothing'},
                 ]),
                ('WR-SEED-13', 'carlos', 'elena', 'Miami Express', 'ground', 'standard',
                 True, 'Bin D2', 18, [
                    {'package_type': 'box', 'weight': 7.5,
                     'dims': (16, 12, 10), 'pieces': 3,
                     'trackings': ['MXP-SEED-13A'],
                     'description': 'Shoes'},
                    {'package_type': 'carton', 'weight': 4.0,
                     'dims': (12, 10, 6), 'pieces': 2,
                     'trackings': ['MXP-SEED-13B'],
                     'description': 'Accessories'},
                 ]),
                ('WR-SEED-14', 'pacific', 'atlantic', 'Miami Express', 'air', 'refrigerated',
                 False, 'Cold Zone', 20, [
                    {'package_type': 'box', 'weight': 45.0,
                     'dims': (24, 18, 14), 'pieces': 12,
                     'trackings': [f'PAC-SEED-14-{i:02d}' for i in range(1, 13)],
                     'description': 'Pharmaceutical ampules'},
                 ]),
                ('WR-SEED-15', 'carlos', 'elena', 'Miami Express', 'ground', 'fragile',
                 True, 'Rack E1', 20, [
                    {'package_type': 'crate', 'weight': 32.0,
                     'dims': (30, 24, 20), 'pieces': 1,
                     'trackings': ['MXP-SEED-15A'],
                     'description': 'Glassware crate'},
                    {'package_type': 'box', 'weight': 8.0,
                     'dims': (16, 12, 10), 'pieces': 1,
                     'trackings': ['MXP-SEED-15B'],
                     'description': 'Protective padding'},
                 ]),

                # ── CARACAS COURIER — 3 WRs ─────────────────────────────────
                ('WR-SEED-16', 'ana', 'global', 'Caracas Courier', 'air', 'oversized',
                 False, 'Bin F1', 20, [
                    {'package_type': 'drum', 'weight': 90.0,
                     'dims': (36, 36, 48), 'pieces': 1,
                     'trackings': ['CCS-SEED-16'],
                     'description': 'Industrial drum'},
                 ]),
                ('WR-SEED-17', 'atlantic', 'elena', 'Caracas Courier', 'ground', 'refrigerated',
                 True, 'Cold Zone 2', 22, [
                    {'package_type': 'pallet', 'weight': 220.0,
                     'dims': (48, 40, 50), 'pieces': 8,
                     'trackings': ['CCS-SEED-17A'],
                     'description': 'Frozen goods pallet'},
                    {'package_type': 'box', 'weight': 12.0,
                     'dims': (18, 14, 10), 'pieces': 2,
                     'trackings': ['CCS-SEED-17B'],
                     'description': 'Ice packs'},
                 ]),
                ('WR-SEED-18', 'ana', 'global', 'Caracas Courier', 'sea', 'express',
                 True, 'Rack G1', 22, [
                    {'package_type': 'box', 'weight': 14.0,
                     'dims': (20, 14, 10), 'pieces': 1,
                     'trackings': ['CCS-SEED-18A'],
                     'description': 'Electronics'},
                    {'package_type': 'envelope', 'weight': 0.8,
                     'dims': (12, 9, 1), 'pieces': 1,
                     'trackings': ['CCS-SEED-18B'],
                     'description': 'Paperwork'},
                    {'package_type': 'carton', 'weight': 5.5,
                     'dims': (14, 12, 8), 'pieces': 2,
                     'trackings': ['CCS-SEED-18C'],
                     'description': 'Promo items'},
                 ]),

                # ── REPACK-COMPATIBLE CLUSTER (demo) ────────────────────────
                # All 3 share: sender=Global, recipient=Carlos, agency=main,
                # method=sea, receipt_type=standard, allow_repacking=True,
                # status=ACTIVE. Not consumed by any pre-seeded repack.
                ('WR-SEED-19', 'global', 'carlos', None, 'sea', 'standard',
                 True, 'Bay R1', 25, [
                    {'package_type': 'box', 'weight': 3.5,
                     'dims': (14, 10, 8), 'pieces': 1,
                     'trackings': ['GLB-RPK-19'],
                     'description': 'Apparel sample'},
                 ]),
                ('WR-SEED-20', 'global', 'carlos', None, 'sea', 'standard',
                 True, 'Bay R1', 25, [
                    {'package_type': 'box', 'weight': 8.0,
                     'dims': (18, 14, 10), 'pieces': 2,
                     'trackings': ['GLB-RPK-20A', 'GLB-RPK-20B'],
                     'description': 'Hardware kit'},
                    {'package_type': 'carton', 'weight': 4.0,
                     'dims': (12, 10, 6), 'pieces': 1,
                     'trackings': ['GLB-RPK-20C'],
                     'description': 'Manuals'},
                 ]),
                ('WR-SEED-21', 'global', 'carlos', None, 'sea', 'standard',
                 True, 'Bay R2', 25, [
                    {'package_type': 'crate', 'weight': 25.0,
                     'dims': (24, 18, 14), 'pieces': 4,
                     'trackings': ['GLB-RPK-21A', 'GLB-RPK-21B',
                                   'GLB-RPK-21C', 'GLB-RPK-21D'],
                     'description': 'Machinery parts'},
                 ]),

                # ── AIR PRICING-DEMO CLUSTER (Las Palmas, air, standard) ────
                # All 3 share: sender=Sofia, recipient=Atlantic, agency=Las
                # Palmas, method=air, receipt_type=standard, allow_repacking=
                # True, status=ACTIVE. Pre-attached to the OPEN AIR seed
                # consolidation below so the Pricing Summary card is
                # populated on a fresh seed. Dimensions/weights are chosen so
                # per-item the chargeable-weight winner varies (Pvol on
                # 22/24, Actual on 23), which makes the demo numbers
                # non-trivial and the TODO(pricing-v2) per-item
                # optimization story visible.
                ('WR-SEED-22', 'sofia', 'atlantic', 'Las Palmas', 'air', 'standard',
                 True, 'Bin H1', 25, [
                    {'package_type': 'box', 'weight': 20.0,
                     'dims': (30, 24, 18), 'pieces': 1,
                     'trackings': ['LAS-AIR-22'],
                     'description': 'Display kiosk (bulky, lightweight)'},
                 ]),
                ('WR-SEED-23', 'sofia', 'atlantic', 'Las Palmas', 'air', 'standard',
                 True, 'Bin H2', 28, [
                    {'package_type': 'carton', 'weight': 22.0,
                     'dims': (12, 10, 8), 'pieces': 1,
                     'trackings': ['LAS-AIR-23'],
                     'description': 'Toolkit (heavy, compact)'},
                 ]),
                ('WR-SEED-24', 'sofia', 'atlantic', 'Las Palmas', 'air', 'standard',
                 True, 'Bin H3', 28, [
                    {'package_type': 'box', 'weight': 18.0,
                     'dims': (20, 16, 14), 'pieces': 1,
                     'trackings': ['LAS-AIR-24'],
                     'description': 'Merchandise carton (mixed density)'},
                 ]),
            ]

            wrs = {}
            for (wr_num, client_key, recip_key, assoc_key,
                 method, rtype, allow_repack, loc_note, offset_days,
                 lines) in wr_specs:
                client = clients[client_key]
                recipient_name, recipient_address = recipient_from(
                    clients[recip_key] if recip_key else None
                )
                associate = associates[assoc_key] if assoc_key else None

                wr = WarehouseReceipt.objects.create(
                    company=company,
                    client=client,
                    wr_number=wr_num,
                    received_warehouse=warehouse,
                    associate_company=associate,
                    shipping_method=method,
                    receipt_type=rtype,
                    location_note=loc_note,
                    recipient_name=recipient_name,
                    recipient_address=recipient_address,
                    allow_repacking=allow_repack,
                    status=WRStatus.ACTIVE,
                    received_at=base_time + timedelta(days=offset_days),
                    is_repack=False,
                )
                wrs[wr_num] = wr

                # Lines + tracking
                for line_spec in lines:
                    l, w, h = line_spec['dims']
                    volume_cf = (Decimal(l) * Decimal(w) * Decimal(h)) / Decimal('1728')
                    line = WarehouseReceiptLine.objects.create(
                        receipt=wr,
                        company=company,
                        date=wr.received_at.date(),
                        package_type=line_spec['package_type'],
                        weight=Decimal(str(line_spec['weight'])),
                        length=Decimal(str(l)),
                        width=Decimal(str(w)),
                        height=Decimal(str(h)),
                        pieces=line_spec['pieces'],
                        volume_cf=volume_cf.quantize(Decimal('0.0001')),
                        description=line_spec.get('description', ''),
                        tracking_number=','.join(line_spec['trackings']),
                    )
                    for i, tn in enumerate(line_spec['trackings']):
                        WarehouseReceiptLineTracking.objects.create(
                            line=line,
                            company=company,
                            tracking_number=tn,
                            order=i,
                        )

            # ── Repacks (via service) ───────────────────────────────────────
            repack_a = consolidate_wrs(
                client=clients['maria'],
                input_wrs=[wrs['WR-SEED-01'], wrs['WR-SEED-02']],
                to_location=storage_location,
                output_data={
                    'tracking_number': 'REPACK-SEED-A',
                    'carrier': 'UPS',
                    'description': 'Repack A — combined Maria drops',
                    'location_note': 'Bin A5',
                    'notes': 'Seed data: Repack A',
                    'lines': [{
                        'package_type': 'box',
                        'weight': '10.5',
                        'length': '22',
                        'width': '16',
                        'height': '12',
                        'pieces': 1,
                        'description': 'Combined winter clothing + electronics',
                    }],
                },
                performed_by=admin_user,
                notes='Seed data: Repack A',
                company=company,
            )

            repack_b = consolidate_wrs(
                client=clients['sofia'],
                input_wrs=[wrs['WR-SEED-09'], wrs['WR-SEED-10']],
                to_location=storage_location,
                output_data={
                    'tracking_number': 'REPACK-SEED-B',
                    'carrier': 'MSC',
                    'description': 'Repack B — consolidated Sofia sea freight',
                    'location_note': 'Rack C5',
                    'notes': 'Seed data: Repack B',
                    'lines': [{
                        'package_type': 'crate',
                        'weight': '13.0',
                        'length': '24',
                        'width': '18',
                        'height': '14',
                        'pieces': 1,
                        'description': 'Combined Sofia sea freight',
                    }],
                },
                performed_by=admin_user,
                notes='Seed data: Repack B',
                company=company,
            )

            # ── Consolidations ──────────────────────────────────────────────
            # DRAFT (empty) — Caracas Courier, air, standard
            draft_consol = Consolidation.objects.create(
                company=company,
                associate_company=associates['Caracas Courier'],
                ship_type=ShipType.AIR,
                consolidation_type='standard',
                sending_office=main_office,
                receiving_office=associate_offices['Caracas Courier'],
                alt_name='Seed DRAFT',
                note='Empty draft for testing add-item flow.',
                status=ConsolidationStatus.DRAFT,
            )

            # OPEN (3 items) — Las Palmas, sea, standard
            open_consol = Consolidation.objects.create(
                company=company,
                associate_company=associates['Las Palmas'],
                ship_type=ShipType.SEA,
                consolidation_type='standard',
                sending_office=main_office,
                receiving_office=associate_offices['Las Palmas'],
                alt_name='Seed OPEN',
                note='Open consolidation with 3 eligible Sofia items.',
                status=ConsolidationStatus.DRAFT,
            )
            for wr_num in ['WR-SEED-06', 'WR-SEED-07', 'WR-SEED-08']:
                add_item_to_consolidation(
                    open_consol.id, wrs[wr_num].id, company
                )
            open_consol.refresh_from_db()

            # CLOSED — Miami Express, ground, standard
            closed_consol = Consolidation.objects.create(
                company=company,
                associate_company=associates['Miami Express'],
                ship_type=ShipType.GROUND,
                consolidation_type='standard',
                sending_office=main_office,
                receiving_office=associate_offices['Miami Express'],
                alt_name='Seed CLOSED',
                note='Closed consolidation with 2 Carlos items.',
                status=ConsolidationStatus.DRAFT,
            )
            for wr_num in ['WR-SEED-12', 'WR-SEED-13']:
                add_item_to_consolidation(
                    closed_consol.id, wrs[wr_num].id, company
                )
            close_consolidation(closed_consol.id, company)
            closed_consol.refresh_from_db()

            # OPEN AIR (3 items) — Las Palmas, air, standard. Pre-populated
            # so the Consolidation Detail "Pricing Summary" card has real
            # AIR data to show on a fresh seed.
            open_air_consol = Consolidation.objects.create(
                company=company,
                associate_company=associates['Las Palmas'],
                ship_type=ShipType.AIR,
                consolidation_type='standard',
                sending_office=main_office,
                receiving_office=associate_offices['Las Palmas'],
                alt_name='Seed OPEN AIR',
                note='Open air consolidation for pricing demo.',
                status=ConsolidationStatus.DRAFT,
            )
            for wr_num in ['WR-SEED-22', 'WR-SEED-23', 'WR-SEED-24']:
                add_item_to_consolidation(
                    open_air_consol.id, wrs[wr_num].id, company
                )
            open_air_consol.refresh_from_db()

            # ── Lockers (client-portal logins) ──────────────────────────────
            locker_specs = [
                ('maria.locker', 'maria'),
                ('sofia.locker', 'sofia'),
            ]
            lockers = []
            for username, client_key in locker_specs:
                c = clients[client_key]
                user = User.objects.create_user(
                    username=username,
                    email=c.email or f'{username}@test.acg',
                    password='test1234',
                    first_name=c.name or '',
                    last_name=c.last_name or '',
                )
                UserProfile.objects.create(
                    user=user,
                    role=UserRole.CLIENT,
                    client=c,
                    is_active=True,
                    must_change_password=False,
                    profile_completed=True,
                    notifications_configured=True,
                )
                lockers.append((username, c.client_code))

        # ── Summary ─────────────────────────────────────────────────────────
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('── Seed complete ─────────────────────────'))
        self.stdout.write(
            f'  Associates      : {len(associates)} ensured '
            f"({', '.join(associates.keys())})"
        )
        self.stdout.write(
            f'  Clients         : {len(clients)} (6 person / 4 company; '
            '3 with partial data: james, techsol, pacific)'
        )
        self.stdout.write(
            f'  WRs             : 24 sources + 2 repack outputs = 26 total'
        )
        self.stdout.write(
            '                    methods: 9 air / 9 sea / 6 ground'
        )
        self.stdout.write(
            '                    agencies: 8 main / 9 Las Palmas / 4 Miami Express / 3 Caracas Courier'
        )
        self.stdout.write(
            '                    ACTIVE sources: 20 (4 became INACTIVE after repacks)'
        )
        self.stdout.write(
            f'  Repacks         : 2 operations'
        )
        self.stdout.write(
            f"                    - Repack A: Maria WR-SEED-01 + WR-SEED-02 "
            f"→ {repack_a['output_wr'].wr_number}"
        )
        self.stdout.write(
            f"                    - Repack B: Sofia WR-SEED-09 + WR-SEED-10 "
            f"→ {repack_b['output_wr'].wr_number}"
        )
        self.stdout.write(
            f'  Consolidations  : 4'
        )
        self.stdout.write(
            f'                    - DRAFT  {draft_consol.reference_code}  '
            '(Caracas Courier, air, 0 items)'
        )
        self.stdout.write(
            f'                    - OPEN   {open_consol.reference_code}  '
            '(Las Palmas, sea, 3 items: WR-SEED-06/07/08)'
        )
        self.stdout.write(
            f'                    - CLOSED {closed_consol.reference_code}  '
            '(Miami Express, ground, 2 items: WR-SEED-12/13)'
        )
        self.stdout.write(
            f'                    - OPEN   {open_air_consol.reference_code}  '
            '(Las Palmas, air, 3 items: WR-SEED-22/23/24 — pricing demo)'
        )
        self.stdout.write(f'  Lockers         : {len(lockers)} portal logins (password: test1234)')
        for uname, ccode in lockers:
            self.stdout.write(f'                    - {uname}  →  {ccode}')
        self.stdout.write('')
        self.stdout.write('Manual-test notes:')
        self.stdout.write(self.style.NOTICE(
            '  Repack-compatible cluster (demo Create Repack here):'
        ))
        self.stdout.write(
            '    WR-SEED-19, WR-SEED-20, WR-SEED-21 — all Global Imports → Carlos Fernandez,'
        )
        self.stdout.write(
            '    main agency, sea, standard, allow_repacking=True, ACTIVE.'
        )
        self.stdout.write(
            '    Pick any 2 or 3 of them in Create Repack to combine into a fresh output.'
        )
        self.stdout.write('')
        self.stdout.write(
            '  Eligible for DRAFT Caracas/air/standard : none seeded '
            '(create one via UI to test add-item).'
        )
        self.stdout.write(
            '  Incompatible examples (should be filtered):'
        )
        self.stdout.write(
            '    - WR-SEED-03 (James, ground/express, main) vs Las Palmas OPEN'
        )
        self.stdout.write(
            '    - WR-SEED-11 (Tech Sol, air/express, Las Palmas) vs Las Palmas OPEN '
            '(wrong method+type)'
        )
        self.stdout.write(
            '    - WR-SEED-15 (Carlos, ground/fragile, Miami) vs Miami CLOSED '
            '(wrong type; also closed)'
        )
        self.stdout.write(self.style.SUCCESS('──────────────────────────────────────────'))
