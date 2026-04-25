FROM python:3.13-slim

WORKDIR /app

# uv — hızlı Python paket yöneticisi
RUN pip install --no-cache-dir uv

# Bağımlılık dosyasını kopyala (cache katmanı için önce)
COPY pyproject.toml ./

# Bağımlılıkları kur — --no-dev: geliştirme araçları hariç
# Lock dosyası yoksa otomatik oluşturulur
RUN uv sync --no-dev

# Uygulama kodunu kopyala
COPY app/ ./app/

# ChromaDB kalıcı depolama klasörünü oluştur
RUN mkdir -p app/resource/chroma_db

WORKDIR /app/app

EXPOSE 8000

CMD ["uv", "run", "--project", "/app", "uvicorn", "main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--log-level", "info"]
