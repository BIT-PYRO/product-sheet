from celery.result import AsyncResult
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework.filters import OrderingFilter
from rest_framework.mixins import ListModelMixin
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.viewsets import GenericViewSet
from rest_framework.views import APIView

from common.api import api_success
from common.mixins import StandardizedSuccessResponseMixin
from common.models import DeletionLog
from common.serializers import DeletionLogSerializer
from common.tasks import generate_operations_summary_task, ping_task


class TriggerPingTaskView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		summary='Trigger background ping task',
		tags=['Async Tasks'],
		examples=[
			OpenApiExample(
				'Trigger success response',
				value={
					'success': True,
					'message': 'Background ping task accepted.',
					'data': {'task_id': '<celery-task-id>', 'status': 'PENDING'},
				},
				response_only=True,
			),
		],
	)
	def post(self, request):
		task = ping_task.delay()
		return api_success(
			{'task_id': task.id, 'status': task.status},
			message='Background ping task accepted.',
			status_code=202,
		)


class TriggerOperationsSummaryTaskView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		summary='Trigger operations summary task',
		tags=['Async Tasks'],
		examples=[
			OpenApiExample(
				'Trigger operations summary response',
				value={
					'success': True,
					'message': 'Operations summary task accepted.',
					'data': {'task_id': '<celery-task-id>', 'status': 'PENDING'},
				},
				response_only=True,
			),
		],
	)
	def post(self, request):
		task = generate_operations_summary_task.delay()
		return api_success(
			{'task_id': task.id, 'status': task.status},
			message='Operations summary task accepted.',
			status_code=202,
		)


class TaskStatusView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		summary='Get background task status',
		tags=['Async Tasks'],
		examples=[
			OpenApiExample(
				'Task in progress response',
				value={
					'success': True,
					'message': 'Task status fetched successfully.',
					'data': {'task_id': '<celery-task-id>', 'status': 'PENDING', 'result': None},
				},
				response_only=True,
			),
			OpenApiExample(
				'Task success response',
				value={
					'success': True,
					'message': 'Task status fetched successfully.',
					'data': {'task_id': '<celery-task-id>', 'status': 'SUCCESS', 'result': 'pong'},
				},
				response_only=True,
			),
		],
	)
	def get(self, request, task_id):
		result = AsyncResult(task_id)
		payload = {
			'task_id': task_id,
			'status': result.status,
			'result': result.result if result.successful() else None,
		}
		return api_success(payload, message='Task status fetched successfully.')


@extend_schema(tags=['Deletion Log'])
class DeletionLogViewSet(StandardizedSuccessResponseMixin, ListModelMixin, GenericViewSet):
	"""Read-only endpoint — returns deletion logs, optionally filtered by app_label / model_name."""
	permission_classes = [IsAdminUser]
	serializer_class = DeletionLogSerializer
	queryset = DeletionLog.objects.select_related('deleted_by').all()
	filter_backends = [DjangoFilterBackend, OrderingFilter]
	filterset_fields = ['app_label', 'model_name']
	ordering_fields = ['deleted_at']
	ordering = ['-deleted_at']
