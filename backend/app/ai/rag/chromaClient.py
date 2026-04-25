"""
ChromaDB istemcisi — Google Generative AI Embeddings ile.
"""

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

from core.config import settings

client = chromadb.PersistentClient(
    path=settings.CHROMA_PATH,
    settings=ChromaSettings(anonymized_telemetry=False),
)

embeddings = GoogleGenerativeAIEmbeddings(
    model=settings.EMBEDDING_MODEL,
    google_api_key=settings.GOOGLE_API_KEY,
)

document_vector_store = Chroma(
    collection_name="documents",
    persist_directory=settings.CHROMA_PATH,
    embedding_function=embeddings,
    client=client,
    create_collection_if_not_exists=True,
)
