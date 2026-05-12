# Backend (FastAPI) Dockerfile
FROM python:3.12-slim

# Работаем в /app
WORKDIR /app

# Системные зависимости
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Ограничение параллельной сборки для снижения потребления памяти
ENV MAKEFLAGS="-j2"
ENV CMAKE_BUILD_PARALLEL_LEVEL=2

# Кэшируем зависимости
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir --prefer-binary -r requirements.txt

# Копируем приложение
COPY . .
RUN mkdir -p /app/storage /app/models

# Порт для uvicorn
EXPOSE 8000

# Запуск
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
