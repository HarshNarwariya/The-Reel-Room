from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def grant_drive_preview_to_staff(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Permission = apps.get_model("auth", "Permission")
    Group = apps.get_model("auth", "Group")
    ContentType = apps.get_model("contenttypes", "ContentType")

    content_type = ContentType.objects.get(app_label="content", model="media")
    permission, _ = Permission.objects.get_or_create(
        codename="direct_drive_preview",
        content_type=content_type,
        defaults={"name": "Can use direct Google Drive preview"},
    )

    admin_group, _ = Group.objects.get_or_create(name="Admin")
    admin_group.permissions.add(permission)

    for user in User.objects.filter(is_staff=True):
        user.user_permissions.add(permission)
        admin_group.user_set.add(user)


def create_profiles_for_existing_users(apps, schema_editor):
    User = apps.get_model("auth", "User")
    UserProfile = apps.get_model("content", "UserProfile")
    for user in User.objects.all():
        UserProfile.objects.get_or_create(user=user)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("content", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "preview_mode",
                    models.CharField(
                        choices=[
                            ("proxy", "Proxy (Streamer)"),
                            ("drive", "Direct Drive"),
                        ],
                        default="proxy",
                        max_length=10,
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "user profile",
                "verbose_name_plural": "user profiles",
            },
        ),
        migrations.AlterModelOptions(
            name="media",
            options={
                "ordering": ["order", "id"],
                "permissions": [
                    ("direct_drive_preview", "Can use direct Google Drive preview"),
                ],
                "verbose_name_plural": "media",
            },
        ),
        migrations.RunPython(
            grant_drive_preview_to_staff,
            migrations.RunPython.noop,
        ),
        migrations.RunPython(
            create_profiles_for_existing_users,
            migrations.RunPython.noop,
        ),
    ]
