from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
import json

from .models import Album, Media, PlaybackHistory
from .utils import media_text_body
from .pagination import (
    PAGE_SIZE_ALBUMS,
    PAGE_SIZE_HISTORY,
    PAGE_SIZE_MEDIA,
    PAGE_SIZE_RESUME,
    paginate,
)


def _media_queryset():
    return Media.objects.select_related("album").order_by("album__title", "order", "id")


def _album_media_counts(media_items):
    return {
        "all": len(media_items),
        "video": sum(1 for m in media_items if m.media_type == "video"),
        "audio": sum(1 for m in media_items if m.media_type == "audio"),
        "image": sum(1 for m in media_items if m.media_type == "image"),
        "text": sum(1 for m in media_items if m.media_type == "text"),
    }


@login_required
def home(request):
    albums_qs = Album.objects.prefetch_related("media_items").order_by("-created_at")
    albums_page = paginate(request, albums_qs, PAGE_SIZE_ALBUMS, "album_page")

    history_qs = PlaybackHistory.objects.filter(user=request.user).select_related(
        "media", "media__album"
    )
    hero_record = history_qs.order_by("-updated_at").first()

    resume_qs = history_qs.filter(completed=False).order_by("-updated_at")
    if hero_record:
        resume_qs = resume_qs.exclude(pk=hero_record.pk)
    resume_page = paginate(request, resume_qs, PAGE_SIZE_RESUME, "resume_page")

    featured_media = None
    if not hero_record:
        featured_media = (
            Media.objects.select_related("album").order_by("-created_at").first()
        )

    return render(
        request,
        "content/home.html",
        {
            "albums_page": albums_page,
            "hero_record": hero_record,
            "resume_page": resume_page,
            "featured_media": featured_media,
            "album_total": albums_qs.count(),
        },
    )


@login_required
def album_detail(request, pk):
    album = get_object_or_404(Album, pk=pk)
    media_type = request.GET.get("type", "all")
    all_media = list(Media.objects.filter(album=album).order_by("order", "id"))
    media_counts = _album_media_counts(all_media)

    filtered_media = Media.objects.filter(album=album).order_by("order", "id")
    if media_type in {"video", "audio", "image", "text"}:
        filtered_media = filtered_media.filter(media_type=media_type)
    media_page = paginate(request, filtered_media, PAGE_SIZE_MEDIA)

    album_ids = list(
        Album.objects.order_by("-created_at").values_list("id", flat=True)
    )
    album_index = album_ids.index(album.id) + 1 if album.id in album_ids else 1

    return render(
        request,
        "content/album_detail.html",
        {
            "album": album,
            "album_index": album_index,
            "media_counts": media_counts,
            "media_page": media_page,
            "active_type": media_type,
        },
    )


@login_required
def player(request, pk):
    media = get_object_or_404(
        Media.objects.select_related("album"),
        pk=pk,
    )
    siblings = list(
        media.album.media_items.order_by("order", "id").values_list("id", flat=True)
    )
    index = siblings.index(media.id) if media.id in siblings else -1
    prev_media = (
        Media.objects.filter(pk=siblings[index - 1]).first() if index > 0 else None
    )
    next_media = (
        Media.objects.filter(pk=siblings[index + 1]).first()
        if index >= 0 and index < len(siblings) - 1
        else None
    )
    history = PlaybackHistory.objects.filter(user=request.user, media=media).first()
    resume_seconds = 0
    if history and not history.completed and history.position_seconds >= 5:
        resume_seconds = int(history.position_seconds)
    episode_index = index + 1 if index >= 0 else 1
    episode_total = len(siblings)
    text_body = media_text_body(media) if media.media_type == Media.MediaType.TEXT else ""
    return render(
        request,
        "content/player.html",
        {
            "media": media,
            "prev_media": prev_media,
            "next_media": next_media,
            "resume_seconds": resume_seconds,
            "completed": history.completed if history else False,
            "episode_index": episode_index,
            "episode_total": episode_total,
            "sibling_ids_json": json.dumps(siblings),
            "text_body": text_body,
        },
    )


@login_required
def search_view(request):
    query = request.GET.get("q", "").strip()
    albums_page = None
    media_page = None
    result_count = 0

    if query:
        albums_qs = Album.objects.filter(
            Q(title__icontains=query) | Q(description__icontains=query)
        ).prefetch_related("media_items").order_by("-created_at")
        media_qs = (
            Media.objects.select_related("album")
            .filter(
                Q(title__icontains=query)
                | Q(text_content__icontains=query)
                | Q(album__title__icontains=query)
            )
            .order_by("album__title", "order", "id")
        )
        albums_page = paginate(request, albums_qs, PAGE_SIZE_ALBUMS, "album_page")
        media_page = paginate(request, media_qs, PAGE_SIZE_MEDIA, "media_page")
        result_count = albums_qs.count() + media_qs.count()

    return render(
        request,
        "content/search.html",
        {
            "query": query,
            "albums_page": albums_page,
            "media_page": media_page,
            "result_count": result_count,
        },
    )


