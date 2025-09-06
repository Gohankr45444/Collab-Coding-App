#status/views.py
from django.shortcuts import render
from django.http import JsonResponse

def health_check(request):
    """
    A very lightweight endpoint to check if the server is running.
    Does not hit the database or require auth.
    """
    return JsonResponse({"status": "ok", "message": "Django backend is awake."})