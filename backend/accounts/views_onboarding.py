from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.core.mail import send_mail
from django.conf import settings

from accounts.models import EmailVerificationToken, User
from saas_billing.models import Plan
from core_tenants.services.onboarding_service import TenantOnboardingService
from core_tenants.models import TenantStatus
from industries.models import Industry

class PublicIndustryListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        industries = Industry.objects.all().values('id', 'name', 'code')
        return Response(list(industries), status=status.HTTP_200_OK)

class PublicPlanListView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        plans = Plan.objects.filter(is_public=True, is_active=True).values(
            'id', 'name', 'code', 'description', 'trial_days',
            'is_trial_available', 'requires_payment_method',
            'base_price_monthly', 'base_price_yearly', 'currency'
        )
        return Response(list(plans), status=status.HTTP_200_OK)

class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        company_name = data.get('company_name')
        industry_id = data.get('industry_id')
        plan_id = data.get('plan_id')
        owner_name = data.get('owner_name')
        email = data.get('email')
        password = data.get('password')

        if not all([company_name, industry_id, plan_id, owner_name, email, password]):
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = TenantOnboardingService.onboard(
                company_name=company_name,
                industry_id=industry_id,
                plan_id=plan_id,
                owner_name=owner_name,
                email=email,
                password=password
            )
            
            # Send Verification Email (Simulated for now)
            # In production, use a frontend URL, e.g. https://xyz.miraee.app/verify?token=...
            verify_url = f"http://localhost:3000/verify-email?token={result['token']}"
            print(f"Sending email to {email} with verification link: {verify_url}")
            send_mail(
                subject="Verify Your Email for Miraee",
                message=f"Welcome to Miraee!\n\nPlease verify your email by clicking the link: {verify_url}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )

            return Response({
                "message": "Registration successful. Please verify your email.",
                "tenant_slug": result['tenant'].slug
            }, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = request.data.get('token')
        if not token_str:
            return Response({"error": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)

        import hashlib
        token_hash = hashlib.sha256(token_str.encode()).hexdigest()

        try:
            token_record = EmailVerificationToken.objects.get(token=token_hash)
        except EmailVerificationToken.DoesNotExist:
            return Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)

        if not token_record.is_valid():
            return Response({"error": "Token expired or already used."}, status=status.HTTP_400_BAD_REQUEST)

        user = token_record.user
        
        # Mark user verified
        user.is_email_verified = True
        user.is_active = True
        user.save()

        # Mark token used
        token_record.used = True
        token_record.save()

        # Update Tenant Status
        tenant = user.tenant
        if tenant and tenant.status == TenantStatus.PENDING_VERIFICATION:
            # If trial is available, go to active trial, else wait for payment phase 8
            # In current logic, plan.is_trial_available determines if subscription was created as TRIALING
            tenant.status = TenantStatus.ACTIVE_TRIAL
            tenant.save()

            print(f"Sending Trial Started email to {user.email}")
            send_mail(
                subject="Your Miraee Trial has Started!",
                message=f"Hello {user.first_name},\n\nYour Miraee workspace is ready. Enjoy your trial!",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )

        return Response({"message": "Email verified successfully."}, status=status.HTTP_200_OK)

class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"message": "If this email is registered, a verification link has been sent."}, status=status.HTTP_200_OK)

        if user.is_email_verified:
            return Response({"error": "Email is already verified."}, status=status.HTTP_400_BAD_REQUEST)

        token_instance, raw_token = EmailVerificationToken.generate_token(user)
        
        verify_url = f"http://localhost:3000/verify-email?token={raw_token}"
        print(f"Resending email to {email} with verification link: {verify_url}")
        send_mail(
            subject="Verify Your Email for Miraee",
            message=f"Welcome to Miraee!\n\nPlease verify your email by clicking the link: {verify_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )

        return Response({"message": "If this email is registered, a verification link has been sent."}, status=status.HTTP_200_OK)
