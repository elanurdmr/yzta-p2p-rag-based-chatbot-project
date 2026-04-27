# app/ai/rag/chromaClient.py — ChromaDB ve embedding bağlantısı
# Bu modül import edildiği anda bağlantı açılıyor, dikkat.
# Yani test yazarken bu dosyayı import eden her şey gerçek DB'ye bağlanır.

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

from core.config import settings

# anonymized_telemetry=False — ChromaDB varsayılan olarak kullanım verisi gönderiyor, bunu kapatıyoruz
client = chromadb.PersistentClient(
    path=settings.CHROMA_PATH,
    settings=ChromaSettings(anonymized_telemetry=False),
)

# embedding modeli her chunk için API çağrısı yapıyor — bu yüzden yükleme yavaş olabiliyor
embeddings = GoogleGenerativeAIEmbeddings(
    model=settings.EMBEDDING_MODEL,
    google_api_key=settings.GOOGLE_API_KEY,
)

# collection_name="documents" — tüm oturumların belgeleri burada, thread_id ile izole ediliyor
document_vector_store = Chroma(
    collection_name="documents",
    persist_directory=settings.CHROMA_PATH,
    embedding_function=embeddings,
    client=client,
    create_collection_if_not_exists=True,
)
