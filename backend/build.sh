#!/usr/bin/env bash
set -e

echo "==> Aplicando migraciones..."
python manage.py migrate --no-input

echo "==> Recolectando estáticos..."
python manage.py collectstatic --no-input

echo "==> Iniciando servidor..."
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 2 \
  --threads 2 \
  --timeout 120 \
  --log-level info
