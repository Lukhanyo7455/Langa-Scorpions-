from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal, Annotated

import bcrypt
import jwt
import requests
import httpx
import asyncio
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query, UploadFile, File, Header
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, field_validator
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
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Email (Emergent-managed Resend)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMERGENT_EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Langa Scorpions")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "")

async def _send_email(to: str, subject: str, html: str, reply_to: Optional[str] = None) -> None:
    if not to:
        return
    # Prefer direct Resend (BYO API key + verified sender domain) when configured
    if RESEND_API_KEY and RESEND_FROM_EMAIL:
        payload = {
            "from": f"{EMAIL_FROM_NAME} <{RESEND_FROM_EMAIL}>",
            "to": [to],
            "subject": subject,
            "html": html,
        }
        if reply_to:
            payload["reply_to"] = reply_to
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {RESEND_API_KEY}",
                             "Content-Type": "application/json"},
                    json=payload,
                )
                if r.status_code >= 300:
                    logging.getLogger("langa").warning("Resend send %s: %s", r.status_code, r.text[:200])
        except Exception as e:
            logging.getLogger("langa").warning("Resend send error: %s", e)
        return
    # Fallback to Emergent-managed integration
    if not EMERGENT_EMAIL_KEY:
        return
    payload = {
        "to": [to],
        "subject": subject,
        "html": html,
        "from_name": EMAIL_FROM_NAME,
    }
    if reply_to:
        payload["contact_email"] = reply_to
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMERGENT_EMAIL_KEY},
                json=payload,
            )
            if r.status_code >= 300:
                logging.getLogger("langa").warning("Email send %s: %s", r.status_code, r.text[:200])
    except Exception as e:
        logging.getLogger("langa").warning("Email send error: %s", e)

def _fire_and_forget(coro):
    """Send an email without blocking the API response."""
    try:
        asyncio.get_running_loop().create_task(coro)
    except RuntimeError:
        asyncio.run(coro)

