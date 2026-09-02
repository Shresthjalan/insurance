# Webhook & Agent Integration Reference

This document is the configuration guide for every external system that calls this backend.  
Share this with whoever configures Telenow, Meta Developer Console, or any future channel.

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:5100` |
| Production  | `https://your-domain.com` (replace with your actual domain) |

All endpoints are prefixed with `/api/v1`.

---

## Authentication

### Telenow → Backend

Every Telenow webhook call must include **one** of the following:

| Method | Header | Value |
|--------|--------|-------|
| API Key | `x-api-key` | value of `TELENOW_API_KEY` in your `.env` |
| HMAC Signature | `x-telenow-signature` | `HMAC-SHA256(request body, TELENOW_WEBHOOK_SECRET)` |

Set `TELENOW_API_KEY` in your `.env` and provide the same value to Telenow in their webhook settings.

### WhatsApp (Meta) → Backend

Meta verifies the endpoint with a `GET` challenge first, then sends events via `POST`.  
No extra auth header needed — the backend verifies Meta's `X-Hub-Signature-256` header automatically using `WHATSAPP_APP_SECRET`.

---

## Telenow Webhooks

Telenow calls these three endpoints at specific points in the voice conversation.

---

### 1. Interest Captured

**Call this immediately after the customer confirms which insurance type they want.**  
Do NOT wait to collect insurance-specific details first.

```
POST /api/v1/webhooks/telenow/interest
Content-Type: application/json
x-api-key: <TELENOW_API_KEY>
```

**Request body**

```json
{
  "phone_number": "+919876543210",
  "customer_name": "Rahul Sharma",
  "insurance_type": "car",
  "external_event_id": "telenow-session-abc123"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phone_number` | string | ✅ | E.164 format. Indian numbers: `+91XXXXXXXXXX` |
| `customer_name` | string | ✅ | Full name as spoken |
| `insurance_type` | string | ✅ | One of: `car` `health` `term` `life` |
| `external_event_id` | string | recommended | Your session/call ID — ensures idempotency (safe to retry) |

**Success response** `200`

```json
{
  "success": true,
  "request_id": "REQ-01JXYZ123",
  "event": "interest_captured",
  "lead_id": "LEAD-01JXYZ456",
  "interest_id": "INT-01JXYZ789"
}
```

---

### 2. Quotation Request

**Call this after all insurance-specific fields are collected AND the customer has confirmed.**  
The backend queues processing asynchronously — Telenow does not wait for quotes.

```
POST /api/v1/webhooks/telenow/quotation
Content-Type: application/json
x-api-key: <TELENOW_API_KEY>
```

**Common wrapper (all types)**

```json
{
  "phone_number": "+919876543210",
  "customer_name": "Rahul Sharma",
  "insurance_type": "<car|health|term|life>",
  "quotation_details": { ... },
  "external_event_id": "telenow-session-abc123"
}
```

---

#### 2a. Car Insurance

```json
{
  "phone_number": "+919876543210",
  "customer_name": "Rahul Sharma",
  "insurance_type": "car",
  "quotation_details": {
    "car_status": "existing",
    "vehicle_registration_number": "KA01AB1234",
    "vehicle_make": "Hyundai",
    "vehicle_model": "Creta",
    "vehicle_variant": "SX",
    "fuel_type": "petrol",
    "registration_year": 2022,
    "rto": "Bangalore",
    "policy_new_or_renewal": "renewal",
    "previous_claim": false,
    "ncb_percentage": 50
  }
}
```

| Field | Type | Required | Allowed values |
|-------|------|----------|----------------|
| `car_status` | string | ✅ | `new` `existing` |
| `vehicle_registration_number` | string | if `existing` | e.g. `KA01AB1234` |
| `vehicle_make` | string | ✅ | e.g. `Hyundai` |
| `vehicle_model` | string | ✅ | e.g. `Creta` |
| `vehicle_variant` | string | ❌ | e.g. `SX` |
| `fuel_type` | string | ❌ | `petrol` `diesel` `cng` `electric` `hybrid` |
| `registration_year` | number | ❌ | 4-digit year |
| `rto` | string | ❌ | City/RTO name |
| `policy_new_or_renewal` | string | ❌ | `new` `renewal` |
| `previous_claim` | boolean | ❌ | `true` `false` |
| `ncb_percentage` | number | ❌ | `0` `20` `25` `35` `45` `50` |

---

#### 2b. Health Insurance

