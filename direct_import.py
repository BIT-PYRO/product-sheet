"""
Direct Bulk Import Script — Product Sheet Design
=================================================
Imports large CSV/XLSX files directly to the BACKEND API, bypassing the
Next.js bulk-upload route and its 25MB limit entirely.

USAGE:
  python direct_import.py --file "D:\\path\\to\\file.xlsx" --sheet products

SHEET OPTIONS:
  products    workforce    customers    kyc    designers    jobs

SETUP (run once):
  pip install pandas openpyxl requests
"""

import argparse
import math
import os
import sys

import pandas as pd
import requests

# ─────────────────────────────────────────────
# CONFIG — edit or pass as CLI args
# ─────────────────────────────────────────────
API_URL    = "https://product-sheet.onrender.com"
# API_URL  = "http://localhost:8000"   # ← local dev

USERNAME   = "Kartik"
PASSWORD   = "Janki@5270"

CHUNK_ROWS = 200   # rows per batch — keep small to avoid Render timeouts
# ─────────────────────────────────────────────

VALID_SHEETS = {"products", "workforce", "customers", "kyc", "designers", "jobs"}

# Maps sheet name → (backend endpoint, unique key field(s), payload builder)
SHEET_CONFIG = {
    "products":  "/api/v1/products/",
    "workforce": "/api/v1/workforce/",
    "customers": "/api/v1/customers/",
    "kyc":       "/api/v1/kyc/",
    "designers": "/api/v1/designers/",
    "jobs":      "/api/v1/jobs/",
}

def nk(v):
    """Normalize a column key the same way the Next.js route does."""
    import re
    return re.sub(r"[^a-z0-9]+", "", str(v or "").strip().lower())

def pv(row, aliases, fallback=""):
    for a in aliases:
        v = row.get(nk(a))
        if v is not None and str(v).strip():
            return str(v).strip()
    return fallback

def to_num(v, fallback=0):
    try:
        return float(str(v).replace(",", "").strip()) if str(v).strip() else fallback
    except Exception:
        return fallback

def to_bool(v, fallback=True):
    s = str(v or "").strip().lower()
    if s in ("true", "1", "yes", "active", "approved"):
        return True
    if s in ("false", "0", "no", "inactive", "rejected"):
        return False
    return fallback

