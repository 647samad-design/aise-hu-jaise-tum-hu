"""JeetoPrizes - FastAPI backend (single file, easy to deploy)."""
import os, re, math, hmac, hashlib, secrets, json, random, statistics
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import jwt, httpx
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Header
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import (create_engine, Column, Integer, String, DateTime, Boolean,
                        ForeignKey, Text, UniqueConstraint, func)
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# ---------------------------------------------------------------- config
SECRET = os.getenv("SECRET_KEY", "dev-secret-change-me")
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").lower()
AUTO_APPROVE = os.getenv("AUTO_APPROVE_PAYMENTS", "false").lower() == "true"  # demo/testing only
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
ATTEMPTS_PER_ENTRY = int(os.getenv("ATTEMPTS_PER_ENTRY", "3"))
GAME_SECONDS = int(os.getenv("GAME_SECONDS", "20"))
DRAW_MODE = os.getenv("DRAW_MODE", "random")  # "random" = lucky draw among Top 20, "top" = rank #1 wins (pure skill)
MAX_TAPS_PER_SEC = 14
MIN_TAP_GAP_MS = 30
GRACE_MS = 150     # network/latency tolerance when matching a tap to a mole
HOLES = 12
HIT_R = 13.0       # catch game: hit radius in %-of-width units
ASPECT = 4 / 3     # catch field height / width
GAMES = ("mole", "catch")
CONTACT = {"email": os.getenv("CONTACT_EMAIL", ""), "whatsapp": os.getenv("WHATSAPP_NUMBER", ""),
           "company": os.getenv("COMPANY_NAME", "JeetoPrizes")}
PAY = {"jazzcash": os.getenv("JAZZCASH_NUMBER", ""), "easypaisa": os.getenv("EASYPAISA_NUMBER", ""),
       "account_name": os.getenv("PAY_ACCOUNT_NAME", "")}

engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(d):
    return d.isoformat() + "Z" if d else None


# ---------------------------------------------------------------- models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(40))
    email = Column(String(120), unique=True, index=True)
    pw = Column(String(200))
    is_admin = Column(Boolean, default=False)
    banned = Column(Boolean, default=False)
    ref_code = Column(String(12), unique=True)
    referred_by = Column(Integer, nullable=True)
    referral_count = Column(Integer, default=0)
    bonus_attempts = Column(Integer, default=0)
    phone = Column(String(15), unique=True, nullable=True)
    city = Column(String(40), default="")
    profile_done = Column(Boolean, default=False)
    accepted_at = Column(DateTime, nullable=True)
    ref_credited = Column(Boolean, default=False)
    created = Column(DateTime, default=now)


class Contest(Base):
    __tablename__ = "contests"
    id = Column(Integer, primary_key=True)
    title = Column(String(80))
    prize_text = Column(String(80))
    emoji = Column(String(8), default="🏆")
    image_url = Column(String(300), default="")
    fee = Column(Integer)
    attempts = Column(Integer, default=ATTEMPTS_PER_ENTRY)
    start = Column(DateTime)
    end = Column(DateTime)
    drawn = Column(Boolean, default=False)
    seed = Column(String(64))          # secret until draw
    seed_commit = Column(String(64))   # sha256(seed), public from day one
    winner_id = Column(Integer, nullable=True)
    proof = Column(Text, default="")
    prize_status = Column(String(12), default="pending")  # pending / sent / claimed
    game_type = Column(String(12), default="mole")


class Entry(Base):
    __tablename__ = "entries"
    __table_args__ = (UniqueConstraint("user_id", "contest_id"),)
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    contest_id = Column(Integer, ForeignKey("contests.id"))
    attempts_left = Column(Integer, default=0)
    attempts_used = Column(Integer, default=0)
    best_score = Column(Integer, default=0)
    best_at = Column(DateTime, default=now)
    flagged = Column(Boolean, default=False)
    flag_reason = Column(String(120), default="")


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    contest_id = Column(Integer, ForeignKey("contests.id"))
    method = Column(String(20))
    txn_id = Column(String(60), unique=True)
    amount = Column(Integer)
    status = Column(String(12), default="pending")  # pending / approved / rejected
    created = Column(DateTime, default=now)


