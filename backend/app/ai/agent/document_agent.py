"""
Doküman Ajanı — Yüklenen dokümanlar üzerinde soru-cevap ve analiz yapar.
"""

from datetime import datetime
from typing import Literal

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.runnables import RunnableConfig, RunnableLambda, RunnableSerializable
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode

from ai.llm import get_model, settings
from ai.tools.document_tools import search_documents, list_documents


DOCUMENT_AGENT_INSTRUCTIONS = """
Sen "Kendi Dokümanların ile Sohbet Et" platformunun akıllı doküman asistanısın.

Görevlerin:
- Kullanıcıların yüklediği dokümanlar üzerinden doğru, kaynak destekli yanıtlar üret.
- Her yanıtta hangi dokümandan hangi bilgiyi aldığını açıkça belirt.
- Bilgi tabanında bulamadığın konular için "Bu konuda yüklü dokümanlarımda bilgi bulamadım." de; asla bilgi uydurma.
- Yanıtları Türkçe ver, net ve anlaşılır bir dil kullan.
- Doküman içeriğini özetlerken yapılandırılmış biçim (başlıklar, maddeler) kullan.

Araçların:
- search_documents: Semantik arama ile ilgili bölümleri getir.
- list_documents: Yüklü dokümanların listesini göster.

Mevcut tarih: {current_date}
"""


class DocumentAgentState(MessagesState):
    """Doküman ajanı durum sınıfı."""


tools = [search_documents, list_documents]


def _build_model(model: BaseChatModel) -> RunnableSerializable[DocumentAgentState, AIMessage]:
    bound = model.bind_tools(tools)
    preprocessor = RunnableLambda(
        lambda state: [
            SystemMessage(
                content=DOCUMENT_AGENT_INSTRUCTIONS.format(
                    current_date=datetime.now().strftime("%d %B %Y, %H:%M")
                )
            )
        ]
        + state["messages"],
        name="DocumentStateModifier",
    )
    return preprocessor | bound


async def _call_model(state: DocumentAgentState, config: RunnableConfig) -> DocumentAgentState:
    model = get_model(config["configurable"].get("model", settings.DEFAULT_MODEL))
    chain = _build_model(model)
    response = await chain.ainvoke(state, config)
    return {"messages": [response]}


def _route(state: DocumentAgentState) -> Literal["tools", "done"]:
    last = state["messages"][-1]
    if not isinstance(last, AIMessage):
        raise TypeError(f"AIMessage beklendi, gelen: {type(last)}")
    return "tools" if last.tool_calls else "done"


graph = StateGraph(DocumentAgentState)
graph.add_node("model", _call_model)
graph.add_node("tools", ToolNode(tools=tools))
graph.set_entry_point("model")
graph.add_edge("tools", "model")
graph.add_conditional_edges("model", _route, {"tools": "tools", "done": END})

document_agent = graph.compile(checkpointer=MemorySaver())
document_agent.name = "document_agent"
