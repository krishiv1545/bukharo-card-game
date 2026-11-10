from django.urls import path
from . import views

urlpatterns = [path("", views.create), path("<str:code>/join/", views.join)]
