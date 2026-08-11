from django.db.models import Prefetch
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Album, Media, PlaybackHistory
from .serializers import (
    AlbumListSerializer,
    AlbumSerializer,
    MediaSerializer,
    PlaybackHistorySerializer,
    PlaybackUpdateSerializer,
)


class IsAuthenticated(permissions.IsAuthenticated):
    pass


class AlbumListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AlbumListSerializer

    def get_queryset(self):
        return Album.objects.prefetch_related("media_items")


class AlbumDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AlbumSerializer
    queryset = Album.objects.prefetch_related(
        Prefetch("media_items", queryset=Media.objects.order_by("order", "id"))
    )


class MediaDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MediaSerializer
    queryset = Media.objects.select_related("album")


class MediaNavigationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            media = Media.objects.select_related("album").get(pk=pk)
        except Media.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        siblings = list(
            media.album.media_items.order_by("order", "id").values_list("id", flat=True)
        )
        try:
            index = siblings.index(media.id)
        except ValueError:
            index = -1

        prev_id = siblings[index - 1] if index > 0 else None
        next_id = siblings[index + 1] if index >= 0 and index < len(siblings) - 1 else None

        history = PlaybackHistory.objects.filter(user=request.user, media=media).first()

        return Response(
            {
                "media": MediaSerializer(media).data,
                "prev_id": prev_id,
                "next_id": next_id,
                "position_seconds": history.position_seconds if history else 0,
                "completed": history.completed if history else False,
            }
        )


class PlaybackHistoryListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PlaybackHistorySerializer

    def get_queryset(self):
        return (
            PlaybackHistory.objects.filter(user=self.request.user)
            .select_related("media", "media__album")
            .order_by("-updated_at")
        )


class PlaybackUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PlaybackUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        media = serializer.validated_data["media_id"]
        history, _ = PlaybackHistory.objects.update_or_create(
            user=request.user,
            media=media,
            defaults={
                "position_seconds": serializer.validated_data["position_seconds"],
                "completed": serializer.validated_data["completed"],
            },
        )
        return Response(PlaybackHistorySerializer(history).data)


class ResumePlaybackView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        history = (
            PlaybackHistory.objects.filter(user=request.user, completed=False)
            .select_related("media", "media__album")
            .order_by("-updated_at")
            .first()
        )
        if not history:
            return Response({"detail": "Nothing to resume."}, status=status.HTTP_404_NOT_FOUND)

        return Response(PlaybackHistorySerializer(history).data)
