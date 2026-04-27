# app/ai/agent/agents.py — ajan kayıt defteri
# yeni bir ajan eklemek için sadece bu dosyayı düzenlemek yeterli

from dataclasses import dataclass

from langgraph.graph.state import CompiledStateGraph
from pydantic import BaseModel, Field

from ai.agent.document_agent import document_agent
from ai.agent.summarizer_agent import summarizer_agent


# bilinmeyen agent_id gelirse bu kullanılır
DEFAULT_AGENT = "dokuman-asistani"


class AgentInfo(BaseModel):
    """GET /chat/agents endpoint'inin döndürdüğü ajan bilgisi."""

    key: str = Field(description="Ajan anahtarı.")
    description: str = Field(description="Ajanın açıklaması.")


@dataclass
class Agent:
    description: str
    graph: CompiledStateGraph


# agent_id → Agent eşlemesi — frontend dropdown ile bu anahtarları kullanıyor
agents: dict[str, Agent] = {
    "dokuman-asistani": Agent(
        description="Yüklenen dokümanlar üzerinde soru-cevap yapan akıllı asistan.",
        graph=document_agent,
    ),
    "ozetleme-asistani": Agent(
        description="Dokümanları yapılandırılmış şekilde özetleyen uzman ajan.",
        graph=summarizer_agent,
    ),
}


def get_agent(agent_id: str) -> CompiledStateGraph:
    """Verilen ID'ye göre ajan grafiğini döndürür.
    Geçersiz ID gelirse sessizce default ajana düşüyor — frontend hata almasın diye."""
    if agent_id not in agents:
        agent_id = DEFAULT_AGENT
    return agents[agent_id].graph


def get_all_agent_info() -> list[AgentInfo]:
    return [
        AgentInfo(key=agent_id, description=agent.description)
        for agent_id, agent in agents.items()
    ]
