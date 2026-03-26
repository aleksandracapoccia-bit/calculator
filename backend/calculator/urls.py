from django.urls import path
from .views import CalculatorStructureView

urlpatterns = [
    path("structure/", CalculatorStructureView.as_view(), name="calculator-structure"),
]
