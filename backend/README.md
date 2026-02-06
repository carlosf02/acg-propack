# AGC ProPack – Backend

This folder contains the backend for the AGC ProPack senior project.
The backend is built with Django and Django REST Framework and provides a REST API for inventory tracking, product movement, and reporting.

## Tech Stack

- **Python 3**
- **Django**
- **Django REST Framework**
- **SQLite** (local development)

## How to Run the Backend

1. **Go to the backend folder**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Apply migrations**
   ```bash
   python manage.py migrate
   ```

5. **Start the server**
   ```bash
   python manage.py runserver
   ```

## Backend Info

The backend runs at:
[http://127.0.0.1:8000/](http://127.0.0.1:8000/)

### Health Check

To verify the backend is working:
[http://127.0.0.1:8000/api/health/](http://127.0.0.1:8000/api/health/)

Expected response:
```json
{ "status": "ok" }
```

## Backend Scope (Proposal)

- Inventory management
- Product movement tracking
- Data access for reports and dashboards
- REST API for frontend integration

## Notes

- `db.sqlite3` and `.venv` are not committed.
- Each developer sets up their own environment using `requirements.txt`.
