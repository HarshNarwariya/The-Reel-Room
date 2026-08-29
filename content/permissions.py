"""Custom permission codenames for the content app."""

PERM_DIRECT_DRIVE_PREVIEW = "content.direct_drive_preview"


def can_direct_drive_preview(user) -> bool:
    return bool(
        user and user.is_authenticated and user.has_perm(PERM_DIRECT_DRIVE_PREVIEW)
    )
