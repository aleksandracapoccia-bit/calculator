from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Section, RecruitRate
from .serializers import SectionSerializer, RecruitRateSerializer


class CalculatorStructureView(APIView):
    def get(self, request):
        sections = (
            Section.objects
            .prefetch_related(
                "modules__attributes__options",
                "modules__attributes__multiply_with",
            )
            .order_by("order")
        )
        recruit_rates = RecruitRate.objects.all()
        return Response({
            "sections": SectionSerializer(sections, many=True).data,
            "recruit_rates": RecruitRateSerializer(recruit_rates, many=True).data,
        })
