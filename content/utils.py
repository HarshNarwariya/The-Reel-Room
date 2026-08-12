from urllib.error import URLError
from urllib.request import urlopen

from django.conf import settings


def build_file_url(file_id: str | None) -> str | None:
    if not file_id:
        return None
    base = settings.STREAMER_BASE_URL.rstrip("/")
    return f"{base}/file/{file_id}"


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
