from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import Album, Media, PlaybackHistory, UserProfile


class MediaInline(admin.TabularInline):
    model = Media
    extra = 1
    fields = (
        "title",
        "media_type",
        "file_id",
        "thumbnail_id",
        "text_content",
        "order",
        "duration_seconds",
    )


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ("title", "thumbnail_id", "created_at")
    search_fields = ("title",)
    inlines = [MediaInline]


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = ("title", "album", "media_type", "order", "file_id")
    list_filter = ("media_type", "album")
    search_fields = ("title", "file_id")
    ordering = ("album", "order")


@admin.register(PlaybackHistory)
class PlaybackHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "media", "position_seconds", "completed", "updated_at")
    list_filter = ("completed",)
    search_fields = ("user__username", "media__title")


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    fk_name = "user"
    fields = ("preview_mode",)
    verbose_name = "Playback settings"
    verbose_name_plural = "Playback settings"


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "preview_mode")
    list_filter = ("preview_mode",)
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)
