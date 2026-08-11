from django.conf import settings
from django.db import models

from .utils import build_file_url


class Album(models.Model):
    title = models.CharField(max_length=255)
    thumbnail_id = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def thumbnail_url(self):
        return build_file_url(self.thumbnail_id)


class Media(models.Model):
    class MediaType(models.TextChoices):
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"
        IMAGE = "image", "Image"
        TEXT = "text", "Text"

    album = models.ForeignKey(
        Album,
        on_delete=models.CASCADE,
        related_name="media_items",
    )
    title = models.CharField(max_length=255)
    media_type = models.CharField(max_length=10, choices=MediaType.choices)
    file_id = models.CharField(max_length=255, blank=True)
    thumbnail_id = models.CharField(max_length=255, blank=True)
    text_content = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name_plural = "media"

    def __str__(self):
        return f"{self.title} ({self.media_type})"

    @property
    def file_url(self):
        return build_file_url(self.file_id)

    @property
    def thumbnail_url(self):
        if self.thumbnail_id:
            return build_file_url(self.thumbnail_id)
        if self.media_type == self.MediaType.IMAGE and self.file_id:
            return build_file_url(self.file_id)
        return None


class PlaybackHistory(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="playback_history",
    )
    media = models.ForeignKey(
        Media,
        on_delete=models.CASCADE,
        related_name="playback_records",
    )
    position_seconds = models.FloatField(default=0)
    completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name_plural = "playback history"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "media"],
                name="unique_user_media_history",
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.media.title}"