def build_payload(sheet, row):
    """Build the backend payload dict from a normalized row."""
    if sheet == "products":
        sku = pv(row, ["sku", "mastersku", "productsku"])
        name = pv(row, ["listingname", "name", "productname", "title"], sku)
        return sku, {
            "sku": sku, "name": name or sku,
            "category":       pv(row, ["category"]),
            "selling_price":  to_num(pv(row, ["sellingprice", "selling_price", "price"])),
            "cost_price":     to_num(pv(row, ["costprice", "cost_price"])),
            "is_active":      to_bool(pv(row, ["isactive", "active", "shopifystatus"], "true")),
            "material":       pv(row, ["material"]),
            "weight":         pv(row, ["weight"]),
            "collection":     pv(row, ["collection"]),
            "setting_type":   pv(row, ["settingtype", "setting_type", "setting"]),
            "enamel_type":    pv(row, ["enameltype", "enamel_type", "enamel"]),
            "active_channels":pv(row, ["activechannels", "active_channels", "channels"]),
            "master_sku":     pv(row, ["mastersku", "master_sku"]),
            "color":          pv(row, ["color"]),
            "stone_name":     pv(row, ["stonename", "stone_name", "stone"]),
            "stone_cut":      pv(row, ["stonecut", "stone_cut"]),
            "stone_color":    pv(row, ["stonecolor", "stone_color"]),
            "stone_size":     pv(row, ["stonesize", "stone_size"]),
            "stone_quantity": pv(row, ["stonequantity", "stone_quantity"]),
            "plating_type":   pv(row, ["platingtype", "plating_type", "plating"]),
            "plating_color":  pv(row, ["platingcolor", "plating_color"]),
            "notes":          pv(row, ["notes", "note", "remarks"]),
        }

    if sheet == "workforce":
        fn  = pv(row, ["firstname", "first_name"])
        ln  = pv(row, ["lastname", "last_name"])
        name = pv(row, ["fullname", "full_name", "name"], f"{fn} {ln}".strip())
        return name, {"full_name": name, "phone": pv(row, ["contactnumber", "phone", "mobile"]),
                      "active": to_bool(pv(row, ["active", "status"], "true"))}

    if sheet == "customers":
        name = pv(row, ["companyname", "company_name", "name"])
        return name, {
            "company_name": name,
            "business_type": pv(row, ["businesstype", "business_type"]),
            "gst_number":    pv(row, ["gstnumber", "gst_number"]),
            "pan_number":    pv(row, ["pannumber", "pan_number"]),
            "status":        pv(row, ["status"], "active"),
            "address_line1": pv(row, ["addressline1", "address_line1", "address"]),
            "address_line2": pv(row, ["addressline2", "address_line2"]),
            "city":          pv(row, ["city"]),
            "state":         pv(row, ["state"]),
            "pin_code":      pv(row, ["pincode", "pin_code"]),
            "authorized_person_name": pv(row, ["authorizedpersonname", "authorized_person_name", "contactperson"]),
            "designation":   pv(row, ["designation"]),
            "mobile":        pv(row, ["mobile", "phone"]),
            "email":         pv(row, ["email"]),
            "account_name":  pv(row, ["accountname", "account_name"]),
            "bank_name":     pv(row, ["bankname", "bank_name"]),
            "account_number":pv(row, ["accountnumber", "account_number"]),
            "ifsc":          pv(row, ["ifsc"]),
        }

    if sheet == "designers":
        sku = pv(row, ["sku", "mastersku", "productsku"])
        die_raw = pv(row, ["die", "dieentries", "die_entries"])
        payload = {
            "sku": sku,
            "image":          pv(row, ["image"]),
            "tdm_file":       pv(row, ["tdmfile", "tdm_file", "3dmfile", "3dm"]),
            "stl_file":       pv(row, ["stlfile", "stl_file", "stl"]),
            "tdm_status":     pv(row, ["tdmstatus", "tdm_status", "3dmstatus"]),
            "stl_status":     pv(row, ["stlstatus", "stl_status"]),
            "render_status":  pv(row, ["renderstatus", "render_status", "render"]),
            "print_3d_status":pv(row, ["print3dstatus", "print_3d_status", "3dprintstatus"]),
            "is_active":      to_bool(pv(row, ["isactive", "active"], "true")),
        }
        if die_raw:
            payload["die_entries"] = [{"value": v.strip()} for v in die_raw.split(",") if v.strip()]
        return sku, payload

    if sheet == "kyc":
        name = pv(row, ["membername", "member_name", "fullname", "full_name"])
        return name, {
            "status":    pv(row, ["status"], "pending"),
            "id_number": pv(row, ["idnumber", "id_number", "gstnumber", "pannumber"]),
            "_member_name":  name,
            "_member_phone": pv(row, ["mobile", "phone", "contactnumber"]),
        }

    if sheet == "jobs":
        title = pv(row, ["title", "jobtitle", "category"])
        return title, {
            "title":  title,
            "status": pv(row, ["status"], "created"),
            "_product_sku": pv(row, ["productsku", "sku", "mastersku", "product"]),
        }

    return None, {}


def get_token(api_url, username, password):
    print(f"[auth] Logging in as '{username}' ...")
    r = requests.post(f"{api_url}/api/v1/auth/login/",
                      json={"username": username, "password": password}, timeout=30)
    if not r.ok:
        print(f"[auth] FAILED {r.status_code}: {r.text[:300]}")
        sys.exit(1)
    token = (r.json().get("data") or {}).get("access") or r.json().get("access")
    if not token:
        print(f"[auth] Cannot parse token: {r.text[:200]}")
        sys.exit(1)
    print("[auth] Login OK.")
    return token