@login_required
def browse_view(request):
    media_type = request.GET.get("type", "all")
    media_items = _media_queryset()
    if media_type in {"video", "audio", "image", "text"}:
        media_items = media_items.filter(media_type=media_type)
    media_page = paginate(request, media_items, PAGE_SIZE_MEDIA)
    media_counts = Media.objects.aggregate(
        all=Count("id"),
        video=Count("id", filter=Q(media_type="video")),
        audio=Count("id", filter=Q(media_type="audio")),
        image=Count("id", filter=Q(media_type="image")),
        text=Count("id", filter=Q(media_type="text")),
    )
    return render(
        request,
        "content/browse.html",
        {
            "media_page": media_page,
            "active_type": media_type,
            "media_counts": media_counts,
        },
    )


@login_required
def archive_view(request):
    albums_qs = Album.objects.prefetch_related("media_items").order_by("-created_at")
    recent_qs = Media.objects.select_related("album").order_by("-created_at")
    albums_page = paginate(request, albums_qs, PAGE_SIZE_ALBUMS, "album_page")
    recent_page = paginate(request, recent_qs, PAGE_SIZE_MEDIA, "recent_page")

    media_counts = Media.objects.aggregate(
        total=Count("id"),
        video=Count("id", filter=Q(media_type="video")),
        audio=Count("id", filter=Q(media_type="audio")),
        image=Count("id", filter=Q(media_type="image")),
        text=Count("id", filter=Q(media_type="text")),
    )
    watched = PlaybackHistory.objects.filter(user=request.user).count()
    completed = PlaybackHistory.objects.filter(user=request.user, completed=True).count()
    in_progress = PlaybackHistory.objects.filter(user=request.user, completed=False).count()
    total = media_counts["total"] or 0
    # Pre-compute SVG ring chart offset (circumference of r=46 circle ≈ 289.03)
    _circ = 289.03
    ring_offset = round(_circ - (_circ * completed / watched), 2) if watched else _circ
    user_stats = {
        "watched": watched,
        "completed": completed,
        "in_progress": in_progress,
        "not_started": max(0, total - watched),
        "ring_offset": ring_offset,
    }
    return render(
        request,
        "content/archive.html",
        {
            "albums_page": albums_page,
            "recent_page": recent_page,
            "album_total": albums_qs.count(),
            "media_counts": media_counts,
            "user_stats": user_stats,
        },
    )


@login_required
def history_view(request):
    history_qs = (
        PlaybackHistory.objects.filter(user=request.user)
        .select_related("media", "media__album")
        .order_by("-updated_at")
    )
    history_page = paginate(request, history_qs, PAGE_SIZE_HISTORY)
    return render(
        request,
        "content/history.html",
        {"history_page": history_page},
    )


def login_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    form = AuthenticationForm(request, data=request.POST or None)
    if request.method == "POST" and form.is_valid():
        user = form.get_user()
        login(request, user)
        next_url = request.GET.get("next", "home")
        return redirect(next_url)

    return render(request, "content/login.html", {"form": form})


@login_required
def about_view(request):
    albums_qs = Album.objects.prefetch_related("media_items").order_by("-created_at")
    media_counts = Media.objects.aggregate(
        total=Count("id"),
        video=Count("id", filter=Q(media_type="video")),
        audio=Count("id", filter=Q(media_type="audio")),
        image=Count("id", filter=Q(media_type="image")),
        text=Count("id", filter=Q(media_type="text")),
    )
    user_stats = {
        "watched": PlaybackHistory.objects.filter(user=request.user).count(),
        "completed": PlaybackHistory.objects.filter(
            user=request.user, completed=True
        ).count(),
        "in_progress": PlaybackHistory.objects.filter(
            user=request.user, completed=False
        ).count(),
    }
    # Collect up to 12 spotlight albums with thumbnails for the about hero mosaic
    spotlight_albums = list(
        albums_qs.filter(thumbnail_id__isnull=False).exclude(thumbnail_id="")[:12]
    )
    return render(
        request,
        "content/about.html",
        {
            "album_total": albums_qs.count(),
            "media_counts": media_counts,
            "user_stats": user_stats,
            "spotlight_albums": spotlight_albums,
            "all_albums": albums_qs[:24],
        },
    )


def logout_view(request):
    logout(request)
    messages.info(request, "You have been logged out.")
    return redirect("login")
