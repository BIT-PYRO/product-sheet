from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import UserRole

User = get_user_model()

API_USERNAME = 'external_api_user'
API_EMAIL = 'external-api@product-sheet.internal'
API_PASSWORD = 'ExternalSync@2026!'
API_ROLE = UserRole.STAFF


class Command(BaseCommand):
    help = 'Creates a dedicated read/write API user for the external software sync.'

    def handle(self, *args, **options):
        if User.objects.filter(username=API_USERNAME).exists():
            self.stdout.write(self.style.WARNING(
                f'User "{API_USERNAME}" already exists. No changes made.'
            ))
            return

        user = User.objects.create_user(
            username=API_USERNAME,
            email=API_EMAIL,
            password=API_PASSWORD,
            role=API_ROLE,
            is_staff=False,
            is_superuser=False,
        )

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ API user created successfully!\n'
            f'   Username : {user.username}\n'
            f'   Email    : {user.email}\n'
            f'   Password : {API_PASSWORD}\n'
            f'   Role     : {user.role}\n'
            f'\n⚠️  Share only these credentials with the external software.\n'
            f'   They will use POST /api/v1/auth/login/ to get a JWT token.\n'
        ))
