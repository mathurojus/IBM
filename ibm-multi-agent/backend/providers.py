import openai
import anthropic
from google import genai


async def call_llm(
    provider: str, model: str, api_key: str, system: str, user_message: str
) -> str:
    """Call an LLM provider and return the response text."""
    if provider == "openai":
        client = openai.AsyncOpenAI(api_key=api_key)
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_message},
            ],
        )
        return resp.choices[0].message.content

    if provider == "anthropic":
        client = anthropic.AsyncAnthropic(api_key=api_key)
        resp = await client.messages.create(
            model=model,
            max_tokens=4096,
            system=system,
            messages=[{"role": "user", "content": user_message}],
        )
        return resp.content[0].text

    # ponytail: groq is openai-compatible, just different base_url
    if provider == "groq":
        client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_message},
            ],
        )
        return resp.choices[0].message.content

    if provider == "gemini":
        client = genai.Client(api_key=api_key)
        resp = await client.aio.models.generate_content(
            model=model,
            contents=user_message,
            config=genai.types.GenerateContentConfig(system_instruction=system),
        )
        return resp.text

    raise ValueError(f"Unknown provider: {provider}")
