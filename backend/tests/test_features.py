"""Backend tests for Sponsors, Object Storage upload, and Stripe checkout."""
import os
import io
import struct
import zlib
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://adaptive-sports-3.preview.emergentagent.com').rstrip('/')
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@langascorpions.org")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "ScorpionsAdmin2026!")


def make_png_bytes() -> bytes:
    """Create a minimal valid 1x1 PNG."""
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00" + b"\xff\x00\x00"
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Sponsors ----------
class TestSponsors:
    def test_public_sponsors_seeded(self):
        r = requests.get(f"{BASE_URL}/api/public/sponsors", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 6, f"Expected >=6 sponsors, got {len(data)}"
        for s in data:
            assert "id" in s and "name" in s and "tier" in s
            assert s["tier"] in {"headline", "partner", "grant", "community"}

    def test_admin_sponsors_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/admin/sponsors",
                          json={"name": "TEST_NoAuth", "tier": "partner"}, timeout=30)
        assert r.status_code == 401

    def test_admin_sponsors_crud(self, auth_headers):
        # Create
        payload = {"name": "TEST_Sponsor_CRUD", "tier": "partner",
                   "website": "https://example.com", "published": True}
        r = requests.post(f"{BASE_URL}/api/admin/sponsors", json=payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]

        # Verify GET
        r2 = requests.get(f"{BASE_URL}/api/public/sponsors", timeout=30)
        assert any(s["id"] == sid for s in r2.json())

        # Update
        upd = {"name": "TEST_Sponsor_UPDATED", "tier": "grant", "website": "https://x.com", "published": True}
        r3 = requests.put(f"{BASE_URL}/api/admin/sponsors/{sid}", json=upd, headers=auth_headers, timeout=30)
        assert r3.status_code == 200

        r4 = requests.get(f"{BASE_URL}/api/public/sponsors", timeout=30)
        found = next((s for s in r4.json() if s["id"] == sid), None)
        assert found and found["name"] == "TEST_Sponsor_UPDATED" and found["tier"] == "grant"

        # Delete
        r5 = requests.delete(f"{BASE_URL}/api/admin/sponsors/{sid}", headers=auth_headers, timeout=30)
        assert r5.status_code == 200

        r6 = requests.get(f"{BASE_URL}/api/public/sponsors", timeout=30)
        assert not any(s["id"] == sid for s in r6.json())


# ---------- Object Storage ----------
class TestObjectStorage:
    def test_upload_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/admin/upload",
                          files={"file": ("t.png", make_png_bytes(), "image/png")}, timeout=30)
        assert r.status_code == 401

    def test_upload_rejects_bad_content_type(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/admin/upload",
                          files={"file": ("t.txt", b"hello", "text/plain")},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 400

    def test_upload_and_fetch(self, auth_headers):
        png = make_png_bytes()
        r = requests.post(f"{BASE_URL}/api/admin/upload",
                          files={"file": ("t.png", png, "image/png")},
                          headers=auth_headers, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "storage_path" in data and "url" in data
        assert data["url"].startswith("/api/files/")

        # Fetch (unauthenticated GET)
        r2 = requests.get(f"{BASE_URL}{data['url']}", timeout=60)
        assert r2.status_code == 200, r2.text
        assert r2.headers.get("Content-Type", "").startswith("image/")
        assert len(r2.content) > 0


# ---------- Stripe ----------
class TestStripe:
    def test_checkout_creates_session(self):
        payload = {
            "amount": 100.0,
            "donor_name": "TEST Donor",
            "email": "test@example.com",
            "frequency": "one-time",
            "origin_url": BASE_URL,
        }
        r = requests.post(f"{BASE_URL}/api/public/donations/checkout", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "checkout_url" in data and "session_id" in data
        assert data["checkout_url"].startswith("https://checkout.stripe.com"), data["checkout_url"]
        # Persist for status test
        TestStripe._sid = data["session_id"]

    def test_checkout_status(self):
        sid = getattr(TestStripe, "_sid", None)
        assert sid, "No session id from prior test"
        r = requests.get(f"{BASE_URL}/api/public/donations/status/{sid}", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["session_id"] == sid
        assert "status" in data and "payment_status" in data and "amount" in data

    def test_status_fake_id_returns_404(self):
        r = requests.get(f"{BASE_URL}/api/public/donations/status/fake_id_xyz", timeout=30)
        assert r.status_code == 404


# ---------- Regression ----------
class TestRegression:
    def test_public_pledge_donation_still_works(self):
        r = requests.post(f"{BASE_URL}/api/public/donations",
                          json={"donor_name": "TEST Reg", "email": "reg@example.com",
                                "amount": 50, "frequency": "one-time"}, timeout=30)
        assert r.status_code == 200
        assert r.json().get("status") == "pledged"

    def test_home_public_endpoints(self):
        for ep in ["settings", "stories", "impact", "sponsors"]:
            r = requests.get(f"{BASE_URL}/api/public/{ep}", timeout=30)
            assert r.status_code == 200, f"{ep} -> {r.status_code}"
