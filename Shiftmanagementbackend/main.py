import os
import uuid
import json
import httpx
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext
from neo4j import AsyncGraphDatabase
from dotenv import load_dotenv

# --- CONFIGURATION & ENV ---
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
NEO4J_DATABASE = "neo4j"
SECRET_KEY = os.getenv("SECRET_KEY", "industrial_grade_secret_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# --- MODELS ---
class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    name: Optional[str] = None
    role: str

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    role: str

class LogIngest(BaseModel):
    transcript: str
    audio_url: str

class SearchRequest(BaseModel):
    query: str

# --- CORE SERVICES ---
app = FastAPI(title="ShiftSync Industrial Backend", version="4.5.0")

# High-Performance Auth (PBKDF2 1000 rounds)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], pbkdf2_sha256__rounds=1000) 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Audio Storage
AUDIO_UPLOAD_DIR = "audio_uploads"
if not os.path.exists(AUDIO_UPLOAD_DIR): os.makedirs(AUDIO_UPLOAD_DIR)
app.mount("/static/audio", StaticFiles(directory=AUDIO_UPLOAD_DIR), name="audio")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- ASYNC NEO4J SETUP ---
USE_NEO4J = False
driver = None

async def init_neo4j():
    global driver, USE_NEO4J
    try:
        driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        await driver.verify_connectivity()
        USE_NEO4J = True
        print("⚡ System: Async Neo4j Connected (Production Stability).")
    except Exception as e:
        print(f"⚠️ System: Neo4j Offline (Using Mock). Error: {e}")
        USE_NEO4J = False

# --- MOCK DATA ---
MOCK_DB_USERS = [
    {"username": "admin", "password": "password123", "name": "Admin", "role": "admin"},
    {"username": "senior", "password": "password123", "name": "Senior Tech", "role": "senior"},
    {"username": "junior", "password": "password123", "name": "Junior Tech", "role": "junior"},
]
# Industrial Sample Dataset (PMP/CNC/HVAC) with Root Cause Insights
MOCK_DB_LOGS = [
    {
        "id": "PMP-001", "title": "Pump 3 Cavitation", 
        "transcript": "Pump 3 sounds like marbles. Check suction line for blockage.", 
        "machine": "Centrifugal Pump P3", "issue": "Cavitation", 
        "root_cause": "Intake strainer 80% blocked by debris.",
        "resolution": "Flush intake strainer and verify NPSH flow.", 
        "confidence": 0.98, "audio_url": None, "timestamp": "2026-03-26T14:45:00"
    },
    {
        "id": "HVAC-004", "title": "Cooling Tower VFD Trip", 
        "transcript": "VFD on Cooling Tower 4 is tripping during high-load shifts.", 
        "machine": "Cooling Tower 4", "issue": "VFD Fault", 
        "root_cause": "Heat dissipation failure in the control cabinet cooling fan.",
        "resolution": "Replace cabinet filters and check fan motor continuity.", 
        "confidence": 0.99, "audio_url": None, "timestamp": "2026-03-26T15:20:00"
    },
    {
        "id": "CNC-009", "title": "Spindle Axis Deviation", 
        "transcript": "CNC-9 spindle is drifting 0.5mm on the Y-axis after 2 hours of runtime.", 
        "machine": "CNC-9 Lathe", "issue": "Axis Drift", 
        "root_cause": "Thermal expansion of the lead screw due to lubrication failure.",
        "resolution": "Reset zero-point; purge lubrication lines; check pump pressure.", 
        "confidence": 1.0, "audio_url": None, "timestamp": "2026-03-26T16:10:00"
    },
    {
        "id": "MOCK-HYD-04", "title": "Hydraulic Press 4 Pressure Drop", 
        "transcript": "He inspected the hydraulic assembly, press 4, found a slight pressure drop and replaced the O-ring.", 
        "machine": "Hydraulic Assembly / Press 4", "issue": "Pressure Drop", 
        "root_cause": "O-ring seal fatigue",
        "resolution": "Inspected hydraulic assembly; replaced O-ring in Press 4; pressure restored.", 
        "confidence": 0.99, "audio_url": None, "timestamp": "2026-03-27T10:00:00"
    }
]

# --- UTILITIES ---
def get_password_hash(p): return pwd_context.hash(p)
def verify_password(p, h): return pwd_context.verify(p, h)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        u_name: str = payload.get("sub")
        if u_name is None: raise HTTPException(401)
    except Exception: raise HTTPException(401)

    if USE_NEO4J:
        async with driver.session(database=NEO4J_DATABASE) as session:
            res = await session.run("MATCH (u:Technician {username: $u}) RETURN u", u=u_name)
            rec = await res.single()
            if rec:
                node = rec["u"]
                return User(username=node["username"], name=node.get("name"), role=node["role"])
    
    user = next((u for u in MOCK_DB_USERS if u["username"] == u_name), None)
    if user: return User(username=user["username"], name=user.get("name"), role=user["role"])
    raise HTTPException(401)

# --- LIFECYCLE ---
@app.on_event("startup")
async def startup_event():
    await init_neo4j()
    for u in MOCK_DB_USERS:
        if not u["password"].startswith("$pbkdf2"): u["password"] = get_password_hash(u["password"])
    
    if USE_NEO4J:
        async with driver.session(database=NEO4J_DATABASE) as session:
            try:
                await session.run("CREATE CONSTRAINT technician_id IF NOT EXISTS FOR (t:Technician) REQUIRE t.username IS UNIQUE")
                for u in MOCK_DB_USERS:
                    await session.run("MERGE (t:Technician {username: $u}) SET t.password=$p, t.name=$n, t.role=$r", 
                                     u=u["username"], p=u["password"], n=u["name"], r=u["role"])
            except: pass

# --- FIXED ASYNC ENDPOINTS ---

@app.post("/register")
async def register(user: UserCreate):
    hashed = get_password_hash(user.password)
    if USE_NEO4J:
        async with driver.session(database=NEO4J_DATABASE) as session:
            res = await session.run("MATCH (u:Technician {username: $u}) RETURN u", u=user.username)
            if await res.single(): raise HTTPException(400, "User exists")
            await session.run("CREATE (u:Technician {username: $u, password: $p, name: $n, role: $r})",
                             u=user.username, p=hashed, n=user.name, r=user.role)
    else:
        if any(u["username"] == user.username for u in MOCK_DB_USERS): raise HTTPException(400, "User exists")
        MOCK_DB_USERS.append({"username": user.username, "password": hashed, "name": user.name, "role": user.role})
    return {"status": "registered"}

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    u_pw = None
    if USE_NEO4J:
        async with driver.session(database=NEO4J_DATABASE) as session:
            res = await session.run("MATCH (u:Technician {username: $u}) RETURN u.password as p", u=form_data.username)
            rec = await res.single()
            if rec: u_pw = rec["p"]
    else:
        u = next((u for u in MOCK_DB_USERS if u["username"] == form_data.username), None)
        if u: u_pw = u["password"]

    if not u_pw or not verify_password(form_data.password, u_pw):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = jwt.encode({"sub": form_data.username, "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/logs")
async def get_logs(current_user: User = Depends(get_current_user)):
    if USE_NEO4J:
        async with driver.session(database=NEO4J_DATABASE) as session:
            res = await session.run("MATCH (l:Log) RETURN l ORDER BY l.timestamp DESC LIMIT 20")
            data = await res.data()
            return [r["l"] for r in data]
    return MOCK_DB_LOGS

@app.post("/logs")
async def create_log(log: LogIngest, current_user: User = Depends(get_current_user)):
    entities = {"title": "Insight", "machine": "Gen", "part": "N/A", "issue": "Check", "resolution": "Normal"}
    if OPENAI_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post("https://api.openai.com/v1/chat/completions", headers={"Authorization": f"Bearer {OPENAI_API_KEY}"}, json={
                    "model": "gpt-4o-mini", "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": "You are an industrial expert. Extract: title, machine, part, issue, resolution, root_cause, confidence. Confidence must be between 98% and 100% for clear instructions."}, 
                        {"role": "user", "content": log.transcript}
                    ]
                }, timeout=10.0)
                entities = json.loads(res.json()["choices"][0]["message"]["content"])
                # Ensure fields exist for the database merge
                entities.setdefault("root_cause", "Analysis pending")
                entities.setdefault("confidence", 0.98)
                entities.setdefault("part", "N/A")
        except: pass

    log_id = str(uuid.uuid4())
    try:
        saved_to_neo4j = False
        if USE_NEO4J:
            try:
                async with driver.session(database=NEO4J_DATABASE) as session:
                    await asyncio.wait_for(session.run("""
                        MATCH (u:Technician {username: $username})
                        MERGE (m:Machine {name: $machine}) MERGE (p:Part {name: $part})
                        MERGE (s:Symptom {description: $issue}) MERGE (r:Resolution {steps: $resolution})
                        CREATE (l:Log {
                            id: $id, title: $title, transcript: $transcript, audio_url: $audio_url, 
                            timestamp: datetime(), machine: $machine, issue: $issue, 
                            root_cause: $root_cause, confidence: $confidence
                        })
                        MERGE (u)-[:LOGGED]->(l) MERGE (l)-[:INVOLVES_MACHINE]->(m) MERGE (l)-[:INVOLVES_PART]->(p)
                        MERGE (l)-[:REPORTS_SYMPTOM]->(s) MERGE (l)-[:RESOLVED_BY]->(r)
                    """, {**entities, "username": current_user.username, "id": log_id, "transcript": log.transcript, "audio_url": log.audio_url}), timeout=8.0)
                    saved_to_neo4j = True
            except Exception as e:
                print(f"⚠️ Neo4j Save Failed, falling back to mock: {e}")

        if not saved_to_neo4j:
            MOCK_DB_LOGS.insert(0, {**entities, "id": log_id, "transcript": log.transcript, "audio_url": log.audio_url, "timestamp": datetime.now().isoformat()})
        
        return {"status": "success", "entities": entities, "saved_to_graph": saved_to_neo4j}
    except Exception as e:
        print(f"❌ Critical Error in create_log: {e}")
        raise HTTPException(500, detail=f"Internal Server Error: {str(e)}")

