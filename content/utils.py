from urllib.error import URLError
from urllib.request import urlopen

from django.conf import settings

from .permissions import can_direct_drive_preview

PREVIEW_MODE_PROXY = "proxy"
PREVIEW_MODE_DRIVE = "drive"


def build_file_url(file_id: str | None) -> str | None:
    if not file_id:
        return None
    base = settings.STREAMER_BASE_URL.rstrip("/")
    return f"{base}/file/{file_id}"


def build_drive_download_url(file_id: str | None) -> str | None:
    if not file_id:
        return None
    return (
        "https://drive.usercontent.google.com/download"
        f"?id={file_id}&export=download&authuser=0"
    )


def build_drive_thumbnail_url(file_id: str | None) -> str | None:
    """Direct Drive image URL for <img> tags (avoids ORB on the download endpoint)."""
    if not file_id:
        return None
    return f"https://drive.google.com/thumbnail?id={file_id}&sz=w1024"


def build_drive_preview_url(file_id: str | None) -> str | None:
    if not file_id:
        return None
    return f"https://drive.google.com/file/d/{file_id}/preview"


def get_user_preview_mode(user) -> str:
    if not user.is_authenticated:
        return PREVIEW_MODE_PROXY
    profile = getattr(user, "profile", None)
    if profile:
        return profile.preview_mode
    return PREVIEW_MODE_PROXY


def user_uses_drive_preview(user) -> bool:
    return (
        can_direct_drive_preview(user)
        and get_user_preview_mode(user) == PREVIEW_MODE_DRIVE
    )


def resolve_thumbnail_url(file_id: str | None, user) -> str | None:
    if not file_id:
        return None
    if user_uses_drive_preview(user):
        return build_drive_thumbnail_url(file_id)
    return build_file_url(file_id)


def resolve_album_thumbnail_url(album, user) -> str | None:
    return resolve_thumbnail_url(album.thumbnail_id, user)


def resolve_media_thumbnail_url(media, user) -> str | None:
    file_id = media.thumbnail_id
    if not file_id and media.media_type == media.MediaType.IMAGE and media.file_id:
        file_id = media.file_id
    return resolve_thumbnail_url(file_id, user)


def resolve_media_preview_url(media, user) -> str | None:
    if user_uses_drive_preview(user) and media.file_id:
        return build_drive_preview_url(media.file_id)
    return build_file_url(media.file_id)


def fetch_text_file(file_id: str | None) -> str | None:
    url = build_file_url(file_id)
    if not url:
        return None
    try:
        with urlopen(url, timeout=10) as resp:
            charset = resp.headers.get_content_charset() or "utf-8"
            return resp.read().decode(charset, errors="replace")
    except (URLError, OSError, ValueError):
        return None


def media_text_body(media) -> str:
    if media.text_content and media.text_content.strip():
        return media.text_content
    if media.media_type == media.MediaType.TEXT and media.file_id:
        return fetch_text_file(media.file_id) or ""
    return ""