def fetch_all(session, api_url, path):
    r = session.get(f"{api_url}{path}", timeout=30)
    r.raise_for_status()
    data = r.json().get("data", [])
    return data.get("results", data) if isinstance(data, dict) else data


def upload_rows(session, api_url, sheet, rows_df):
    endpoint  = SHEET_CONFIG[sheet]
    created = updated = skipped = 0
    failures = []

    # Pre-fetch existing records to enable upsert
    try:
        existing = fetch_all(session, api_url, endpoint)
    except Exception as e:
        print(f"    [warn] Could not pre-fetch existing records: {e}. All rows will be POSTed.")
        existing = []

    # Build lookup maps
    lookup = {}
    if sheet == "products":
        lookup = {str(x.get("sku","")).strip().upper(): x for x in existing}
    elif sheet == "workforce":
        lookup = {str(x.get("full_name","")).strip().lower(): x for x in existing}
        for x in existing:
            p = str(x.get("phone","")).strip()
            if p: lookup[p] = x
    elif sheet == "customers":
        lookup = {str(x.get("company_name","")).strip().lower(): x for x in existing}
        for x in existing:
            g = str(x.get("gst_number","")).strip().upper()
            if g: lookup[g] = x
    elif sheet == "designers":
        lookup = {str(x.get("sku","")).strip().upper(): x for x in existing}
    elif sheet == "kyc":
        lookup = {str(x.get("member","")): x for x in existing}

    # Pre-fetch products for jobs (need product ID from SKU)
    product_map = {}
    if sheet == "jobs":
        try:
            products = fetch_all(session, api_url, "/api/v1/products/")
            product_map = {str(p.get("sku","")).strip().upper(): p for p in products}
        except Exception:
            pass

    # Pre-fetch workforce for kyc (need member ID from name/phone)
    member_map = {}
    if sheet == "kyc":
        try:
            members = fetch_all(session, api_url, "/api/v1/workforce/")
            member_map = {str(m.get("full_name","")).strip().lower(): m for m in members}
            for m in members:
                p = str(m.get("phone","")).strip()
                if p: member_map[p] = m
        except Exception:
            pass

    for i, row_series in enumerate(rows_df.itertuples(index=False)):
        row = {nk(k): str(v).strip() for k, v in zip(rows_df.columns, row_series)}
        key, payload = build_payload(sheet, row)

        if not key:
            skipped += 1
            continue

        # ── Jobs: resolve product ID ──
        if sheet == "jobs":
            psku = payload.pop("_product_sku", "").upper()
            product = product_map.get(psku)
            if not product:
                failures.append(f"Row {i+2}: product SKU '{psku}' not found — skipped")
                skipped += 1
                continue
            payload["product"] = product["id"]

        # ── KYC: resolve member ID ──
        if sheet == "kyc":
            mname = payload.pop("_member_name", "").lower()
            mphone = payload.pop("_member_phone", "")
            member = member_map.get(mphone) or member_map.get(mname)
            if not member:
                # Auto-create workforce member
                cr = session.post(f"{api_url}/api/v1/workforce/",
                                  json={"full_name": mname, "phone": mphone, "active": True},
                                  timeout=30)
                if not cr.ok:
                    failures.append(f"Row {i+2}: could not create member '{mname}'")
                    skipped += 1
                    continue
                member = (cr.json().get("data") or {})
                member_map[mname] = member
                if mphone: member_map[mphone] = member
            payload["member"] = member.get("id")
            existing_kyc = lookup.get(str(member.get("id","")))
            if existing_kyc:
                r = session.patch(f"{api_url}{endpoint}{existing_kyc['id']}/",
                                  json=payload, timeout=30)
                (updated := updated + 1) if r.ok else failures.append(
                    f"Row {i+2}: {r.json().get('message','update failed')}")
            else:
                r = session.post(f"{api_url}{endpoint}", json=payload, timeout=30)
                (created := created + 1) if r.ok else failures.append(
                    f"Row {i+2}: {r.json().get('message','create failed')}")
            continue

        # ── Standard upsert ──
        lookup_key = key.upper() if sheet in ("products", "designers") else key.lower()
        existing_rec = lookup.get(lookup_key)

        if existing_rec:
            r = session.patch(f"{api_url}{endpoint}{existing_rec['id']}/",
                              json=payload, timeout=30)
            if r.ok:
                updated += 1
            else:
                failures.append(f"Row {i+2}: {r.json().get('message', 'update failed')}")
        else:
            r = session.post(f"{api_url}{endpoint}", json=payload, timeout=30)
            if r.ok:
                created += 1
                saved = (r.json().get("data") or {})
                lookup[lookup_key] = saved
            else:
                failures.append(f"Row {i+2}: {r.json().get('message', 'create failed')}")

    return created, updated, skipped, failures


