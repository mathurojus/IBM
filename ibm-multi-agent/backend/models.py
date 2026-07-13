from pydantic import BaseModel


class RunRequest(BaseModel):
    product: str
    provider: str | None = None
    model: str | None = None


class AgentConfigUpdate(BaseModel):
    system_prompt: str


class ProviderConfigUpdate(BaseModel):
    api_key: str
    model: str | None = None
