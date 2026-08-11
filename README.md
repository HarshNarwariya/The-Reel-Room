# Hyakutake CMS

A professional media content management system built with Django and DRF, featuring a modern Netflix-inspired UI.

## Features

- **Album Management** - Organize media into collections
- **Multi-format Support** - Video, Audio, Image, and Text content
- **Portrait Thumbnails** - 800x1024 aspect ratio (portrait)
- **Playback History** - Track progress and resume watching
- **Modern UI** - Professional dark theme with smooth animations
- **Navigation** - Previous/Next episode navigation
- **REST API** - Full DRF API for integration

## Tech Stack

- Django 5.2
- Django REST Framework 3.18
- SQLite Database
- Vanilla JavaScript
- Modern CSS (Grid, Flexbox, Gradients)

## Installation

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
STREAMER_BASE_URL=https://streamer-drv-content.onrender.com
```

## Usage

1. **Admin Panel** (`/admin/`)
   - Create albums with title, thumbnail_id, description
   - Add media items with file_id, thumbnail_id, order

2. **Web Interface** (`/`)
   - Browse collections
   - Watch/Play content
   - Resume from last position
   - View watch history

3. **API Endpoints** (`/api/`)
   - `GET /api/albums/` - List all albums
   - `GET /api/albums/{id}/` - Album with media items
   - `GET /api/media/{id}/` - Media details
   - `GET /api/media/{id}/navigation/` - Prev/Next + position
   - `POST /api/history/update/` - Save playback progress
   - `GET /api/history/` - Watch history
   - `GET /api/history/resume/` - Last unfinished media

## Media Types

### Video
- `file_id` - Video file identifier
- `thumbnail_id` - Poster/thumbnail image

### Audio
- `file_id` - Audio file identifier
- `thumbnail_id` - Cover art (optional)

### Image
- `file_id` - Image file (used as thumbnail too)

### Text
- `text_content` - Text to display

## File URL Format

All files are accessed via the streamer base URL:
```
{STREAMER_BASE_URL}/file/{file_id}
```

Example: `https://streamer-drv-content.onrender.com/file/187rpV2aKnusaO9c0oLhN25MlM40hM-t3`

## Design Features

- **Portrait Cards** - 800:1024 aspect ratio for thumbnails
- **Hover Effects** - Scale, overlay, smooth transitions
- **Gradient Accents** - Blue theme with cyan accents
- **Responsive** - Mobile, tablet, desktop breakpoints
- **Dark Theme** - Professional streaming platform aesthetic
- **Typography** - Rubik font family from Google Fonts
- **Icons** - Inline SVG icons for sharp display

## Project Structure

```
cms/
├── config/           # Django settings & URLs
├── content/          # Main app
│   ├── models.py     # Album, Media, PlaybackHistory
│   ├── views.py      # DRF API views
│   ├── web_views.py  # Web interface views
│   ├── serializers.py
│   ├── admin.py
│   ├── urls.py       # API routes
│   └── web_urls.py   # Web routes
├── templates/
│   ├── base.html
│   └── content/      # Home, player, history, login
├── static/
│   ├── css/style.css
│   └── js/player.js  # Playback tracking
└── manage.py
```

## API Authentication

Session authentication is used. Login via the web interface at `/login/` first.

## Development

```powershell
# Check for issues
python manage.py check

# Create migrations after model changes
python manage.py makemigrations

# Run tests (when added)
python manage.py test
```

## Production Notes

- Set `DEBUG=False`
- Use a strong `SECRET_KEY`
- Configure `ALLOWED_HOSTS`
- Use PostgreSQL instead of SQLite
- Set up static file serving
- Enable HTTPS
- Configure proper authentication
