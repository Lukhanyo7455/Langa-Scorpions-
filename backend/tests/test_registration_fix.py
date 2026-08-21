"""Tests for the athlete registration empty-email bug fix + socials settings."""
import os
import re
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_client(client):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@langascorpions.org", "password": "ScorpionsAdmin2026!"})
    if r.status_code != 200:
        pytest.fail(f"Admin login failed {r.status_code}: {r.text[:300]}")
    return s


def adult_payload(**over):
    p = {
        "athlete_name": f"TEST_Sam Adult {uuid.uuid4().hex[:6]}",
        "date_of_birth": "1995-05-15",
        "gender": None,
        "disability": "Test disability notes",
        "email": "sam.testuser@gmail.com",
        "phone": "0731111111",
        "is_minor": False,
        "guardian_name": None,
        "guardian_email": None,
        "guardian_phone": None,
        "city": "Cape Town",
        "consent": True,
        "notes": None,
    }
    p.update(over)
    return p


def minor_payload(**over):
    p = adult_payload()
    p.update({
        "athlete_name": f"TEST_Junior {uuid.uuid4().hex[:6]}",
        "date_of_birth": "2012-05-15",
        "email": None, "phone": None,
        "is_minor": True,
        "guardian_name": "Parent Test",
        "guardian_email": "parent.test@gmail.com",
        "guardian_phone": "0732222222",
    })
    p.update(over)
    return p


# --- Registration endpoint: bug fix ---
class TestAthleteRegistration:
    def test_adult_nulls_ok(self, client):
        r = client.post(f"{BASE_URL}/api/public/athletes", json=adult_payload())
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert isinstance(d.get("id"), str) and d["id"]
        assert d.get("status") == "received"

    def test_adult_empty_string_guardian_email(self, client):
        """Primary bug: guardian_email='' must be coerced to None, not 422."""
        r = client.post(f"{BASE_URL}/api/public/athletes", json=adult_payload(
            guardian_email="", guardian_name="", guardian_phone="", gender="", notes=""))
        assert r.status_code == 200, r.text[:400]
        assert r.json().get("status") == "received"

    def test_minor_empty_string_email(self, client):
        r = client.post(f"{BASE_URL}/api/public/athletes", json=minor_payload(email="", phone=""))
        assert r.status_code == 200, r.text[:400]
        assert r.json().get("status") == "received"

    def test_minor_ok(self, client):
        r = client.post(f"{BASE_URL}/api/public/athletes", json=minor_payload())
        assert r.status_code == 200, r.text[:400]
        assert r.json().get("status") == "received"

    def test_consent_false_400(self, client):
        r = client.post(f"{BASE_URL}/api/public/athletes", json=adult_payload(consent=False))
        assert r.status_code == 400, r.text[:300]
        assert "consent" in r.text.lower()

    def test_adult_without_email_400(self, client):
        r = client.post(f"{BASE_URL}/api/public/athletes", json=adult_payload(email=""))
        assert r.status_code == 400, r.text[:300]
        assert "email" in r.text.lower()

    def test_minor_without_guardian_400(self, client):
        r = client.post(f"{BASE_URL}/api/public/athletes", json=minor_payload(guardian_email=""))
        assert r.status_code == 400, r.text[:300]
        assert "guardian" in r.text.lower()

    def test_invalid_email_still_rejected(self, client):
        r = client.post(f"{BASE_URL}/api/public/athletes", json=adult_payload(email="notanemail"))
        assert r.status_code == 422, r.text[:300]

    def test_persistence_via_admin(self, client, admin_client):
        name = f"TEST_Persist {uuid.uuid4().hex[:6]}"
        r = client.post(f"{BASE_URL}/api/public/athletes", json=adult_payload(athlete_name=name))
        assert r.status_code == 200
        rid = r.json()["id"]
        lst = admin_client.get(f"{BASE_URL}/api/admin/athletes")
        assert lst.status_code == 200, lst.text[:300]
        body = lst.json()
        items = body if isinstance(body, list) else body.get("items", body.get("data", []))
        assert not any("_id" in i for i in items), "MongoDB _id leaked in admin response"
        match = [i for i in items if i.get("id") == rid]
        assert match, f"Registration {rid} not persisted/listed"
        assert match[0]["athlete_name"] == name
        assert match[0].get("email") == "sam.testuser@gmail.com"


# --- Public settings: socials ---
class TestSocials:
    def test_settings_socials(self, client):
        r = client.get(f"{BASE_URL}/api/public/settings")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "facebook.com/share/1JJpMe8MBW" in (d.get("facebook_url") or "")
        assert "scorpionswheelchairbasketball" in (d.get("instagram_url") or "")
        assert "@scorpionsbasketball" in (d.get("tiktok_url") or "")
        assert (d.get("youtube_url") or "") == "", f"youtube_url should be empty, got {d.get('youtube_url')!r}"