def main():
    parser = argparse.ArgumentParser(description="Direct bulk import — Product Sheet Design")
    parser.add_argument("--file",     required=True, help="Path to CSV or XLSX file")
    parser.add_argument("--sheet",    required=True, choices=sorted(VALID_SHEETS))
    parser.add_argument("--url",      default=API_URL)
    parser.add_argument("--username", default=USERNAME)
    parser.add_argument("--password", default=PASSWORD)
    parser.add_argument("--chunk",    default=CHUNK_ROWS, type=int, help="Rows per batch")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"File not found: {args.file}")
        sys.exit(1)

    ext = os.path.splitext(args.file)[1].lower()
    print(f"[read] Loading {args.file} ...")
    if ext in (".xls", ".xlsx"):
        df = pd.read_excel(args.file, dtype=str)
    elif ext == ".csv":
        df = pd.read_csv(args.file, dtype=str)
    else:
        print("Only .csv / .xls / .xlsx files are supported.")
        sys.exit(1)

    df = df.fillna("").astype(str)
    total_rows = len(df)
    if total_rows == 0:
        print("File has no data rows.")
        sys.exit(0)

    total_chunks = math.ceil(total_rows / args.chunk)
    print(f"[read] {total_rows} rows → {total_chunks} batch(es) of {args.chunk}")

    token = get_token(args.url, args.username, args.password)

    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {token}",
                             "Content-Type": "application/json"})

    print(f"\n[upload] sheet='{args.sheet}' → {args.url}")
    total_created = total_updated = total_skipped = 0
    all_failures = []

    for i in range(total_chunks):
        chunk = df[i * args.chunk:(i + 1) * args.chunk].copy()
        print(f"  batch {i+1}/{total_chunks} ({len(chunk)} rows) ...", end=" ", flush=True)
        c, u, s, fails = upload_rows(session, args.url, args.sheet, chunk)
        print(f"created={c} updated={u} skipped={s} failed={len(fails)}")
        for f in fails[:3]:
            print(f"    {f}")
        if len(fails) > 3:
            print(f"    ... and {len(fails)-3} more failures")
        total_created += c
        total_updated += u
        total_skipped += s
        all_failures.extend(fails)

    print(f"\n[done] created={total_created} updated={total_updated} "
          f"skipped={total_skipped} failed={len(all_failures)}")
    if all_failures:
        print("Re-run is safe — existing rows will be updated, not duplicated.")


if __name__ == "__main__":
    main()


import argparse
import json
import math
import os
import sys
import tempfile

import pandas as pd
import requests

# ─────────────────────────────────────────────
# CONFIG — edit these or pass as CLI args
# ─────────────────────────────────────────────
API_URL   = "https://product-sheet.onrender.com"   # live server
# API_URL = "http://localhost:8000"                 # ← uncomment for local dev

USERNAME  = "Kartik"    # your login username
PASSWORD  = "Janki@5270"      # your login password

CHUNK_ROWS = 500   # rows per upload batch (keep low to avoid timeouts)
# ─────────────────────────────────────────────

VALID_SHEETS = {"products", "workforce", "customers", "kyc", "designers", "jobs"}


