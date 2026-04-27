"""
app/ai/tools/document_tools.py — LangGraph ajanının kullandığı araçlar.
search_documents: semantik arama + kaynak bilgisi
list_documents: yüklü dosya listesi
"""

import json

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from ai.rag.chromaClient import document_vector_store
from core.config import settings


def _get_thread_id(config: RunnableConfig | None) -> str:
    """Agent config'inden thread_id'yi güvenle çıkarır.
    Config gelmezse boş string döner — filtre uygulanmaz, tüm belgeler aranır."""
    if not config:
        return ""
    return config.get("configurable", {}).get("thread_id", "")


@tool
async def search_documents(query: str, config: RunnableConfig) -> str:
    """
    Bu sohbet oturumuna yüklenen dokümanları semantik olarak sorgular.
    Sonuçları kaynak bilgisiyle (dosya adı, sayfa, benzerlik skoru) döndürür.
    """
    thread_id = _get_thread_id(config)
    # thread_id varsa sadece o oturumun belgelerini ara
    filter_dict = {"thread_id": thread_id} if thread_id else None

    results = document_vector_store.similarity_search_with_relevance_scores(
        query, k=settings.RAG_K, filter=filter_dict
    )

    # RAG_SCORE_THRESHOLD altındaki sonuçlar genellikle alakasız — filtreliyoruz
    # bu değeri config'den ayarlayabilirsiniz, 0.3 çoğu durumda iyi çalışıyor
    results = [(doc, score) for doc, score in results if score >= settings.RAG_SCORE_THRESHOLD]

    if not results:
        msg = (
            "Bu oturuma henüz doküman yüklenmemiş veya soruyla eşleşen içerik bulunamadı."
            if thread_id
            else "İlgili bir içerik bulunamadı."
        )
        return json.dumps({"found": False, "message": msg, "sources": []})

    chunks = []
    sources = []
    for i, (doc, score) in enumerate(results):
        source = doc.metadata.get("source", "Bilinmeyen kaynak")
        page = doc.metadata.get("page")
        # sayfa numarasını 0-index'ten 1-index'e çeviriyoruz — kullanıcı için daha anlamlı
        page_label = f" — Sayfa {int(page) + 1}" if page is not None else ""
        label = f"[Kaynak {i + 1}: {source}{page_label}]"

        chunks.append(f"{label}\n{doc.page_content}")
        sources.append({
            "index": i + 1,
            "file": source,
            "page": int(page) + 1 if page is not None else None,
            "score": round(float(score), 3),
            # önizleme için 120 karakter yeterli, newline'ları temizle
            "preview": doc.page_content[:120].replace("\n", " "),
        })

    return json.dumps(
        {
            "found": True,
            "content": "\n\n---\n\n".join(chunks),
            "sources": sources,
        },
        ensure_ascii=False,
    )


@tool
async def list_documents(config: RunnableConfig) -> str:
    """
    Bu sohbet oturumuna yüklenmiş tüm benzersiz dosya isimlerini listeler.
    Özetleme ajanı önce bunu çağırarak hangi dosyaların var olduğunu öğreniyor.
    """
    thread_id = _get_thread_id(config)

    try:
        # _collection iç API — langchain-chroma bunu değiştirirse kırılabilir
        # ama şimdilik başka yolu yok, LangChain'in standart API'sı bu sorguyu desteklemiyor
        collection = document_vector_store._collection
        if thread_id:
            results = collection.get(
                where={"thread_id": thread_id},
                include=["metadatas"],
            )
        else:
            results = collection.get(include=["metadatas"])

        files = sorted({m.get("source", "?") for m in results["metadatas"] if m})
        if not files:
            return (
                "Bu oturumda henüz hiç doküman yüklenmemiş."
                if thread_id
                else "Henüz hiç doküman yüklenmemiş."
            )
        return "Yüklü dokümanlar:\n" + "\n".join(f"• {f}" for f in files)
    except Exception as exc:
        return f"Doküman listesi alınamadı: {exc}"
