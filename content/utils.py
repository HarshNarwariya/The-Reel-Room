from django.conf import settings


def build_file_url(file_id: str | None) -> str | None:
    if not file_id:
        return None
    base = settings.STREAMER_BASE_URL.rstrip("/")
    return f"{base}/file/{file_id}"
