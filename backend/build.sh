#!/usr/bin/env bash
set -e

echo "==> Verificando configuracion Django..."
python manage.py check --deploy 2>&1 || python manage.py check 2>&1

echo "==> Aplicando migraciones..."
python manage.py migrate --no-input 2>&1

echo "==> Recolectando estáticos..."
python manage.py collectstatic --no-input 2>&1

echo "==> Iniciando servidor..."
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 2 \
  --threads 2 \
  --timeout 120 \
  --log-level info
