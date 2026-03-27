import httpx
import asyncio

async def test_login():
    async with httpx.AsyncClient() as client:
        try:
            # Test login with mock senior credentials
            data = {"username": "senior", "password": "password123"}
            res = await client.post("http://localhost:8000/token", data=data, timeout=10.0)
            print(f"Login Status: {res.status_code}")
            print(f"Login Response: {res.text}")
            
            if res.status_code == 200:
                token = res.json()["access_token"]
                # Test users/me
                res_me = await client.get("http://localhost:8000/users/me", headers={"Authorization": f"Bearer {token}"})
                print(f"Users/Me Status: {res_me.status_code}")
                print(f"Users/Me Response: {res_me.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_login())
