from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal, Annotated

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware
import io
import csv

# ---------- Setup ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@langascorpions.org")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme")
ORG_EMAIL = os.environ.get("ORG_EMAIL", "info@langascorpions.org")
ORG_WHATSAPP = os.environ.get("ORG_WHATSAPP", "+27000000000")

JWT_ALG = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Langa Scorpions API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("langa")

# ---------- Helpers ----------
def _obj_id(v):
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)

PyObjectId = Annotated[str, BeforeValidator(_obj_id)]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_admin(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or user.get("role") != "admin":
            raise HTTPException(401, "Admin not found")
        return {"id": str(user["_id"]), "email": user["email"], "role": user["role"], "name": user.get("name", "Admin")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    except InvalidId:
        raise HTTPException(401, "Invalid token")

def doc_to_out(doc: dict) -> dict:
    if not doc:
        return doc
    doc["id"] = str(doc.pop("_id"))
    return doc

# ---------- Models ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class DonationIn(BaseModel):
    donor_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    amount: float = Field(gt=0)
    currency: str = Field(default="ZAR", max_length=6)
    frequency: Literal["one-time", "monthly"] = "one-time"
    message: Optional[str] = Field(default=None, max_length=1000)
    phone: Optional[str] = Field(default=None, max_length=40)

class AthleteRegistrationIn(BaseModel):
    athlete_name: str = Field(min_length=1, max_length=120)
    date_of_birth: str
    gender: Optional[str] = Field(default=None, max_length=40)
    disability: str = Field(min_length=1, max_length=500)
    guardian_name: str = Field(min_length=1, max_length=120)
    guardian_email: EmailStr
    guardian_phone: str = Field(min_length=1, max_length=40)
    city: Optional[str] = Field(default=None, max_length=120)
    program: str = Field(default="Wheelchair Basketball", max_length=120)
    consent: bool
    notes: Optional[str] = Field(default=None, max_length=2000)

class VolunteerIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=40)
    role_interest: str = Field(min_length=1, max_length=200)
    availability: Optional[str] = Field(default=None, max_length=200)
    experience: Optional[str] = Field(default=None, max_length=2000)

class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    subject: Optional[str] = Field(default=None, max_length=200)
    message: str = Field(min_length=1, max_length=4000)

class NewsletterIn(BaseModel):
    email: EmailStr
    name: Optional[str] = Field(default=None, max_length=120)

class EventIn(BaseModel):
    title: str
    kind: Literal["practice", "game", "community"] = "practice"
    starts_at: str  # ISO datetime
    location: str
    description: Optional[str] = None
    published: bool = True

class StoryIn(BaseModel):
    title: str
    subtitle: Optional[str] = None
    body: str
    athlete_name: Optional[str] = None
    image_url: Optional[str] = None
    published: bool = True

class GalleryIn(BaseModel):
    caption: Optional[str] = None
    image_url: str
    source: Optional[str] = "upload"  # upload | facebook | external
    published: bool = True

class SettingsIn(BaseModel):
    mission: Optional[str] = None
    tagline: Optional[str] = None
    org_email: Optional[str] = None
    whatsapp: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    address: Optional[str] = None

# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.newsletter.create_index("email", unique=True)
    await db.events.create_index("starts_at")
    await db.stories.create_index("created_at")
    await db.gallery.create_index("created_at")

    # Idempotent admin seed
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Langa Scorpions Admin",
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info("Seeded admin user: %s", ADMIN_EMAIL)
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}}
        )
        logger.info("Refreshed admin password for %s", ADMIN_EMAIL)

    # Seed settings
    if not await db.settings.find_one({"_id": "site"}):
        await db.settings.insert_one({
            "_id": "site",
            "mission": "Langa Scorpions empowers young persons with disabilities through wheelchair basketball, life skills, and social empowerment — building confidence on and off the court.",
            "tagline": "Sport. Skills. Empowerment.",
            "org_email": ORG_EMAIL,
            "whatsapp": ORG_WHATSAPP,
            "facebook_url": "https://facebook.com/langascorpions",
            "instagram_url": "https://instagram.com/langascorpions",
            "address": "Langa, Cape Town, South Africa",
        })

    # Seed placeholder content
    if await db.events.count_documents({}) == 0:
        await db.events.insert_many([
            {"title": "Wheelchair Basketball Practice", "kind": "practice",
             "starts_at": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
             "location": "Langa Community Sports Hall",
             "description": "Weekly team practice — new athletes welcome. Wheelchairs provided.",
             "published": True, "created_at": now_iso()},
            {"title": "Friendly Match vs Cape Town Rollers", "kind": "game",
             "starts_at": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
             "location": "Bellville Velodrome",
             "description": "Come cheer on the Scorpions in their first friendly of the season!",
             "published": True, "created_at": now_iso()},
            {"title": "Community Open Day", "kind": "community",
             "starts_at": (datetime.now(timezone.utc) + timedelta(days=21)).isoformat(),
             "location": "Langa Community Sports Hall",
             "description": "Bring the family. Meet athletes, try a chair, learn about the program.",
             "published": True, "created_at": now_iso()},
        ])
    if await db.stories.count_documents({}) == 0:
        await db.stories.insert_many([
            {"title": "Sipho's First Basket",
             "subtitle": "From spectator to starting five in eight months.",
             "body": "When Sipho first rolled onto the court, he wasn't sure he belonged. Today he's one of our most reliable shooters, mentoring newer athletes and studying sports management at TVET college. \"Scorpions gave me a team,\" he says. \"They gave me a reason to show up — for myself.\"",
             "athlete_name": "Sipho M.",
             "image_url": "https://images.unsplash.com/photo-1776705865123-f58d0ec06653?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwyfHxkaXNhYmxlZCUyMGF0aGxldGUlMjBwb3J0cmFpdHxlbnwwfHx8fDE3ODU5NjgwMTF8MA&ixlib=rb-4.1.0&q=85",
             "published": True, "created_at": now_iso()},
            {"title": "Nomsa Leads From the Point",
             "subtitle": "A quiet teenager who found her voice as team captain.",
             "body": "Nomsa joined the Scorpions at 14. Three years later she captains the youth squad and speaks at schools about inclusion and adaptive sport. She's now applying for a bursary to study physiotherapy — with the goal of coming back to work with athletes like herself.",
             "athlete_name": "Nomsa D.",
             "image_url": "https://images.unsplash.com/photo-1679306352618-136e6fdfd450?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHw0fHx3aGVlbGNoYWlyJTIwYmFza2V0YmFsbHxlbnwwfHx8fDE3ODU5NjgwMTF8MA&ixlib=rb-4.1.0&q=85",
             "published": True, "created_at": now_iso()},
        ])
    if await db.gallery.count_documents({}) == 0:
        await db.gallery.insert_many([
            {"caption": "Practice night at the community hall",
             "image_url": "https://images.unsplash.com/photo-1778432999383-8e241a3c91f0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwyfHx3aGVlbGNoYWlyJTIwYmFza2V0YmFsbHxlbnwwfHx8fDE3ODU5NjgwMTF8MA&ixlib=rb-4.1.0&q=85",
             "source": "external", "published": True, "created_at": now_iso()},
            {"caption": "Team huddle before tip-off",
             "image_url": "https://images.unsplash.com/photo-1679306352618-136e6fdfd450?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHw0fHx3aGVlbGNoYWlyJTIwYmFza2V0YmFsbHxlbnwwfHx8fDE3ODU5NjgwMTF8MA&ixlib=rb-4.1.0&q=85",
             "source": "external", "published": True, "created_at": now_iso()},
            {"caption": "Community open day with volunteers",
             "image_url": "https://images.unsplash.com/photo-1774557937044-a9a970042796?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHw0fHxjb21tdW5pdHklMjBzcG9ydHMlMjB2b2x1bnRlZXJ8ZW58MHx8fHwxNzg1OTY4MDExfDA&ixlib=rb-4.1.0&q=85",
             "source": "external", "published": True, "created_at": now_iso()},
        ])

