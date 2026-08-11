from django.core.management.base import BaseCommand
from django.db import transaction

from content.models import Album, Media

ALBUM_TITLE = "Doraemon Season 6"
THUMBNAIL_ID = "1PTTpgeI4fsiCyogfpmV6LfcOpnduRnfl"

DESCRIPTION = (
    "Get ready for more timeless fun, laughter, and life lessons in the sixth season "
    "of the globally acclaimed anime series, Doraemon!The adventures continue as "
    "Doraemon, the cosmic robotic cat sent from the 22nd century, tries his best to "
    "keep his young, underachieving companion Nobita Nobi out of trouble. Equipped "
    "with his iconic 4D four-dimensional pocket, Doraemon introduces a spectacular "
    "new batch of futuristic gadgets designed to solve Nobita's homework problems, "
    "boost his confidence, and impress his friends Shizuka, Takeshi (Gian), and Suneo. "
    "However, whether they are using the Anywhere Door to travel to exotic landscapes "
    "or testing out mind-bending gadgets, Nobita's short-sighted schemes usually lead "
    "to hilarious, unexpected consequences.Perfect for viewers of all ages, Season 6 "
    "beautifully blends imaginative sci-fi concepts with touching stories about "
    "friendship, responsibility, and growing up."
)

EPISODES = [
    {"title": "Doraemon 6x1", "file_id": "1jcte5Y9LYNjCK8rMWNTCjkISYB0sIYqy", "duration_seconds": 1406.304},
    {"title": "Doraemon 6x2", "file_id": "1QuXWXo3axBlFNLNMF1GEw_eCFFew54UW", "duration_seconds": 1229.528},
    {"title": "Doraemon 6x3", "file_id": "1MiSFJfrb96d-hJgTGl2BslLgIDOwKBGd", "duration_seconds": 1382.547},
    {"title": "Doraemon 6x4", "file_id": "1bsPElSv2hjL-1sXSSJEAZAs7oiYQ0TLs", "duration_seconds": 1371.203},
    {"title": "Doraemon 6x5", "file_id": "1WsCM_rl8dLs1cqizaOvETPdoq6iDRwwv", "duration_seconds": 1378.443},
    {"title": "Doraemon 6x6", "file_id": "15raC9w7zZWZeDhEhQb1P6krc1Mf5PaJu", "duration_seconds": 1402.968},
    {"title": "Doraemon 6x7", "file_id": "1nbsMkWWWv-SZJ2qcl43I4Y-qwli-aM-u", "duration_seconds": 1387.853},
    {"title": "Doraemon 6x8", "file_id": "1U6B-aZRsLmyliwf6bwIoSplQaX1nQOmh", "duration_seconds": 1356.354},
    {"title": "Doraemon 6x9", "file_id": "1ZXQpWdb3UxJddOQR258G7kgAr_AkQ1ms", "duration_seconds": 1368.433},
    {"title": "Doraemon 6x10", "file_id": "1ieQL4NbiUPT6UVoJsGSa-1gzSvZXpICS", "duration_seconds": 1323.689},
    {"title": "Doraemon 6x11", "file_id": "1Jaq0LD7YiA2ctO9SlQ2H11ZHV5fhm9QY", "duration_seconds": 1399.931},
    {"title": "Doraemon 6x12", "file_id": "1EW1nt9kYzP4bU_sLpTluSDOi7m_O-34f", "duration_seconds": 1388.754},
    {"title": "Doraemon 6x13", "file_id": "1xktx7uHGrszwKpnQzWQnEuVYoqpExFWJ", "duration_seconds": 1351.917},
    {"title": "Doraemon 6x14", "file_id": "1-YYw-AdneDDLmVzHM63fSlVRq0pnVcXr", "duration_seconds": 1333.932},
    {"title": "Doraemon 6x15", "file_id": "1Z79PLCtwSINqjUil6cHK4EybbgVFj2B1", "duration_seconds": 1402.634},
    {"title": "Doraemon 6x16", "file_id": "1i9uUcBhBs_tmfwmrLQODVl1XwPUd3zZh", "duration_seconds": 1376.374},
    {"title": "Doraemon 6x17", "file_id": "1udgrVRjPMG_c-Ot0lOJmSdhsHCrnFgeE", "duration_seconds": 1293.158},
    {"title": "Doraemon 6x18", "file_id": "1_YqyyKrp-qC75p4hSPfWSdJtShz8mwja", "duration_seconds": 1141.707},
    {"title": "Doraemon 6x19", "file_id": "190sOC8xBVXhFLzgTtxUyoybTh1QTu1QD", "duration_seconds": 1373.905},
    {"title": "Doraemon 6x20", "file_id": "1Yh6FBRZvfVH8i5eMKeRo6Lk39KeQWrp0", "duration_seconds": 1390.789},
    {"title": "Doraemon 6x21", "file_id": "1RHSCqWxuKG3UEt5AU9-6zmSusmwJ9U81", "duration_seconds": 361.127},
    {"title": "Doraemon 6x22", "file_id": "1JAMxbLde03DxlO5d-g69ZKnz8FgZ7q6h", "duration_seconds": 1383.715},
    {"title": "Doraemon 6x23", "file_id": "1s7hJbL5Uv08mw-W5aVFZ-NoUc_XtBl3i", "duration_seconds": 1388.72},
    {"title": "Doraemon 6x24", "file_id": "1pyHSWrUBNz_2SF-AgRAloyZj6UrSwtRM", "duration_seconds": 1387.953},
    {"title": "Doraemon 6x25", "file_id": "1OsoPEEEjaTJ7kFso7_O1LwEQBNcOmGer", "duration_seconds": 1372.971},
    {"title": "Doraemon 6x26", "file_id": "1FjKO64U2N0BL9-xVXVSuneKnz4lV0sfH", "duration_seconds": 1397.896},
    {"title": "Doraemon 6x27", "file_id": "1GyqvJVLNF5tANy-KMPweuU_beLbtbDh6", "duration_seconds": 1397.529},
    {"title": "Doraemon 6x28", "file_id": "1J4wNjgFDniFc2URzxfvbsd5JtDbFTWsW", "duration_seconds": 1289.388},
    {"title": "Doraemon 6x29", "file_id": "18gk_dDAMRHFdlyR4NVrqQ1atCbvYN9ao", "duration_seconds": 1395.393},
    {"title": "Doraemon 6x30", "file_id": "1N3uxxfU2nNMjjJIRvz-ExTbLfyKRdJX3", "duration_seconds": 1362.561},
    {"title": "Doraemon 6x31", "file_id": "1eluwozhNOxrJ7Mt45DRADNIH0XjIAXzz", "duration_seconds": 1321.386},
    {"title": "Doraemon 6x32", "file_id": "1j_EVQkLYBwVoI1Ud_NE-IMxTD7P-0THy", "duration_seconds": 844.843},
    {"title": "Doraemon 6x33", "file_id": "1U1JQ3f-DX2NQymn4F8V6c7FdhWs1Z8gY", "duration_seconds": 1401.6},
    {"title": "Doraemon 6x34", "file_id": "1BcdXPJeUUBIlwGG6tAQaKWoTersQP8hp", "duration_seconds": 1368.066},
    {"title": "Doraemon 6x35", "file_id": "1jm-wlq8-s9xz1l1EzOuz8JVScxixyjFQ", "duration_seconds": 1389.287},
    {"title": "Doraemon 6x36", "file_id": "1xxKRkbDCJK3-iWIyneA1bqQReSRPQjUS", "duration_seconds": 1385.05},
    {"title": "Doraemon 6x37", "file_id": "1peTRkEVJTwu_3KHKw6v4GcjIKjo1-Bbm", "duration_seconds": 1397.729},
    {"title": "Doraemon 6x38", "file_id": "1zbQIazGphqhWSelVo8237zXf_C6WPHTM", "duration_seconds": 1342.674},
    {"title": "Doraemon 6x39", "file_id": "1LVHIpmjVYXRPxR6fxu7D77St3vbIOZCU", "duration_seconds": 1355.353},
    {"title": "Doraemon 6x40", "file_id": "1_bxYBmu0JYZizkVip7GwfYOpGH8W_zeo", "duration_seconds": 1363.128},
    {"title": "Doraemon 6x41", "file_id": "1GYqhmjw1JZ0DW-wZ1vyAoP3YaMlztBRz", "duration_seconds": 1399.131},
    {"title": "Doraemon 6x42", "file_id": "1-WiVzyEnb3uyzImzruAxrh0hmRzc7P8o", "duration_seconds": 1388.453},
    {"title": "Doraemon 6x43", "file_id": "1MZNj4kE3T7azQ73t2m7g_2y0jD1dtIDq", "duration_seconds": 1344.209},
    {"title": "Doraemon 6x44", "file_id": "1QqYwAouA6UkmsHlZ9Fjo48-IMULo75vP", "duration_seconds": 1286.284},
    {"title": "Doraemon 6x45", "file_id": "1Vm3XvILku4nlUHxjWYI6ca3afYCU29cR", "duration_seconds": 1403.969},
    {"title": "Doraemon 6x46", "file_id": "1q-oeDdivJc1_ha1aUzJ0lG-vIxwdJ50d", "duration_seconds": 1378.844},
    {"title": "Doraemon 6x47", "file_id": "10pn32HZdIneddLSK4_8iGQI5cCfsuFqR", "duration_seconds": 1403.869},
    {"title": "Doraemon 6x48", "file_id": "1mUUhyrAvOwPNW5Q_e4HzFSLcSnTy0vir", "duration_seconds": 1353.685},
    {"title": "Doraemon 6x49", "file_id": "1wOGNKY_MEQ0c_w3t9GrEqReLgtaocfUx", "duration_seconds": 1317.149},
    {"title": "Doraemon 6x50", "file_id": "1-MFITrMRCLCQZeohn1ZJElWQgnDlpt7D", "duration_seconds": 1392.157},
    {"title": "Doraemon 6x51", "file_id": "1gDrufZ67SpBqteIX2Cnf1bwqPcOGhKeX", "duration_seconds": 1371.069},
    {"title": "Doraemon 6x52", "file_id": "1L_13AgwhP9z1M_FKhPONhSRJsLqN9HAG", "duration_seconds": 1380.433},
]


