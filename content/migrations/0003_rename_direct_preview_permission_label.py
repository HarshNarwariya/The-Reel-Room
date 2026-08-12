from django.db import migrations


def rename_direct_preview_permission(apps, schema_editor):
    Permission = apps.get_model("auth", "Permission")
    Permission.objects.filter(
        codename="direct_drive_preview",
        content_type__app_label="content",
    ).update(name="Can use direct preview")


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0002_userprofile_drive_preview_permission"),
    ]

    operations = [
        migrations.RunPython(
            rename_direct_preview_permission,
            migrations.RunPython.noop,
        ),
    ]
