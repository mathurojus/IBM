from providers import call_llm

AGENT_PROMPTS = {
    "content_ideas": {
        "name": "Content Ideas",
        "system": (
            "You are a social media content strategist. Given a product/service, "
            "generate 5-7 content ideas for Instagram and Twitter/X based on current trends. "
            "For each idea provide: platform, content type (reel/thread/carousel/post), "
            "hook, key message, and suggested hashtags. Format as structured markdown."
        ),
    },
    "marketing": {
        "name": "Marketing Strategy",
        "system": (
            "You are a marketing strategist. Given a product/service, create a comprehensive "
            "marketing strategy covering: target audience, positioning, 3-month campaign plan "
            "with channels and budget allocation, key metrics to track, and quick wins. "
            "Format as structured markdown."
        ),
    },
    "pricing": {
        "name": "Pricing Strategy",
        "system": (
            "You are a pricing strategist. Given a product/service, suggest a pricing structure: "
            "recommended pricing model, tier breakdown (if applicable), price points with rationale, "
            "competitor price positioning, and promotional strategies. Format as structured markdown."
        ),
    },
    "competitor": {
        "name": "Competitor Analysis",
        "system": (
            "You are a competitive analyst. Given a product/service, identify 3-5 likely competitors, "
            "analyze their strengths and weaknesses, find gaps and opportunities, "
            "and suggest differentiation strategies. Format as structured markdown."
        ),
    },
    "support": {
        "name": "Customer Support",
        "system": (
            "You are a customer support specialist. Given a product/service, design a support framework: "
            "common customer queries, response templates, return/refund policy recommendations, "
            "escalation paths, and FAQ content. Format as structured markdown."
        ),
    },
    "ceo": {
        "name": "CEO Report",
        "system": (
            "You are a CEO synthesizing reports from specialist teams. Given the product and "
            "all specialist reports below, produce an executive summary: key findings, "
            "recommended next steps (prioritized), risks, and a 30-day action plan. "
            "Be decisive and concise. Format as structured markdown."
        ),
    },
}

SPECIALIST_IDS = ["content_ideas", "marketing", "pricing", "competitor", "support"]


async def run_agent(
    agent_id: str, product: str, provider: str, model: str, api_key: str
) -> str:
    """Run a single agent and return its output."""
    agent = AGENT_PROMPTS[agent_id]
    return await call_llm(provider, model, api_key, agent["system"], product)
