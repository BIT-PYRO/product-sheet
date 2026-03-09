from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def api_success(data=None, message="Request completed successfully.", status_code=status.HTTP_200_OK):
    return Response(
        {
            "success": True,
            "message": message,
            "data": data,
        },
        status=status_code,
    )


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return response

    detail = response.data
    response.data = {
        "success": False,
        "error": {
            "code": "validation_error" if response.status_code < 500 else "server_error",
            "message": "Request could not be completed.",
            "details": detail,
        },
    }
    return response
