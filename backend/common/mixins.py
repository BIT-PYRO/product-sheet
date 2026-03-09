from rest_framework.response import Response


class StandardizedSuccessResponseMixin:
    action_messages = {
        "list": "Records fetched successfully.",
        "retrieve": "Record fetched successfully.",
        "create": "Record created successfully.",
        "update": "Record updated successfully.",
        "partial_update": "Record updated successfully.",
        "destroy": "Record deleted successfully.",
    }

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)

        if not isinstance(response, Response):
            return response

        if not (200 <= response.status_code < 300):
            return response

        if isinstance(response.data, dict) and "success" in response.data:
            return response

        message = self.action_messages.get(getattr(self, "action", None), "Request completed successfully.")
        response.data = {
            "success": True,
            "message": message,
            "data": response.data,
        }
        return response
