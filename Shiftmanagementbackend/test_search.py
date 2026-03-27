import httpx
import asyncio
import json

async def test_search():
    # Attempt to search for something in the mock data
    async with httpx.AsyncClient() as client:
        # Note: We need a token, but for a quick check we can see if it even responds
        try:
            res = await client.post("http://localhost:8000/search", json={"query": "pump"}, timeout=5.0)
            print(f"Status Code: {res.status_code}")
            print(f"Response: {res.json()}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_search())