```json
{
  "phone_number": "+919876543210",
  "customer_name": "Rahul Sharma",
  "insurance_type": "health",
  "quotation_details": {
    "policy_type": "family",
    "members": [
      { "relationship": "self",    "age": 35, "gender": "male"   },
      { "relationship": "spouse",  "age": 32, "gender": "female" },
      { "relationship": "daughter","age": 6,  "gender": "female" }
    ],
    "city": "Bangalore",
    "sum_insured": 1000000,
    "policy_tenure": 1,
    "pre_existing_disease": false,
    "pre_existing_disease_details": null
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `policy_type` | string | ✅ | `individual` `family` |
| `members` | array | ✅ | At least 1 member. Each has `relationship`, `age` (number), `gender` (`male`/`female`/`other`) |
| `city` | string | ✅ | |
| `sum_insured` | number | ✅ | Amount in INR, e.g. `1000000` for 10 Lakh |
| `policy_tenure` | number | ✅ | `1` `2` `3` (years) |
| `pre_existing_disease` | boolean | ✅ | |
| `pre_existing_disease_details` | string/null | ❌ | Required if `pre_existing_disease` is `true` |

> **Do not** send comma-separated age strings like `"35,32,6"`. Always use the `members` array.

---

#### 2c. Term Insurance

```json
{
  "phone_number": "+919876543210",
  "customer_name": "Rahul Sharma",
  "insurance_type": "term",
  "quotation_details": {
    "date_of_birth": "1994-04-15",
    "gender": "male",
    "annual_income": 1500000,
    "occupation": "software_engineer",
    "smoking_tobacco_status": "non_smoker",
    "desired_sum_assured": 10000000,
    "policy_term": 30
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `date_of_birth` | string | ✅ | Format: `YYYY-MM-DD` |
| `gender` | string | ✅ | `male` `female` `other` |
| `annual_income` | number | ✅ | INR per year |
| `occupation` | string | ✅ | Free text or: `salaried` `self_employed` `software_engineer` `doctor` `lawyer` |
| `smoking_tobacco_status` | string | ✅ | `smoker` `non_smoker` |
| `desired_sum_assured` | number | ✅ | INR |
| `policy_term` | number | ✅ | Years, e.g. `30` |

---

#### 2d. Life Insurance

```json
{
  "phone_number": "+919876543210",
  "customer_name": "Rahul Sharma",
  "insurance_type": "life",
  "quotation_details": {
    "product_objective": "savings",
    "date_of_birth": "1994-04-15",
    "gender": "male",
    "annual_income": 1500000,
    "smoking_tobacco_status": "non_smoker",
    "desired_sum_assured": 5000000,
    "policy_term": 20,
    "premium_payment_term": 15,
    "premium_payment_frequency": "yearly"
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `product_objective` | string | ✅ | `savings` `wealth` `retirement` `protection` |
| `date_of_birth` | string | ✅ | Format: `YYYY-MM-DD` |
| `gender` | string | ✅ | `male` `female` `other` |
| `annual_income` | number | ✅ | INR per year |
| `smoking_tobacco_status` | string | ✅ | `smoker` `non_smoker` |
| `desired_sum_assured` | number | ✅ | INR |
| `policy_term` | number | ✅ | Years |
| `premium_payment_term` | number | ✅ | Years (must be ≤ `policy_term`) |
| `premium_payment_frequency` | string | ✅ | `yearly` `half_yearly` `quarterly` `monthly` |

---

#### Quotation Success Response `200`

```json
{
  "success": true,
  "request_id": "REQ-01JXYZ123",
  "event": "quotation_received",
  "quotation_id": "QTREQ-01JXYZ456",
  "quotation_status": "queued"
}
```

Telenow receives this immediately. Quote results are delivered to the customer via WhatsApp asynchronously.

---

### 3. Advisor Call Request

**Call this after the customer agrees to speak with an advisor and provides date + time.**

```
POST /api/v1/webhooks/telenow/advisor-call
Content-Type: application/json
x-api-key: <TELENOW_API_KEY>
```

**Request body**

```json
{
  "phone_number": "+919876543210",
  "customer_name": "Rahul Sharma",
  "insurance_type": "car",
  "meeting_requested": true,
  "meeting_date": "2026-09-05",
  "meeting_time": "15:00",
  "timezone": "Asia/Kolkata",
  "notes": "Customer prefers a Hindi-speaking advisor",
  "external_event_id": "telenow-session-abc123"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phone_number` | string | ✅ | |
| `customer_name` | string | ✅ | |
| `insurance_type` | string | ✅ | `car` `health` `term` `life` |
| `meeting_requested` | boolean | ✅ | If `false`, backend skips creating an appointment |
| `meeting_date` | string | ✅ | Format: `YYYY-MM-DD`. Must not be in the past |
| `meeting_time` | string | ✅ | Format: `HH:MM` (24-hour) |
| `timezone` | string | ✅ | IANA timezone, e.g. `Asia/Kolkata` |
| `notes` | string | ❌ | Any special instructions |
| `external_event_id` | string | recommended | For idempotency |

**Success response** `200`

```json
{
  "success": true,
  "request_id": "REQ-01JXYZ123",
  "event": "advisor_call_requested",
  "request_id_appt": "APPT-01JXYZ789",
  "status": "requested"
}
```

If `meeting_requested` is `false`:

```json
{
  "success": true,
  "request_id": "REQ-01JXYZ123",
  "event": "advisor_call_requested",
  "request_id_appt": "",
  "status": "skipped"
}
```

---

## WhatsApp Webhook (Meta)

Configure this in the **Meta Developer Console → WhatsApp → Webhooks**.

### Verification (GET)

Meta calls this once when you first save the webhook URL to verify ownership.

```
GET /api/v1/webhooks/whatsapp
  ?hub.mode=subscribe
  &hub.verify_token=<WHATSAPP_VERIFY_TOKEN>
  &hub.challenge=<random_string>
```

The backend checks `hub.verify_token` against `WHATSAPP_VERIFY_TOKEN` in `.env` and responds with `hub.challenge`. No action needed on your side — it works automatically once the env var is set.

### Inbound Events (POST)

```
POST /api/v1/webhooks/whatsapp
Content-Type: application/json
X-Hub-Signature-256: sha256=<hmac_signature>
```

The backend handles all event types from Meta automatically:

| Event type | Handled by backend |
|------------|-------------------|
| Text message | ✅ Routes via conversation state |
| Button reply | ✅ Validates against expected options |
| List selection | ✅ Validates against expected options |
| Interactive NfM reply (form) | ✅ Parsed and validated |
| Document/image/audio | ✅ Logged (processed where applicable) |
| Delivery status (`sent`, `delivered`, `read`) | ✅ Updates message record |

> The backend always responds `200` to Meta immediately, then processes the event asynchronously. This prevents Meta from retrying unnecessarily.

#### Meta Developer Console settings

| Setting | Value |
|---------|-------|
| Webhook URL | `https://your-domain.com/api/v1/webhooks/whatsapp` |
| Verify Token | value of `WHATSAPP_VERIFY_TOKEN` in your `.env` |
| Subscribed fields | `messages` |

---

## Error Responses

All endpoints return this structure on failure:

```json
{
  "success": false,
  "request_id": "REQ-01JXYZ123",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "insurance_type must be one of: car, health, term, life",
    "field": "insurance_type"
  }
}
```

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| `400` | `VALIDATION_ERROR` | Missing or invalid field |
| `401` | `UNAUTHORIZED` | Missing or wrong API key |
| `409` | `CONFLICT` | Duplicate appointment for same slot |
| `422` | `VALIDATION_ERROR` | Schema validation failed |
| `500` | `INTERNAL_ERROR` | Server error (never exposes internals) |

---

## Idempotency

All three Telenow webhooks support `external_event_id`.  
If you send the same `external_event_id` twice (e.g. retry after a timeout), the backend returns the original result without creating duplicate records.

**Recommendation:** Use Telenow's call/session ID as `external_event_id`.

---

## Telenow — Recommended Call Sequence

```
Voice call starts
      │
      ▼
Collect: name, language, insurance_type
      │
      ▼
POST /webhooks/telenow/interest   ← fire immediately after type confirmed
      │
      ▼
Collect: insurance-specific fields (registration, members, DOB, etc.)
      │
      ▼
Customer confirms details
      │
      ▼
POST /webhooks/telenow/quotation  ← backend queues quotes, WhatsApp delivers them
      │
      ▼
Offer advisor call
      │
      ├── Yes → collect date + time
      │              │
      │              ▼
      │         POST /webhooks/telenow/advisor-call
      │
      └── No  → end call
```

---

## Quick Reference

| Endpoint | Caller | When to call |
|----------|--------|-------------|
| `POST /api/v1/webhooks/telenow/interest` | Telenow | Customer picks insurance type |
| `POST /api/v1/webhooks/telenow/quotation` | Telenow | Customer confirms all details |
| `POST /api/v1/webhooks/telenow/advisor-call` | Telenow | Customer agrees to advisor + gives date/time |
| `GET /api/v1/webhooks/whatsapp` | Meta (once) | Webhook verification setup |
| `POST /api/v1/webhooks/whatsapp` | Meta | Every customer message/status event |