def _email_shell(title: str, body_html: str) -> str:
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
          <tr><td style="background:#141414;padding:24px 32px;color:#ffffff">
            <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em">Langa <span style="color:#B91C2C">Scorpions</span></div>
            <div style="font-size:11px;color:#B91C2C;text-transform:uppercase;letter-spacing:0.2em;margin-top:6px">Adaptive Sports · Development</div>
          </td></tr>
          <tr><td style="padding:32px">
            <h1 style="margin:0 0 12px;color:#141414;font-size:22px;font-weight:700">{title}</h1>
            <div style="color:#333;font-size:15px;line-height:1.6">{body_html}</div>
          </td></tr>
          <tr><td style="padding:20px 32px;background:#fafafa;color:#666;font-size:12px;border-top:1px solid #eaeaea">
            Langa Scorpions Adaptive Sports and Development · Langa, Cape Town<br/>
            <a href="mailto:info@langascorpions.co.za" style="color:#B91C2C">info@langascorpions.co.za</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
    """

# Object storage
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "langa-scorpions"
_storage_key: Optional[str] = None

def init_storage(force: bool = False) -> Optional[str]:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        return None
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        r.raise_for_status()
        _storage_key = r.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logging.getLogger("langa").warning("Storage init failed: %s", e)
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(503, "Storage not available")
    r = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if r.status_code == 404:
        # stale key — force refresh once
        key = init_storage(force=True)
        r = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    r.raise_for_status()
    return r.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(503, "Storage not available")
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code == 404:
        key = init_storage(force=True)
        r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")

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
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=40)
    is_minor: bool = False
    guardian_name: Optional[str] = Field(default=None, max_length=120)
    guardian_email: Optional[EmailStr] = None
    guardian_phone: Optional[str] = Field(default=None, max_length=40)
    city: Optional[str] = Field(default=None, max_length=120)
    program: str = Field(default="Wheelchair Basketball", max_length=120)
    consent: bool
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("email", "guardian_email", mode="before")
    @classmethod
    def _empty_email_to_none(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return None
        return v

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
    image_url: Optional[str] = None
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
    tiktok_url: Optional[str] = None
    youtube_url: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None

class SponsorIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    tier: Literal["headline", "partner", "grant", "community"] = "partner"
    website: Optional[str] = None
    logo_url: Optional[str] = None
    published: bool = True

# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.newsletter.create_index("email", unique=True)
    await db.events.create_index("starts_at")
    await db.stories.create_index("created_at")
    await db.gallery.create_index("created_at")

    # Warm object storage session (best-effort)
    init_storage()

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

    if await db.sponsors.count_documents({}) == 0:
        await db.sponsors.insert_many([
            {"name": "Cape Town Community Trust", "tier": "headline", "website": "https://example.org", "logo_url": None, "published": True, "created_at": now_iso()},
            {"name": "Rainbow Foundation", "tier": "partner", "website": "https://example.org", "logo_url": None, "published": True, "created_at": now_iso()},
            {"name": "Ubuntu Grants", "tier": "grant", "website": "https://example.org", "logo_url": None, "published": True, "created_at": now_iso()},
            {"name": "Langa Local FC", "tier": "community", "website": "https://example.org", "logo_url": None, "published": True, "created_at": now_iso()},
            {"name": "Table Mountain Motors", "tier": "partner", "website": "https://example.org", "logo_url": None, "published": True, "created_at": now_iso()},
            {"name": "Southern Sun Sports", "tier": "partner", "website": "https://example.org", "logo_url": None, "published": True, "created_at": now_iso()},
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
        "athletes": max(athletes, 30),
        "volunteers": max(volunteers, 13),
        "donations_total": donations_total,
        "programs": 1,
        "events_upcoming": events_upcoming,
    }

# ---------- Public Form Submissions ----------
NOTIFY_EMAIL = "info@langascorpions.co.za"

@api.post("/public/donations")
async def create_donation(payload: DonationIn):
    doc = payload.model_dump()
    doc.update({"status": "pledged", "created_at": now_iso()})
    r = await db.donations.insert_one(doc)

    freq_label = "monthly" if payload.frequency == "monthly" else "one-time"
    # Notify org
    _fire_and_forget(_send_email(
        NOTIFY_EMAIL,
        f"New donation pledge — R{payload.amount:,.0f} from {payload.donor_name}",
        _email_shell("New donation pledge", f"""
          <p><strong>{payload.donor_name}</strong> pledged <strong>R{payload.amount:,.0f} ({freq_label})</strong>.</p>
          <ul>
            <li>Email: <a href="mailto:{payload.email}">{payload.email}</a></li>
            <li>Phone: {payload.phone or "—"}</li>
            <li>Message: {payload.message or "—"}</li>
          </ul>
          <p style="color:#666;font-size:13px">Follow up with EFT / banking details to complete the donation.</p>
        """),
        reply_to=payload.email,
    ))
    # Warm confirmation to donor
    _fire_and_forget(_send_email(
        payload.email,
        "Thank you for pledging to Langa Scorpions",
        _email_shell(f"Thank you, {payload.donor_name.split()[0]} 🏀", f"""
          <p>Your pledge of <strong>R{payload.amount:,.0f} ({freq_label})</strong> means the world to our athletes.</p>
          <p>We'll email you our banking details shortly so you can complete the donation via EFT. If you have any questions, just hit reply — this email goes straight to us.</p>
          <p style="margin-top:24px">— The Langa Scorpions team</p>
        """),
        reply_to=NOTIFY_EMAIL,
    ))
    return {"id": str(r.inserted_id), "status": "pledged"}

@api.post("/public/athletes")
async def register_athlete(payload: AthleteRegistrationIn):
    if not payload.consent:
        raise HTTPException(400, "Consent is required to register.")
    if payload.is_minor:
        if not (payload.guardian_name and payload.guardian_email and payload.guardian_phone):
            raise HTTPException(400, "Parent / guardian details are required for athletes under 18.")
    else:
        if not (payload.email and payload.phone):
            raise HTTPException(400, "Your email and phone are required.")
    doc = payload.model_dump()
    doc.update({"status": "new", "created_at": now_iso()})
    r = await db.athlete_registrations.insert_one(doc)

    contact_email = payload.guardian_email if payload.is_minor else payload.email
    contact_name = payload.guardian_name if payload.is_minor else payload.athlete_name
    _fire_and_forget(_send_email(
        NOTIFY_EMAIL,
        f"New athlete registration — {payload.athlete_name}",
        _email_shell("New athlete registration", f"""
          <ul>
            <li><strong>Athlete:</strong> {payload.athlete_name}</li>
            <li><strong>DOB:</strong> {payload.date_of_birth}</li>
            <li><strong>Gender:</strong> {payload.gender or "—"}</li>
            <li><strong>City:</strong> {payload.city or "—"}</li>
            <li><strong>Program:</strong> {payload.program}</li>
            <li><strong>Minor?</strong> {"Yes" if payload.is_minor else "No"}</li>
            <li><strong>Contact email:</strong> <a href="mailto:{contact_email}">{contact_email}</a></li>
            <li><strong>Contact phone:</strong> {payload.guardian_phone if payload.is_minor else payload.phone}</li>
            <li><strong>Disability / mobility:</strong> {payload.disability}</li>
            <li><strong>Notes:</strong> {payload.notes or "—"}</li>
          </ul>
        """),
        reply_to=contact_email or None,
    ))
    if contact_email:
        _fire_and_forget(_send_email(
            contact_email,
            "We received the Scorpions registration",
            _email_shell(f"Welcome to the Scorpions family, {contact_name.split()[0]}", f"""
              <p>Thanks for registering <strong>{payload.athlete_name}</strong> for our Wheelchair Basketball program.</p>
              <p>A coach will be in touch within 3 working days to arrange a first practice visit — practice is <strong>Sundays 16:00–19:00</strong> at Langa Community Sports Hall.</p>
              <p>Reply to this email if you have any questions in the meantime.</p>
              <p style="margin-top:24px">— The Langa Scorpions team</p>
            """),
            reply_to=NOTIFY_EMAIL,
        ))
    return {"id": str(r.inserted_id), "status": "received"}

@api.post("/public/volunteers")
async def register_volunteer(payload: VolunteerIn):
    doc = payload.model_dump()
    doc.update({"status": "new", "created_at": now_iso()})
    r = await db.volunteers.insert_one(doc)

    _fire_and_forget(_send_email(
        NOTIFY_EMAIL,
        f"New volunteer signup — {payload.full_name} ({payload.role_interest})",
        _email_shell("New volunteer signup", f"""
          <ul>
            <li><strong>Name:</strong> {payload.full_name}</li>
            <li><strong>Email:</strong> <a href="mailto:{payload.email}">{payload.email}</a></li>
            <li><strong>Phone:</strong> {payload.phone or "—"}</li>
            <li><strong>Role interest:</strong> {payload.role_interest}</li>
            <li><strong>Availability:</strong> {payload.availability or "—"}</li>
            <li><strong>Experience:</strong> {payload.experience or "—"}</li>
          </ul>
        """),
        reply_to=payload.email,
    ))
    _fire_and_forget(_send_email(
        payload.email,
        "Welcome to the Scorpions volunteer team",
        _email_shell(f"Thanks {payload.full_name.split()[0]} — we'll be in touch", f"""
          <p>Thank you for offering your time to Langa Scorpions. We'll match you to the right role and reach out within a week.</p>
          <p>Reply to this email if you have questions — it goes straight to <a href="mailto:info@langascorpions.co.za">info@langascorpions.co.za</a>.</p>
          <p style="margin-top:24px">— The Langa Scorpions team</p>
        """),
        reply_to=NOTIFY_EMAIL,
    ))
    return {"id": str(r.inserted_id), "status": "received"}

@api.post("/public/contact")
async def contact(payload: ContactIn):
    doc = payload.model_dump()
    doc.update({"status": "new", "created_at": now_iso()})
    r = await db.contact_messages.insert_one(doc)

    _fire_and_forget(_send_email(
        NOTIFY_EMAIL,
        f"[Contact] {payload.subject or 'New message from ' + payload.name}",
        _email_shell(f"New message from {payload.name}", f"""
          <p><strong>Email:</strong> <a href="mailto:{payload.email}">{payload.email}</a></p>
          <p><strong>Subject:</strong> {payload.subject or "—"}</p>
          <p style="white-space:pre-wrap;margin-top:12px;padding:12px;background:#f8f8f8;border-left:3px solid #B91C2C">{payload.message}</p>
        """),
        reply_to=payload.email,
    ))
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
# ---- Sponsors ----
@api.get("/public/sponsors")
async def public_sponsors():
    docs = await db.sponsors.find({"published": True}).sort("created_at", 1).to_list(200)
    return [doc_to_out(d) for d in docs]

@api.get("/admin/sponsors")
async def admin_sponsors(admin=Depends(get_current_admin)):
    return await _list("sponsors", sort_field="created_at", direction=1)

@api.post("/admin/sponsors")
async def create_sponsor(payload: SponsorIn, admin=Depends(get_current_admin)):
    doc = payload.model_dump()
    doc["created_at"] = now_iso()
    r = await db.sponsors.insert_one(doc)
    return {"id": str(r.inserted_id)}

@api.put("/admin/sponsors/{sid}")
async def update_sponsor(sid: str, payload: SponsorIn, admin=Depends(get_current_admin)):
    await db.sponsors.update_one({"_id": _oid(sid)}, {"$set": payload.model_dump()})
    return {"ok": True}

@api.delete("/admin/sponsors/{sid}")
async def delete_sponsor(sid: str, admin=Depends(get_current_admin)):
    await db.sponsors.delete_one({"_id": _oid(sid)})
    return {"ok": True}

# ---- File uploads (admin only) ----
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB

@api.post("/admin/upload")
async def upload_image(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    ctype = (file.content_type or "").lower()
    if ctype not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Unsupported image type: {ctype}")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, "Image exceeds 8MB limit")
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    ext = ext if ext in {"jpg", "jpeg", "png", "webp", "gif"} else "jpg"
    path = f"{APP_NAME}/uploads/{admin['id']}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, ctype)
    rec = {
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": ctype,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.files.insert_one(rec)
    return {"storage_path": result["path"], "url": f"/api/files/{result['path']}"}

@api.get("/files/{storage_path:path}")
async def serve_file(storage_path: str):
    rec = await db.files.find_one({"storage_path": storage_path, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "File not found")
    data, ctype = get_object(storage_path)
    return Response(
        content=data,
        media_type=rec.get("content_type", ctype),
        headers={"Cache-Control": "public, max-age=86400"},
    )

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
