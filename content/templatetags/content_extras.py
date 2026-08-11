from django import template

register = template.Library()


@register.filter
def format_duration(seconds):
    if seconds is None:
        return "—:—"
    sec = int(seconds)
    h = sec // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


@register.filter
def type_label(media_type):
    labels = {
        "video": "VID",
        "audio": "AUD",
        "image": "IMG",
        "text": "TXT",
    }
    return labels.get(media_type, media_type.upper()[:3])


@register.filter
def type_stamp_class(media_type):
    classes = {
        "video": "stamp-video",
        "audio": "stamp-audio",
        "image": "stamp-image",
        "text": "stamp-text",
    }
    return classes.get(media_type, "stamp-image")


@register.filter
def counter_label(item):
    if item.media_type == "image":
        return "single frame"
    if item.media_type == "text":
        return "text entry"
    return format_duration(item.duration_seconds)


@register.filter
def progress_percent(record):
    if not record.media.duration_seconds:
        return 0
    return min(
        100,
        int(record.position_seconds / record.media.duration_seconds * 100),
    )


@register.simple_tag(takes_context=True)
def pagination_url(context, page_number, page_param="page"):
    request = context.get("request")
    if not request:
        return "?"
    params = request.GET.copy()
    params[page_param] = page_number
    query = params.urlencode()
    return f"?{query}" if query else "?"


@register.filter
def page_row_index(counter, page_obj):
    start = (page_obj.number - 1) * page_obj.paginator.per_page
    return start + counter

