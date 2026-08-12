from django.urls import path

from . import web_views

urlpatterns = [
    path("", web_views.home, name="home"),
    path("browse/", web_views.browse_view, name="browse"),
    path("search/", web_views.search_view, name="search"),
    path("archive/", web_views.archive_view, name="archive"),
    path("album/<int:pk>/", web_views.album_detail, name="album-detail"),
    path("play/<int:pk>/", web_views.player, name="player"),
    path("history/", web_views.history_view, name="history"),
    path("about/", web_views.about_view, name="about"),
    path("login/", web_views.login_view, name="login"),
    path("logout/", web_views.logout_view, name="logout"),
]