class Command(BaseCommand):
    help = "Seed Doraemon Season 6 album and all 52 video episodes into db.sqlite3."

    def add_arguments(self, parser):
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Delete existing Doraemon Season 6 album (and its media) before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["replace"]:
            deleted, _ = Album.objects.filter(title=ALBUM_TITLE).delete()
            if deleted:
                self.stdout.write(self.style.WARNING(f"Removed existing '{ALBUM_TITLE}' album."))

        album, album_created = Album.objects.update_or_create(
            title=ALBUM_TITLE,
            defaults={
                "description": DESCRIPTION,
                "thumbnail_id": THUMBNAIL_ID,
            },
        )

        created_count = 0
        updated_count = 0
        episode_titles = {ep["title"] for ep in EPISODES}

        for index, episode in enumerate(EPISODES, start=1):
            _, created = Media.objects.update_or_create(
                album=album,
                title=episode["title"],
                defaults={
                    "media_type": Media.MediaType.VIDEO,
                    "file_id": episode["file_id"],
                    "thumbnail_id": THUMBNAIL_ID,
                    "order": index,
                    "duration_seconds": round(episode["duration_seconds"]),
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        stale = album.media_items.exclude(title__in=episode_titles)
        removed_count = stale.count()
        stale.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Album '{album.title}' (id={album.id}) "
                f"{'created' if album_created else 'updated'}."
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Episodes: {created_count} created, {updated_count} updated, "
                f"{removed_count} removed. Total: {album.media_items.count()}."
            )
        )
