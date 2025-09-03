
# # Create your views here.
# from rest_framework.decorators import api_view
# from rest_framework.response import Response
# from rest_framework import status
# from .models import User
# from .serializers import UserSerializer


# @api_view(['POST'])
# def login_user(request):
#     email = request.data.get('email')
#     password = request.data.get('password')
#     try:
#         user = User.objects.get(email=email, password=password)
#         print("user logged in")
#         return Response({"success": True}, status=status.HTTP_200_OK)
#     except User.DoesNotExist:
#         return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)
# from django.shortcuts import render


# @api_view(['POST'])
# def register_user(request):
#     serializer = UserSerializer(data=request.data)
#     if serializer.is_valid():
#         serializer.save()
#         print("user created")
#         return Response({"message": "User registered successfully!"}, status=status.HTTP_201_CREATED)
#     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import User
from .serializers import UserSerializer
from django.contrib.auth.hashers import check_password

@api_view(['POST'])
def login_user(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get the user instance by email
        user = User.objects.get(email=email)
        
        # Verify the plain-text password against the hashed password
        if user.check_password(password):
            print("user logged in successfully")
            return Response({"success": True}, status=status.HTTP_200_OK)
        else:
            # This handles incorrect passwords
            return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)
            
    except User.DoesNotExist:
        # This handles non-existent users
        return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
def register_user(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        print("user created successfully")
        return Response({"message": "User registered successfully!"}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)