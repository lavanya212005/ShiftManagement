import httpx
import asyncio

async def test_create_log():
    async with httpx.AsyncClient() as client:
        try:
            # First login to get a token
            login_data = {"username": "senior", "password": "password123"}
            login_res = await client.post("http://localhost:8000/token", data=login_data, timeout=5.0)
            if login_res.status_code != 200:
                print(f"Login failed: {login_res.text}")
                return
            
            token = login_res.json()["access_token"]
            
            # Now test create log
            log_data = {
                "transcript": "Checking the pressure sensor on Boiler 2. It's reading 5% high.",
                "audio_url": "/static/audio/test.webm"
            }
            headers = {"Authorization": f"Bearer {token}"}
            res = await client.post("http://localhost:8000/logs", json=log_data, headers=headers, timeout=10.0)
            print(f"Status Code: {res.status_code}")
            print(f"Response: {res.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_create_log())