# ---------- Auth Routes ----------
@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(str(user["_id"]), email)
    response.set_cookie(
        "access_token", token,
        httponly=True, secure=True, samesite="none",
        max_age=60 * 60 * 12, path="/",
    )
    return {"user": {"id": str(user["_id"]), "email": email, "name": user.get("name"), "role": user.get("role")}, "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(admin=Depends(get_current_admin)):
    return admin

# ---------- Public Content ----------
@api.get("/public/settings")
async def get_settings():
    s = await db.settings.find_one({"_id": "site"}) or {}
    s.pop("_id", None)
    return s

@api.get("/public/events")
async def public_events():
    docs = await db.events.find({"published": True}).sort("starts_at", 1).to_list(200)
    return [doc_to_out(d) for d in docs]

@api.get("/public/stories")
async def public_stories():
    docs = await db.stories.find({"published": True}).sort("created_at", -1).to_list(200)
    return [doc_to_out(d) for d in docs]

@api.get("/public/gallery")
async def public_gallery():
    docs = await db.gallery.find({"published": True}).sort("created_at", -1).to_list(200)
    return [doc_to_out(d) for d in docs]

@api.get("/public/impact")
async def public_impact():
    athletes = await db.athlete_registrations.count_documents({})
    volunteers = await db.volunteers.count_documents({})
    donations_total = 0.0
    async for d in db.donations.find({}):
        donations_total += float(d.get("amount", 0) or 0)
    events_upcoming = await db.events.count_documents({"published": True})
    return {
        "athletes": max(athletes, 24),
        "volunteers": max(volunteers, 18),
        "donations_total": donations_total,
        "programs": 1,
        "events_upcoming": events_upcoming,
    }

# ---------- Public Form Submissions ----------
@api.post("/public/donations")
async def create_donation(payload: DonationIn):
    doc = payload.model_dump()
    doc.update({"status": "pledged", "created_at": now_iso()})
    r = await db.donations.insert_one(doc)
    return {"id": str(r.inserted_id), "status": "pledged"}

@api.post("/public/athletes")
async def register_athlete(payload: AthleteRegistrationIn):
    if not payload.consent:
        raise HTTPException(400, "Consent is required to register an athlete.")
    doc = payload.model_dump()
    doc.update({"status": "new", "created_at": now_iso()})
    r = await db.athlete_registrations.insert_one(doc)
    return {"id": str(r.inserted_id), "status": "received"}

@api.post("/public/volunteers")
async def register_volunteer(payload: VolunteerIn):
    doc = payload.model_dump()
    doc.update({"status": "new", "created_at": now_iso()})
    r = await db.volunteers.insert_one(doc)
    return {"id": str(r.inserted_id), "status": "received"}

@api.post("/public/contact")
async def contact(payload: ContactIn):
    doc = payload.model_dump()
    doc.update({"status": "new", "created_at": now_iso()})
    r = await db.contact_messages.insert_one(doc)
    return {"id": str(r.inserted_id), "status": "received"}

@api.post("/public/newsletter")
async def newsletter(payload: NewsletterIn):
    email = payload.email.lower()
    try:
        await db.newsletter.insert_one({
            "email": email,
            "name": payload.name,
            "created_at": now_iso(),
        })
    except Exception:
        pass  # already subscribed — idempotent
    return {"status": "subscribed"}

# ---------- Admin CRUD ----------
def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(400, "Invalid id")

@api.get("/admin/stats")
async def admin_stats(admin=Depends(get_current_admin)):
    donations = await db.donations.find({}).to_list(2000)
    total = sum(float(d.get("amount", 0) or 0) for d in donations)
    return {
        "athletes": await db.athlete_registrations.count_documents({}),
        "volunteers": await db.volunteers.count_documents({}),
        "donations_count": len(donations),
        "donations_total": total,
        "newsletter": await db.newsletter.count_documents({}),
        "contact": await db.contact_messages.count_documents({}),
        "events": await db.events.count_documents({}),
        "stories": await db.stories.count_documents({}),
        "gallery": await db.gallery.count_documents({}),
    }

# Generic list helpers
async def _list(coll, sort_field="created_at", direction=-1, limit=500):
    docs = await db[coll].find({}).sort(sort_field, direction).to_list(limit)
    return [doc_to_out(d) for d in docs]

@api.get("/admin/donations")
async def admin_donations(admin=Depends(get_current_admin)):
    return await _list("donations")

@api.get("/admin/athletes")
async def admin_athletes(admin=Depends(get_current_admin)):
    return await _list("athlete_registrations")

@api.get("/admin/volunteers")
async def admin_volunteers(admin=Depends(get_current_admin)):
    return await _list("volunteers")

@api.get("/admin/contact")
async def admin_contact(admin=Depends(get_current_admin)):
    return await _list("contact_messages")

@api.get("/admin/newsletter")
async def admin_newsletter(admin=Depends(get_current_admin)):
    return await _list("newsletter")

# Events CRUD
@api.get("/admin/events")
async def admin_events(admin=Depends(get_current_admin)):
    return await _list("events", sort_field="starts_at", direction=1)

@api.post("/admin/events")
async def create_event(payload: EventIn, admin=Depends(get_current_admin)):
    doc = payload.model_dump()
    doc["created_at"] = now_iso()
    r = await db.events.insert_one(doc)
    return {"id": str(r.inserted_id)}

@api.put("/admin/events/{eid}")
async def update_event(eid: str, payload: EventIn, admin=Depends(get_current_admin)):
    await db.events.update_one({"_id": _oid(eid)}, {"$set": payload.model_dump()})
    return {"ok": True}

@api.delete("/admin/events/{eid}")
async def delete_event(eid: str, admin=Depends(get_current_admin)):
    await db.events.delete_one({"_id": _oid(eid)})
    return {"ok": True}

# Stories CRUD
@api.get("/admin/stories")
async def admin_stories(admin=Depends(get_current_admin)):
    return await _list("stories")

@api.post("/admin/stories")
async def create_story(payload: StoryIn, admin=Depends(get_current_admin)):
    doc = payload.model_dump()
    doc["created_at"] = now_iso()
    r = await db.stories.insert_one(doc)
    return {"id": str(r.inserted_id)}

@api.put("/admin/stories/{sid}")
async def update_story(sid: str, payload: StoryIn, admin=Depends(get_current_admin)):
    await db.stories.update_one({"_id": _oid(sid)}, {"$set": payload.model_dump()})
    return {"ok": True}

@api.delete("/admin/stories/{sid}")
async def delete_story(sid: str, admin=Depends(get_current_admin)):
    await db.stories.delete_one({"_id": _oid(sid)})
    return {"ok": True}

# Gallery CRUD
@api.get("/admin/gallery")
async def admin_gallery(admin=Depends(get_current_admin)):
    return await _list("gallery")

@api.post("/admin/gallery")
async def create_gallery(payload: GalleryIn, admin=Depends(get_current_admin)):
    doc = payload.model_dump()
    doc["created_at"] = now_iso()
    r = await db.gallery.insert_one(doc)
    return {"id": str(r.inserted_id)}

@api.put("/admin/gallery/{gid}")
async def update_gallery(gid: str, payload: GalleryIn, admin=Depends(get_current_admin)):
    await db.gallery.update_one({"_id": _oid(gid)}, {"$set": payload.model_dump()})
    return {"ok": True}

@api.delete("/admin/gallery/{gid}")
async def delete_gallery(gid: str, admin=Depends(get_current_admin)):
    await db.gallery.delete_one({"_id": _oid(gid)})
    return {"ok": True}

# Settings
@api.put("/admin/settings")
async def update_settings(payload: SettingsIn, admin=Depends(get_current_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.settings.update_one({"_id": "site"}, {"$set": updates}, upsert=True)
    return {"ok": True}

# CSV exports
def _csv_stream(rows: List[dict], fields: List[str], filename: str):
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow(r)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@api.get("/admin/export/{kind}")
async def export_csv(kind: str, admin=Depends(get_current_admin)):
    mapping = {
        "donations": ("donations", ["id", "donor_name", "email", "amount", "currency", "frequency", "message", "phone", "status", "created_at"]),
        "athletes": ("athlete_registrations", ["id", "athlete_name", "date_of_birth", "gender", "disability", "guardian_name", "guardian_email", "guardian_phone", "city", "program", "consent", "notes", "status", "created_at"]),
        "volunteers": ("volunteers", ["id", "full_name", "email", "phone", "role_interest", "availability", "experience", "status", "created_at"]),
        "newsletter": ("newsletter", ["id", "email", "name", "created_at"]),
        "contact": ("contact_messages", ["id", "name", "email", "subject", "message", "status", "created_at"]),
    }
    if kind not in mapping:
        raise HTTPException(404, "Unknown export type")
    coll, fields = mapping[kind]
    rows = await _list(coll)
    return _csv_stream(rows, fields, f"{kind}.csv")

# ---------- Register ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
