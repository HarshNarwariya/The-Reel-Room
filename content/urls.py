from django.urls import path

from . import views

app_name = "api"

urlpatterns = [
    path("albums/", views.AlbumListView.as_view(), name="album-list"),
    path("albums/<int:pk>/", views.AlbumDetailView.as_view(), name="album-detail"),
    path("media/<int:pk>/", views.MediaDetailView.as_view(), name="media-detail"),
    path(
        "media/<int:pk>/navigation/",
        views.MediaNavigationView.as_view(),
        name="media-navigation",
    ),
    path("history/", views.PlaybackHistoryListView.as_view(), name="history-list"),
    path("history/update/", views.PlaybackUpdateView.as_view(), name="history-update"),
    path("history/resume/", views.ResumePlaybackView.as_view(), name="history-resume"),
]