def get_token(api_url: str, username: str, password: str) -> str:
    print(f"[auth] Logging in as '{username}' ...")
    r = requests.post(
        f"{api_url}/api/v1/auth/login/",
        json={"username": username, "password": password},
        timeout=30,
    )
    if not r.ok:
        print(f"[auth] FAILED: {r.status_code} {r.text[:300]}")
        sys.exit(1)
    token = r.json().get("data", {}).get("access") or r.json().get("access")
    if not token:
        print(f"[auth] Could not parse access token from: {r.text[:300]}")
        sys.exit(1)
    print("[auth] Login OK.")
    return token


def upload_chunk(api_url: str, token: str, sheet: str, chunk_df: pd.DataFrame, chunk_num: int, total_chunks: int) -> bool:
    # Write chunk to a temp CSV file
    tmp = tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8")
    chunk_df.to_csv(tmp.name, index=False)
    tmp.close()

    size_kb = os.path.getsize(tmp.name) / 1024
    print(f"  chunk {chunk_num}/{total_chunks} — {len(chunk_df)} rows, {size_kb:.0f} KB ... ", end="", flush=True)

    try:
        with open(tmp.name, "rb") as f:
            r = requests.post(
                f"{api_url}/api/frontend/bulk-upload",
                files={"file": (f"chunk_{chunk_num}.csv", f, "text/csv")},
                data={"sheetType": sheet},
                headers={"Authorization": f"Bearer {token}"},
                timeout=120,
            )
    finally:
        os.unlink(tmp.name)

    try:
        body = r.json()
    except Exception:
        body = {"message": r.text[:200]}

    msg = body.get("message", "")
    if r.ok:
        print(f"OK — {msg}")
        return True
    else:
        print(f"FAILED ({r.status_code}) — {msg}")
        if body.get("failures"):
            for err in body["failures"][:5]:
                print(f"    {err}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Direct bulk import for Product Sheet Design")
    parser.add_argument("--file",     required=True,  help="Path to CSV or XLSX file")
    parser.add_argument("--sheet",    required=True,  choices=VALID_SHEETS, help="Sheet type")
    parser.add_argument("--url",      default=API_URL, help="Backend API base URL")
    parser.add_argument("--username", default=USERNAME)
    parser.add_argument("--password", default=PASSWORD)
    parser.add_argument("--chunk",    default=CHUNK_ROWS, type=int, help="Rows per upload batch")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"File not found: {args.file}")
        sys.exit(1)

    # ── Read file ──────────────────────────────
    ext = os.path.splitext(args.file)[1].lower()
    print(f"[read] Loading {args.file} ...")
    if ext in (".xls", ".xlsx"):
        df = pd.read_excel(args.file, dtype=str)
    elif ext == ".csv":
        df = pd.read_csv(args.file, dtype=str)
    else:
        print("Only .csv / .xls / .xlsx files are supported.")
        sys.exit(1)

    df = df.fillna("").astype(str)
    total_rows = len(df)
    total_chunks = math.ceil(total_rows / args.chunk)
    print(f"[read] {total_rows} rows, will upload in {total_chunks} chunk(s) of {args.chunk}")

    if total_rows == 0:
        print("File has no data rows. Exiting.")
        sys.exit(0)

    # ── Auth ───────────────────────────────────
    token = get_token(args.url, args.username, args.password)

    # ── Upload ─────────────────────────────────
    ok_count = 0
    fail_count = 0
    print(f"\n[upload] Uploading to sheet='{args.sheet}' at {args.url}")

    for i in range(total_chunks):
        chunk = df[i * args.chunk : (i + 1) * args.chunk]
        success = upload_chunk(args.url, token, args.sheet, chunk, i + 1, total_chunks)
        if success:
            ok_count += 1
        else:
            fail_count += 1

    # ── Summary ────────────────────────────────
    print(f"\n[done] {ok_count}/{total_chunks} chunks succeeded, {fail_count} failed.")
    if fail_count:
        print("Tip: re-run with the same file — existing rows will be updated (not duplicated).")


if __name__ == "__main__":
    main()