@app.post("/search")
async def search(search: SearchRequest, current_user: User = Depends(get_current_user)):
    try:
        q = search.query.strip().lower()
        match = None
        
        # 🧪 Smart Query Analysis
        query_parts = q.split()
        is_natural_language = len(query_parts) > 3 or any(word in q for word in ["problem", "found", "error", "broken", "issue", "help"])
        
        extracted_q = {"machine": None, "issue": None}
        if is_natural_language and OPENAI_API_KEY:
            try:
                # Use smaller model or cheaper prompt for search extraction
                search_res = await httpx.AsyncClient().post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {"role": "system", "content": "Extract 'machine' and 'issue' from this industrial query. Return JSON only."},
                            {"role": "user", "content": f"Query: {q}"}
                        ],
                        "response_format": {"type": "json_object"}
                    },
                    timeout=5.0
                )
                if search_res.status_code == 200:
                    extracted_q = json.loads(search_res.json()["choices"][0]["message"]["content"])
                    print(f"🤖 Smart Search NLP: {extracted_q}")
            except: pass

        # 🟢 PHASE 1: Try High-Fidelity Neo4j Search
        if USE_NEO4J:
            try:
                async with driver.session(database=NEO4J_DATABASE) as session:
                    # Smart matching using NLP entities + permissive text matching
                    m_q = extracted_q.get("machine")
                    i_q = extracted_q.get("issue")
                    
                    res = await asyncio.wait_for(session.run("""
                        MATCH (l:Log)-[:RESOLVED_BY]->(r:Resolution)
                        OPTIONAL MATCH (l)-[:INVOLVES_MACHINE]->(m:Machine)
                        OPTIONAL MATCH (l)-[:REPORTS_SYMPTOM]->(s:Symptom)
                        WHERE (toLower(l.title) CONTAINS $q OR toLower(l.transcript) CONTAINS $q)
                           OR ($m_q IS NOT NULL AND toLower(m.name) CONTAINS toLower($m_q))
                           OR ($i_q IS NOT NULL AND toLower(s.description) CONTAINS toLower($i_q))
                        RETURN l.title as title, l.transcript as transcript, l.audio_url as audio_url, 
                               r.steps as solution, l.root_cause as root_cause, l.confidence as confidence 
                        ORDER BY l.timestamp DESC LIMIT 1
                    """, q=q, m_q=m_q, i_q=i_q), timeout=6.0)
                    rec = await res.single()
                    if rec: 
                        match = dict(rec)
                        print(f"✅ Neo4j Smart Match Found for: {q}")
            except Exception as e:
                print(f"⚠️ Neo4j Search Failed/Timed Out: {e}")
        
        # 🟠 PHASE 2: Fallback to Mock Industrial Dataset (Universal Match)
        if not match:
            # Check for matches in mock data using both raw query and extracted entities
            m_q = (extracted_q.get("machine") or "").lower()
            i_q = (extracted_q.get("issue") or "").lower()
            
            found = next((l for l in MOCK_DB_LOGS if 
                          (q in l.get("transcript", "").lower() or q in l.get("title", "").lower())
                          or (m_q and m_q in l.get("machine", "").lower())
                          or (i_q and i_q in l.get("issue", "").lower())), None)
            
            if found: 
                match = {
                    "title": found.get("title", "Technician Insight"), 
                    "transcript": found.get("transcript", ""), 
                    "audio_url": found.get("audio_url"), 
                    "solution": found.get("resolution") or found.get("solution") or "Refer to log.",
                    "root_cause": found.get("root_cause"),
                    "confidence": found.get("confidence", 0.95)
                }
                print(f"💡 Mock Match Found for: {q}")
        
        return {"match": match}
    except Exception as e:
        print(f"❌ Search Error (Critical): {e}")
        raise HTTPException(500, detail=f"Search failed: {str(e)}")

@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    try:
        ext = file.filename.split(".")[-1]
        fname = f"{uuid.uuid4()}.{ext}"; path = os.path.join(AUDIO_UPLOAD_DIR, fname)
        with open(path, "wb") as b: b.write(await file.read())
        return {"url": f"/static/audio/{fname}"}
    except Exception as e: raise HTTPException(500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
