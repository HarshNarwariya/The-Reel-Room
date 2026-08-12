from rest_framework import serializers

from .models import Album, Media, PlaybackHistory
from .utils import resolve_album_thumbnail_url, resolve_media_thumbnail_url


class MediaSerializer(serializers.ModelSerializer):
    file_url = serializers.ReadOnlyField()
    thumbnail_url = serializers.SerializerMethodField()
    album_title = serializers.CharField(source="album.title", read_only=True)

    class Meta:
        model = Media
        fields = [
            "id",
            "album",
            "album_title",
            "title",
            "media_type",
            "file_id",
            "file_url",
            "thumbnail_id",
            "thumbnail_url",
            "text_content",
            "order",
            "duration_seconds",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_thumbnail_url(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        return resolve_media_thumbnail_url(obj, user)


class MediaListSerializer(serializers.ModelSerializer):
    file_url = serializers.ReadOnlyField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Media
        fields = [
            "id",
            "title",
            "media_type",
            "file_url",
            "thumbnail_url",
            "order",
            "duration_seconds",
        ]

    def get_thumbnail_url(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        return resolve_media_thumbnail_url(obj, user)


class AlbumSerializer(serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField()
    media_items = MediaListSerializer(many=True, read_only=True)
    media_count = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = [
            "id",
            "title",
            "thumbnail_id",
            "thumbnail_url",
            "description",
            "media_count",
            "media_items",
            "created_at",
        ]

    def get_thumbnail_url(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        return resolve_album_thumbnail_url(obj, user)

    def get_media_count(self, obj):
        return obj.media_items.count()


class AlbumListSerializer(serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField()
    media_count = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = [
            "id",
            "title",
            "thumbnail_url",
            "description",
            "media_count",
            "created_at",
        ]

    def get_thumbnail_url(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        return resolve_album_thumbnail_url(obj, user)

    def get_media_count(self, obj):
        return obj.media_items.count()


class PlaybackHistorySerializer(serializers.ModelSerializer):
    media = MediaListSerializer(read_only=True)
    media_id = serializers.PrimaryKeyRelatedField(
        queryset=Media.objects.all(),
        source="media",
        write_only=True,
    )

    class Meta:
        model = PlaybackHistory
        fields = [
            "id",
            "media",
            "media_id",
            "position_seconds",
            "completed",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class PlaybackUpdateSerializer(serializers.Serializer):
    media_id = serializers.PrimaryKeyRelatedField(queryset=Media.objects.all())
    position_seconds = serializers.FloatField(min_value=0, default=0)
    completed = serializers.BooleanField(default=False)
