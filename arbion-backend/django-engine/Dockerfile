# Use official Python image
FROM python:3.11-slim

# Prevent .pyc files + buffer logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies (minimal but required for Django)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (better caching)
COPY requirements.txt /app/

RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy project
COPY . /app/

# Collect static files (optional but common in production)
# RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Run server with gunicorn
CMD ["gunicorn", "app.wsgi:application", "--bind", "0.0.0.0:8000"]