class GameSession(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True)
    token = Column(String(40), unique=True)
    user_id = Column(Integer)
    contest_id = Column(Integer)
    started = Column(DateTime, default=now)
    used = Column(Boolean, default=False)
    schedule = Column(Text, default="[]")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True)
    text = Column(String(200))
    read = Column(Boolean, default=False)
    created = Column(DateTime, default=now)


# ---------------------------------------------------------------- helpers
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_pw(pw: str) -> str:
    salt = secrets.token_bytes(16)
    return salt.hex() + "$" + hashlib.scrypt(pw.encode(), salt=salt, n=2 ** 14, r=8, p=1).hex()


def check_pw(pw: str, stored: str) -> bool:
    try:
        salt, h = stored.split("$")
        return hmac.compare_digest(hashlib.scrypt(pw.encode(), salt=bytes.fromhex(salt), n=2 ** 14, r=8, p=1).hex(), h)
    except Exception:
        return False


def make_token(uid: int) -> str:
    return jwt.encode({"sub": str(uid), "exp": now() + timedelta(days=30)}, SECRET, "HS256")


def user_or_none(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        uid = int(jwt.decode(authorization[7:], SECRET, ["HS256"])["sub"])
    except Exception:
        return None
    u = db.get(User, uid)
    return u if u and not u.banned else None


def auth(u=Depends(user_or_none)):
    if not u:
        raise HTTPException(401, "Please sign in")
    return u


def admin(u=Depends(auth)):
    if not u.is_admin:
        raise HTTPException(403, "Admin only")
    return u


def notify(db, uid, text):
    db.add(Notification(user_id=uid, text=text))


def normalize_phone(raw: str) -> str:
    p = re.sub(r"[\s\-()]", "", raw or "")
    if p.startswith("+92"): p = "0" + p[3:]
    elif p.startswith("0092"): p = "0" + p[4:]
    elif p.startswith("92") and len(p) == 12: p = "0" + p[2:]
    if not re.fullmatch(r"03\d{9}", p):
        raise HTTPException(400, "Enter a valid mobile number like 03XXXXXXXXX")
    return p


def player(u: User = Depends(auth)):
    if not u.profile_done:
        raise HTTPException(403, "Please complete your registration first")
    return u


def gen_schedule(total_ms: int):
    """Server-made mole schedule. Gets faster and denser over time; bombs and golden moles appear."""
    rnd = random.SystemRandom()
    out, t, last = [], 900, -1
    while t < total_ms - 600:
        dur = int(max(420, 1000 - t * 0.04))
        r = rnd.random()
        kind, pts, d = "mole", 1, dur
        if t > 3000 and r < 0.18: kind, pts, d = "bomb", 0, int(dur * 1.2)
        elif r < 0.30: kind, pts, d = "gold", 3, int(dur * 0.7)
        h = rnd.randrange(HOLES)
        while h == last: h = rnd.randrange(HOLES)
        last = h
        out.append({"t": t, "h": h, "dur": d, "k": kind, "pts": pts})
        t += int(max(300, 800 - t * 0.03) * rnd.uniform(0.8, 1.2))
    return out


def score_taps(schedule, taps):
    used, score, hits, misses, bombs, react = set(), 0, 0, 0, 0, []
    for tp in taps:
        found = next((i for i, sp in enumerate(schedule) if i not in used and sp["h"] == tp.h
                      and sp["t"] <= tp.t <= sp["t"] + sp["dur"] + GRACE_MS), None)
        if found is None:
            misses += 1; score -= 1; continue
        used.add(found); sp = schedule[found]
        if sp["k"] == "bomb": bombs += 1; score -= 3
        else: hits += 1; score += sp["pts"]; react.append(tp.t - sp["t"])
    return max(score, 0), hits, misses, bombs, react


def gen_catch(total_ms: int):
    """Objects fall from the top. Faster, denser and wobblier over time; gems +3, bombs -3."""
    rnd = random.SystemRandom()
    out, t = [], 700
    while t < total_ms - 300:
        dur = int(max(1100, 2300 - t * 0.06))
        r = rnd.random()
        k, pts, d = "fruit", 1, dur
        if t > 3000 and r < 0.20: k, pts = "bomb", 0
        elif r < 0.32: k, pts, d = "gold", 3, int(dur * 0.7)
        x = rnd.uniform(12, 88)
        a = 0.0 if t < 5000 else rnd.uniform(0, 9)
        a = max(0.0, min(a, x - 10, 90 - x))
        out.append({"t": t, "x": round(x, 1), "a": round(a, 1), "p": rnd.randint(700, 1400), "dur": d,
                    "k": k, "pts": pts, "e": rnd.randrange(4)})
        t += int(max(280, 720 - t * 0.022) * rnd.uniform(0.7, 1.2))
    return out


def item_pos(it, t):
    return (it["x"] + it["a"] * math.sin(2 * math.pi * (t - it["t"]) / it["p"]),
            -10 + (t - it["t"]) / it["dur"] * 115)


def catch_score(schedule, taps):
    used, score, hits, misses, bombs, react, dist = set(), 0, 0, 0, 0, [], []
    for tp in taps:
        best, bd = None, 1e9
        for i, it in enumerate(schedule):
            if i in used or tp.t < it["t"] or tp.t > it["t"] + it["dur"]: continue
            x, y = item_pos(it, tp.t)
            if y < 0 or y > 100: continue          # not visible yet / already gone
            d = math.hypot(tp.x - x, (tp.y - y) * ASPECT)
            if d <= HIT_R and d < bd: best, bd = i, d
        if best is None:
            misses += 1; score -= 1; continue
        used.add(best); it = schedule[best]
        if it["k"] == "bomb": bombs += 1; score -= 3
        else: hits += 1; score += it["pts"]; react.append(tp.t - it["t"]); dist.append(bd)
    return max(score, 0), hits, misses, bombs, {"react": react, "dist": dist}


def catch_flag(st):
    if len(st["dist"]) < 10: return None
    if statistics.mean(st["dist"]) < 1.0: return "pixel-perfect taps"
    if statistics.pstdev(st["react"]) < 15: return "robotic timing"
    return None


def react_flag(react):
    """Bot-like timing: superhuman or unnaturally uniform reaction times."""
    if len(react) < 10: return None
    if min(react) < 100 or statistics.median(react) < 150: return "superhuman reaction time"
    if statistics.pstdev(react) < 15: return "robotic timing"
    return None


def status_of(c: Contest) -> str:
    t = now()
    if c.drawn: return "drawn"
    if t >= c.end: return "ended"
    if t < c.start: return "upcoming"
    return "live"


def new_ref(db):
    while True:
        code = secrets.token_hex(3).upper()
        if not db.query(User).filter_by(ref_code=code).first():
            return code


def create_user(db, name, email, password, ref=None):
    email = email.strip().lower()
    u = User(name=name.strip()[:40] or email.split("@")[0], email=email, pw=hash_pw(password),
             ref_code=new_ref(db), is_admin=bool(ADMIN_EMAIL and email == ADMIN_EMAIL))
    if ref:
        r = db.query(User).filter_by(ref_code=ref.strip().upper()).first()
        if r:
            u.referred_by = r.id   # bonus is credited when the friend completes registration
    db.add(u); db.commit()
    return u


def top20(db, cid):
    rows = (db.query(Entry, User).join(User, User.id == Entry.user_id)
            .filter(Entry.contest_id == cid, Entry.best_score > 0, Entry.flagged == False, User.banned == False)  # noqa
            .order_by(Entry.best_score.desc(), Entry.best_at.asc()).limit(20).all())
    return [{"rank": i + 1, "user_id": u.id, "name": u.name, "score": e.best_score,
             "attempts_used": e.attempts_used} for i, (e, u) in enumerate(rows)]


def contest_out(db, c):
    w = db.get(User, c.winner_id) if c.winner_id else None
    return {"id": c.id, "title": c.title, "prize": c.prize_text, "emoji": c.emoji, "image_url": c.image_url,
            "fee": c.fee, "game": c.game_type or "mole", "attempts": c.attempts, "start": iso(c.start), "end": iso(c.end),
            "status": status_of(c), "seed_commit": c.seed_commit, "winner": w.name if w else None,
            "prize_status": c.prize_status,
            "participants": db.query(func.count(Entry.id)).filter(Entry.contest_id == c.id).scalar()}


def entry_for(db, uid, cid, create=False):
    e = db.query(Entry).filter_by(user_id=uid, contest_id=cid).first()
    if not e and create:
        e = Entry(user_id=uid, contest_id=cid)
        db.add(e); db.flush()
    return e


class Hub:
    def __init__(self): self.rooms = {}

    async def push(self, cid, data):
        for ws in list(self.rooms.get(cid, ())):
            try: await ws.send_json(data)
            except Exception: self.rooms[cid].discard(ws)


hub = Hub()


# ---------------------------------------------------------------- app
@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    db = SessionLocal()
    if not db.query(Contest).first():
        seed = secrets.token_hex(32)
        db.add(Contest(title="Honda CD 70 Mega Draw", prize_text="Honda CD 70 (2025)", emoji="🏍️", fee=5,
                       start=now(), end=now() + timedelta(days=3), seed=seed,
                       seed_commit=hashlib.sha256(seed.encode()).hexdigest()))
        db.commit()
    db.close()
    yield


app = FastAPI(title="JeetoPrizes", lifespan=lifespan)


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    ref: Optional[str] = None


class LoginIn(BaseModel):
    email: str
    password: str


@app.get("/api/config")
def config():
    return {"google_client_id": GOOGLE_CLIENT_ID, "pay": PAY, "game_seconds": GAME_SECONDS,
            "auto_approve": AUTO_APPROVE, "draw_mode": DRAW_MODE,
            "contact": CONTACT, "google_only": bool(GOOGLE_CLIENT_ID)}


@app.post("/api/auth/register")
def register(b: RegisterIn, db: Session = Depends(get_db)):
    if GOOGLE_CLIENT_ID: raise HTTPException(403, "Please sign in with Google")
    if "@" not in b.email or len(b.password) < 6 or not b.name.strip():
        raise HTTPException(400, "Enter a name, valid email and a password of 6+ characters")
    if db.query(User).filter_by(email=b.email.strip().lower()).first():
        raise HTTPException(409, "This email is already registered")
    u = create_user(db, b.name, b.email, b.password, b.ref)
    return {"token": make_token(u.id)}


@app.post("/api/auth/login")
def login(b: LoginIn, db: Session = Depends(get_db)):
    if GOOGLE_CLIENT_ID: raise HTTPException(403, "Please sign in with Google")
    u = db.query(User).filter_by(email=b.email.strip().lower()).first()
    if not u or not check_pw(b.password, u.pw):
        raise HTTPException(401, "Wrong email or password")
    if u.banned:
        raise HTTPException(403, "This account is suspended")
    if ADMIN_EMAIL and u.email == ADMIN_EMAIL and not u.is_admin:
        u.is_admin = True; db.commit()
    return {"token": make_token(u.id)}


class GoogleIn(BaseModel):
    credential: str
    ref: Optional[str] = None


@app.post("/api/auth/google")
async def google_login(b: GoogleIn, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(400, "Google sign-in is not configured")
    async with httpx.AsyncClient(timeout=10) as c:
        d = (await c.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": b.credential})).json()
    if d.get("aud") != GOOGLE_CLIENT_ID or str(d.get("email_verified")).lower() != "true":
        raise HTTPException(401, "Google sign-in failed")
    u = db.query(User).filter_by(email=d["email"].lower()).first()
    if not u:
        u = create_user(db, d.get("name", ""), d["email"], secrets.token_urlsafe(16), b.ref)
    if u.banned:
        raise HTTPException(403, "This account is suspended")
    if ADMIN_EMAIL and u.email == ADMIN_EMAIL and not u.is_admin:
        u.is_admin = True; db.commit()
    return {"token": make_token(u.id)}


@app.get("/api/me")
def me(u: User = Depends(auth), db: Session = Depends(get_db)):
    unread = db.query(func.count(Notification.id)).filter_by(user_id=u.id, read=False).scalar()
    return {"id": u.id, "name": u.name, "email": u.email, "is_admin": u.is_admin, "ref_code": u.ref_code,
            "bonus_attempts": u.bonus_attempts, "referral_count": u.referral_count, "unread": unread,
            "phone": u.phone, "city": u.city, "profile_done": u.profile_done}


class ProfileIn(BaseModel):
    name: str
    phone: str
    city: str = ""
    age_ok: bool
    terms_ok: bool


@app.post("/api/profile")
def save_profile(b: ProfileIn, u: User = Depends(auth), db: Session = Depends(get_db)):
    if not (b.age_ok and b.terms_ok):
        raise HTTPException(400, "Please confirm you are 18+ and accept the Terms")
    name = b.name.strip()[:40]
    if len(name) < 2: raise HTTPException(400, "Enter your name")
    ph = normalize_phone(b.phone)
    if db.query(User).filter(User.phone == ph, User.id != u.id).first():
        raise HTTPException(409, "This phone number is already registered with another account")
    u.name, u.phone, u.city = name, ph, b.city.strip()[:40]
    if not u.profile_done:
        u.profile_done, u.accepted_at = True, now()
        r = db.get(User, u.referred_by) if u.referred_by else None
        if r and not u.ref_credited and r.referral_count < 10:
            r.referral_count += 1; r.bonus_attempts += 1; u.ref_credited = True
            notify(db, r.id, f"🎉 {name} joined with your code. You got 1 free attempt!")
    db.commit()
    return {"ok": True}


@app.get("/api/contests")
def contests(db: Session = Depends(get_db)):
    return [contest_out(db, c) for c in db.query(Contest).order_by(Contest.id.desc()).limit(12)]


@app.get("/api/contests/active")
def active(u=Depends(user_or_none), db: Session = Depends(get_db)):
    c = (db.query(Contest).filter(Contest.drawn == False, Contest.end > now())  # noqa
         .order_by(Contest.start.asc()).first())
    if not c:
        return {"contest": None}
    out = contest_out(db, c)
    mine = entry_for(db, u.id, c.id) if u else None
    out["me"] = {"attempts_left": mine.attempts_left if mine else 0, "best": mine.best_score if mine else 0,
                 "flagged": mine.flagged if mine else False} if u else None
    return {"contest": out, "leaderboard": top20(db, c.id)}


@app.get("/api/contests/{cid}/leaderboard")
def leaderboard(cid: int, db: Session = Depends(get_db)):
    return top20(db, cid)


@app.get("/api/contests/{cid}/proof")
def proof(cid: int, db: Session = Depends(get_db)):
    c = db.get(Contest, cid)
    if not c: raise HTTPException(404, "Not found")
    if not c.drawn:
        return {"drawn": False, "seed_commit": c.seed_commit}
    p = json.loads(c.proof)
    p.update({"drawn": True, "seed": c.seed, "seed_commit": c.seed_commit,
              "how_to_verify": "sha256(seed) must equal seed_commit. HMAC-SHA256(key=seed, msg=message) as hex, "
                               "as an integer mod number of candidates = winner index."})
    return p


class PayIn(BaseModel):
    method: str
    txn_id: str


@app.post("/api/contests/{cid}/pay")
async def pay(cid: int, b: PayIn, u: User = Depends(player), db: Session = Depends(get_db)):
    c = db.get(Contest, cid)
    if not c or status_of(c) != "live": raise HTTPException(400, "This contest is not open")
    tid = b.txn_id.strip()
    if b.method not in ("jazzcash", "easypaisa") or len(tid) < 6:
        raise HTTPException(400, "Choose a method and enter the transaction ID")
    if db.query(Payment).filter_by(txn_id=tid).first():
        raise HTTPException(409, "This transaction ID was already submitted")
    p = Payment(user_id=u.id, contest_id=cid, method=b.method, txn_id=tid, amount=c.fee)
    db.add(p)
    if AUTO_APPROVE:
        approve(db, p)
    db.commit()
    return {"status": p.status}


def approve(db, p: Payment):
    p.status = "approved"
    e = entry_for(db, p.user_id, p.contest_id, create=True)
    c = db.get(Contest, p.contest_id)
    e.attempts_left += c.attempts
    notify(db, p.user_id, f"✅ Payment confirmed. {c.attempts} attempts added. Good luck!")


@app.post("/api/contests/{cid}/start")
def start_game(cid: int, u: User = Depends(player), db: Session = Depends(get_db)):
    c = db.get(Contest, cid)
    if not c or status_of(c) != "live": raise HTTPException(400, "This contest is not open")
    e = entry_for(db, u.id, cid, create=True)
    if e.flagged: raise HTTPException(403, "Your entry was flagged. Contact support.")
    if e.attempts_left > 0: e.attempts_left -= 1
    elif u.bonus_attempts > 0: u.bonus_attempts -= 1
    else: raise HTTPException(402, "No attempts left. Pay to get more.")
    e.attempts_used += 1
    c_game = c.game_type or "mole"
    sch = gen_catch(GAME_SECONDS * 1000) if c_game == "catch" else gen_schedule(GAME_SECONDS * 1000)
    s = GameSession(token=secrets.token_urlsafe(16), user_id=u.id, contest_id=cid, schedule=json.dumps(sch))
    db.add(s); db.commit()
    return {"session": s.token, "seconds": GAME_SECONDS, "schedule": sch}


class Tap(BaseModel):
    t: int
    h: int = -1
    x: float = 0.0
    y: float = 0.0


class SubmitIn(BaseModel):
    session: str
    taps: List[Tap]


@app.post("/api/game/submit")
async def submit(b: SubmitIn, u: User = Depends(player), db: Session = Depends(get_db)):
    s = db.query(GameSession).filter_by(token=b.session, user_id=u.id).first()
    if not s or s.used: raise HTTPException(400, "Invalid game session")
    s.used = True
    c = db.get(Contest, s.contest_id)
    e = entry_for(db, u.id, c.id, create=True)
    elapsed = (now() - s.started).total_seconds()
    taps = sorted(b.taps, key=lambda x: x.t)
    bad = None
    if elapsed < GAME_SECONDS - 1.5: bad = "finished too fast"
    elif elapsed > GAME_SECONDS + 90: bad = "session expired"
    elif len(taps) > GAME_SECONDS * MAX_TAPS_PER_SEC: bad = "inhuman tap count"
    elif (any(t.t < 0 or t.t > GAME_SECONDS * 1000 + 1500 for t in taps) or
          any((t.x < -5 or t.x > 105 or t.y < -5 or t.y > 105) if c.game_type == "catch" else (t.h < 0 or t.h >= HOLES) for t in taps)):
        bad = "invalid taps"
    elif any(b2.t - a.t < MIN_TAP_GAP_MS for a, b2 in zip(taps, taps[1:])): bad = "inhuman tap speed"
    score = hits = misses = bombs = 0
    if not bad:
        if c.game_type == "catch":
            score, hits, misses, bombs, st = catch_score(json.loads(s.schedule), taps)
            bad = catch_flag(st)
        else:
            score, hits, misses, bombs, react = score_taps(json.loads(s.schedule), taps)
            bad = react_flag(react)
    if bad:
        e.flagged, e.flag_reason = True, bad
        db.commit()
        return {"flagged": True, "message": "Score held for review by our fair-play system."}
    if status_of(c) != "live":
        db.commit()
        return {"score": score, "counted": False, "message": "Contest closed, score not counted."}
    before = [r["user_id"] for r in top20(db, c.id)]
    if score > e.best_score:
        e.best_score, e.best_at = score, now()
    db.flush()
    lb = top20(db, c.id)
    after = [r["user_id"] for r in lb]
    for uid in before:
        if uid not in after:
            notify(db, uid, f"⚠️ You dropped out of the Top 20 in “{c.title}”. Play again to get back in!")
    rank = next((r["rank"] for r in lb if r["user_id"] == u.id), None)
    db.commit()
    await hub.push(c.id, {"lb": lb})
    return {"score": score, "hits": hits, "misses": misses, "bombs": bombs, "best": e.best_score, "rank": rank,
            "in_top20": rank is not None, "attempts_left": e.attempts_left, "counted": True}


@app.get("/api/notifications")
def notifications(u: User = Depends(auth), db: Session = Depends(get_db)):
    rows = db.query(Notification).filter_by(user_id=u.id).order_by(Notification.id.desc()).limit(40).all()
    return [{"id": n.id, "text": n.text, "read": n.read, "at": iso(n.created)} for n in rows]


@app.post("/api/notifications/read")
def mark_read(u: User = Depends(auth), db: Session = Depends(get_db)):
    db.query(Notification).filter_by(user_id=u.id, read=False).update({"read": True}); db.commit()
    return {"ok": True}


@app.websocket("/ws/{cid}")
async def ws_board(ws: WebSocket, cid: int):
    await ws.accept()
    hub.rooms.setdefault(cid, set()).add(ws)
    try:
        db = SessionLocal()
        await ws.send_json({"lb": top20(db, cid)}); db.close()
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        hub.rooms.get(cid, set()).discard(ws)


# ---------------------------------------------------------------- admin
class ContestIn(BaseModel):
    title: str
    prize_text: str
    emoji: str = "🏆"
    image_url: str = ""
    fee: int
    attempts: int = ATTEMPTS_PER_ENTRY
    duration_hours: float = 72
    game_type: str = "mole"


@app.get("/api/admin/stats")
def stats(_=Depends(admin), db: Session = Depends(get_db)):
    return {"users": db.query(func.count(User.id)).scalar(),
            "revenue": db.query(func.coalesce(func.sum(Payment.amount), 0)).filter_by(status="approved").scalar(),
            "pending_payments": db.query(func.count(Payment.id)).filter_by(status="pending").scalar(),
            "flagged": db.query(func.count(Entry.id)).filter_by(flagged=True).scalar(),
            "contests": db.query(func.count(Contest.id)).scalar()}


@app.post("/api/admin/contests")
def create_contest(b: ContestIn, _=Depends(admin), db: Session = Depends(get_db)):
    if b.game_type not in GAMES: raise HTTPException(400, "Unknown game")
    seed = secrets.token_hex(32)
    c = Contest(title=b.title, prize_text=b.prize_text, emoji=b.emoji, image_url=b.image_url, fee=b.fee,
                attempts=b.attempts, game_type=b.game_type, start=now(), end=now() + timedelta(hours=b.duration_hours), seed=seed,
                seed_commit=hashlib.sha256(seed.encode()).hexdigest())
    db.add(c); db.commit()
    return contest_out(db, c)


@app.get("/api/admin/contests")
def admin_contests(_=Depends(admin), db: Session = Depends(get_db)):
    out = []
    for c in db.query(Contest).order_by(Contest.id.desc()).all():
        o = contest_out(db, c)
        o["revenue"] = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter_by(contest_id=c.id, status="approved").scalar()
        w = db.get(User, c.winner_id) if c.winner_id else None
        o["winner_phone"], o["winner_email"] = (w.phone, w.email) if w else (None, None)
        out.append(o)
    return out


@app.post("/api/admin/contests/{cid}/end")
def end_now(cid: int, _=Depends(admin), db: Session = Depends(get_db)):
    c = db.get(Contest, cid)
    if not c or c.drawn: raise HTTPException(400, "Cannot end this contest")
    c.end = now(); db.commit()
    return contest_out(db, c)


@app.post("/api/admin/contests/{cid}/draw")
async def draw(cid: int, _=Depends(admin), db: Session = Depends(get_db)):
    c = db.get(Contest, cid)
    if not c: raise HTTPException(404, "Not found")
    if c.drawn: raise HTTPException(400, "Already drawn")
    if status_of(c) != "ended": raise HTTPException(400, "End the contest first (or wait for the timer)")
    cands = top20(db, cid)
    if not cands: raise HTTPException(400, "No eligible players in the Top 20")
    message = f"contest:{c.id}|" + ",".join(f"{r['user_id']}:{r['score']}" for r in cands)
    digest = hmac.new(c.seed.encode(), message.encode(), hashlib.sha256).hexdigest()
    idx = 0 if DRAW_MODE == "top" else int(digest, 16) % len(cands)
    win = cands[idx]
    c.drawn, c.winner_id = True, win["user_id"]
    c.proof = json.dumps({"candidates": cands, "message": message, "digest": digest, "index": idx,
                          "winner": win["name"]})
    for r in cands:
        notify(db, r["user_id"], f"🏆 {win['name']} won “{c.prize_text}”!" if r["user_id"] != win["user_id"]
               else f"🎉 YOU WON “{c.prize_text}”! We will contact you soon.")
    db.commit()
    await hub.push(cid, {"drawn": True, "winner": win["name"]})
    wu = db.get(User, win["user_id"])
    return {"winner": {**win, "phone": wu.phone, "email": wu.email}, "index": idx, "digest": digest}


class PrizeIn(BaseModel):
    status: str


@app.post("/api/admin/contests/{cid}/prize")
def prize(cid: int, b: PrizeIn, _=Depends(admin), db: Session = Depends(get_db)):
    c = db.get(Contest, cid)
    if not c or b.status not in ("pending", "sent", "claimed"): raise HTTPException(400, "Bad request")
    c.prize_status = b.status; db.commit()
    return {"ok": True}


@app.get("/api/admin/payments")
def payments(status: str = "", _=Depends(admin), db: Session = Depends(get_db)):
    q = db.query(Payment, User, Contest).join(User, User.id == Payment.user_id).join(Contest, Contest.id == Payment.contest_id)
    if status: q = q.filter(Payment.status == status)
    return [{"id": p.id, "user": u.name, "email": u.email, "phone": u.phone, "contest": c.title, "method": p.method,
             "txn_id": p.txn_id, "amount": p.amount, "status": p.status, "at": iso(p.created)}
            for p, u, c in q.order_by(Payment.id.desc()).limit(200)]


class DecideIn(BaseModel):
    approve: bool


@app.post("/api/admin/payments/{pid}")
async def decide(pid: int, b: DecideIn, _=Depends(admin), db: Session = Depends(get_db)):
    p = db.get(Payment, pid)
    if not p or p.status != "pending": raise HTTPException(400, "Already processed")
    if b.approve: approve(db, p)
    else:
        p.status = "rejected"
        notify(db, p.user_id, "❌ We could not verify your payment. Check the transaction ID and try again.")
    db.commit()
    return {"status": p.status}


@app.get("/api/admin/entries/{cid}")
def admin_entries(cid: int, _=Depends(admin), db: Session = Depends(get_db)):
    rows = (db.query(Entry, User).join(User, User.id == Entry.user_id).filter(Entry.contest_id == cid)
            .order_by(Entry.best_score.desc()).all())
    return [{"id": e.id, "user_id": u.id, "name": u.name, "email": u.email, "phone": u.phone, "score": e.best_score,
             "attempts_used": e.attempts_used, "flagged": e.flagged, "reason": e.flag_reason, "banned": u.banned}
            for e, u in rows]


class FlagIn(BaseModel):
    flagged: bool


@app.post("/api/admin/entries/{eid}/flag")
async def flag(eid: int, b: FlagIn, _=Depends(admin), db: Session = Depends(get_db)):
    e = db.get(Entry, eid)
    if not e: raise HTTPException(404, "Not found")
    e.flagged = b.flagged
    e.flag_reason = "removed by admin" if b.flagged else ""
    db.commit()
    await hub.push(e.contest_id, {"lb": top20(db, e.contest_id)})
    return {"ok": True}


@app.post("/api/admin/users/{uid}/ban")
def ban(uid: int, _=Depends(admin), db: Session = Depends(get_db)):
    u = db.get(User, uid)
    if not u or u.is_admin: raise HTTPException(400, "Cannot ban this user")
    u.banned = not u.banned; db.commit()
    return {"banned": u.banned}


# ---------------------------------------------------------------- static / PWA
STATIC = os.path.join(os.path.dirname(__file__), "static")


@app.get("/admin")
def admin_page():
    return FileResponse(os.path.join(STATIC, "admin.html"))


for _p in ("terms", "privacy", "rules"):
    app.add_api_route("/" + _p, (lambda n: (lambda: FileResponse(os.path.join(STATIC, n + ".html"))))(_p), methods=["GET"],
                      include_in_schema=False)

app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")
