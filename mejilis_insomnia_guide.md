# 🧪 Mejilis API Testing Guide — Insomnia

Complete guide to test the Mejilis (Council) Control System API using Insomnia.

> [!IMPORTANT]
> Make sure the backend server is running on `http://localhost:5000` before testing.

---

## 📋 Setup — Base URL & Environment

In Insomnia, create an environment with:

```json
{
  "base_url": "http://localhost:5000/api",
  "token": "",
  "admin_token": ""
}
```

---

## 🔑 Step 1: Register a User (Consumer)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{ base_url }}/auth/register` |
| **Body** | JSON |

```json
{
  "firstName": "Ahmed",
  "lastName": "Mohammed",
  "email": "ahmed@example.com",
  "password": "Test1234!",
  "phone": "+251911223344",
  "role": "consumer"
}
```

### ✅ Expected Response (201):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "firstName": "Ahmed",
    "lastName": "Mohammed",
    "email": "ahmed@example.com",
    "role": "consumer"
  }
}
```

> [!TIP]
> Copy the `token` value and save it in your Insomnia environment as `token`.

---

## 🔑 Step 2: Register an Admin User

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{ base_url }}/auth/register` |
| **Body** | JSON |

```json
{
  "firstName": "Admin",
  "lastName": "Mejilis",
  "email": "admin@mejilis.gov.et",
  "password": "Admin1234!",
  "phone": "+251900112233",
  "role": "consumer"
}
```

> [!WARNING]
> After registering, you need to manually update the user role to `admin` in MongoDB, since the API only allows `consumer` or `merchant` on registration for security.
>
> **Option A: MongoDB Compass**
> Find the user with email `admin@mejilis.gov.et` and change `role` to `admin`.
>
> **Option B: MongoDB Shell**
> ```
> db.users.updateOne({ email: "admin@mejilis.gov.et" }, { $set: { role: "admin" } })
> ```

Then login as admin:

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{ base_url }}/auth/login` |
| **Body** | JSON |

```json
{
  "email": "admin@mejilis.gov.et",
  "password": "Admin1234!"
}
```

> [!TIP]
> Save the admin token in your Insomnia environment as `admin_token`.

---

## 🏪 Step 3: Register as a Merchant (via Mejilis)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{ base_url }}/mejilis/register-merchant` |
| **Headers** | `Authorization: Bearer {{ token }}` |
| **Body** | JSON |

```json
{
  "businessName": "Addis Halal Meats",
  "businessNameAmharic": "አዲስ ሐላል ስጋ",
  "description": "Premium halal-certified meat and poultry sourced from trusted Ethiopian farms. Fresh, hand-slaughtered, Majlis-verified cuts delivered daily.",
  "businessType": "butcher",
  "businessPhone": "+251911223344",
  "businessEmail": "info@addishalalmeats.com",
  "businessAddress": {
    "street": "Churchill Avenue, Building 12",
    "subcity": "Addis Ketema",
    "city": "Addis Ababa",
    "region": "Addis Ababa"
  },
  "paymentInfo": {
    "bankName": "Commercial Bank of Ethiopia",
    "accountNumber": "1000123456789",
    "accountHolderName": "Ahmed Mohammed",
    "telebirrNumber": "+251911223344"
  },
  "socialMedia": {
    "telegram": "https://t.me/addishalalmeats",
    "facebook": "https://facebook.com/addishalalmeats"
  }
}
```

### ✅ Expected Response (201):
```json
{
  "success": true,
  "message": "Merchant registration submitted! Your profile is pending Mejilis verification.",
  "merchant": {
    "_id": "...",
    "businessName": "Addis Halal Meats",
    "verificationStatus": "pending",
    "slug": "addis-halal-meats"
  }
}
```

---

## 🔍 Step 4: Check Registration Status

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{ base_url }}/mejilis/registration-status` |
| **Headers** | `Authorization: Bearer {{ token }}` |

### ✅ Expected Response (200):
```json
{
  "success": true,
  "isRegistered": true,
  "merchant": {
    "businessName": "Addis Halal Meats",
    "verificationStatus": "pending"
  }
}
```

---

## 📊 Step 5: View Mejilis Dashboard (Admin)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{ base_url }}/mejilis/dashboard` |
| **Headers** | `Authorization: Bearer {{ admin_token }}` |

### ✅ Expected Response (200):
```json
{
  "success": true,
  "stats": {
    "totalMerchants": 1,
    "pendingMerchants": 1,
    "approvedMerchants": 0,
    "rejectedMerchants": 0,
    "suspendedMerchants": 0,
    "totalCertifications": 0,
    "pendingCertifications": 0,
    "approvedCertifications": 0,
    "totalComplaints": 0,
    "totalSessions": 0
  },
  "recentMerchants": [...],
  "pendingMerchantsList": [...]
}
```

---

## ✅ Step 6: Verify/Approve a Merchant (Admin)

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **URL** | `{{ base_url }}/mejilis/merchants/{merchantId}/verify` |
| **Headers** | `Authorization: Bearer {{ admin_token }}` |
| **Body** | JSON |

> [!NOTE]
> Replace `{merchantId}` with the actual `_id` from Step 3 response.

```json
{
  "verificationStatus": "approved",
  "verificationNotes": "Halal compliance verified. All documents checked. Approved by the council."
}
```

### ✅ Expected Response (200):
```json
{
  "success": true,
  "message": "Merchant verification status updated to 'approved'",
  "merchant": {
    "verificationStatus": "approved",
    "verifiedAt": "2026-03-11T..."
  }
}
```

### Other Status Options:
```json
// Reject
{ "verificationStatus": "rejected", "verificationNotes": "Documentation incomplete" }

// Suspend
{ "verificationStatus": "suspended", "verificationNotes": "Halal compliance issue reported" }

// Under Review
{ "verificationStatus": "under_review", "verificationNotes": "Inspection scheduled" }
```

---

## 👥 Step 7: List All Merchants (Admin)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{ base_url }}/mejilis/merchants` |
| **Headers** | `Authorization: Bearer {{ admin_token }}` |

### With Filters:
```
{{ base_url }}/mejilis/merchants?verificationStatus=pending
{{ base_url }}/mejilis/merchants?businessType=butcher
{{ base_url }}/mejilis/merchants?search=Addis
{{ base_url }}/mejilis/merchants?page=1&limit=10
```

---

## 🚨 Step 8: File a Complaint (Consumer)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{ base_url }}/mejilis/complaints` |
| **Headers** | `Authorization: Bearer {{ token }}` |
| **Body** | JSON |

```json
{
  "merchantId": "{merchantId}",
  "category": "halal_violation",
  "subject": "Suspected non-halal ingredients in product",
  "description": "I purchased spice mix from this merchant and found an ingredient that is not halal certified. The product label does not mention this ingredient. I request the council to investigate."
}
```

### ✅ Expected Response (201):
```json
{
  "success": true,
  "message": "Complaint filed successfully",
  "complaint": {
    "category": "halal_violation",
    "status": "submitted",
    "priority": "critical",
    "referenceNumber": "MJC-2026-ABC123"
  }
}
```

### Available Categories:
| Value | Description |
|-------|-------------|
| `halal_violation` | Halal compliance issue (auto-set to critical priority) |
| `quality_issue` | Product quality problem |
| `false_advertising` | Misleading advertising |
| `hygiene_concern` | Hygiene/cleanliness issue |
| `pricing_dispute` | Unfair pricing |
| `delivery_issue` | Delivery problems |
| `customer_service` | Poor customer service |
| `other` | Other issues |

---

## 📋 Step 9: Manage Complaints (Admin)

### View All Complaints:

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{ base_url }}/mejilis/complaints` |
| **Headers** | `Authorization: Bearer {{ admin_token }}` |

### With Status Filter:
```
{{ base_url }}/mejilis/complaints?status=submitted
{{ base_url }}/mejilis/complaints?status=investigating
```

### Update Complaint Status:

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **URL** | `{{ base_url }}/mejilis/complaints/{complaintId}` |
| **Headers** | `Authorization: Bearer {{ admin_token }}` |
| **Body** | JSON |

```json
{
  "status": "resolved",
  "action": "Inspection conducted. Findings showed non-compliant ingredients. Merchant issued warning.",
  "outcome": "merchant_warned"
}
```

### Status Flow:
```
submitted → under_review → investigating → resolved/dismissed/escalated
```

### Outcome Options:
| Value | Description |
|-------|-------------|
| `merchant_warned` | Warning issued |
| `merchant_suspended` | Merchant suspended |
| `merchant_cleared` | Merchant cleared of charges |
| `refund_issued` | Consumer refund processed |
| `no_action` | No further action needed |

---

## 📅 Step 10: Create a Mejilis Session (Admin)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{ base_url }}/mejilis/sessions` |
| **Headers** | `Authorization: Bearer {{ admin_token }}` |
| **Body** | JSON |

```json
{
  "sessionTitle": "March 2026 Monthly Halal Compliance Review",
  "sessionDate": "2026-03-15T09:00:00.000Z",
  "agenda": [
    {
      "topic": "Review pending merchant applications",
      "description": "Review 5 new merchant applications for Halal compliance"
    },
    {
      "topic": "Consumer complaint investigation results",
      "description": "Present findings from recent on-site inspections"
    }
  ]
}
```

### View All Sessions:

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{ base_url }}/mejilis/sessions` |
| **Headers** | `Authorization: Bearer {{ admin_token }}` |

---

## 🌐 Step 11: Public Mejilis Info

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{ base_url }}/mejilis` |
| **Headers** | None (public) |

---

## 📝 Quick Reference — All Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/mejilis` | ❌ | Public | Get Mejilis info |
| `POST` | `/api/mejilis/register-merchant` | ✅ | Any | Register as merchant |
| `GET` | `/api/mejilis/registration-status` | ✅ | Any | Check registration status |
| `POST` | `/api/mejilis/complaints` | ✅ | Any | File a complaint |
| `GET` | `/api/mejilis/dashboard` | ✅ | Admin | Dashboard stats |
| `GET` | `/api/mejilis/merchants` | ✅ | Admin | List merchants |
| `PUT` | `/api/mejilis/merchants/:id/verify` | ✅ | Admin | Verify merchant |
| `GET` | `/api/mejilis/certifications` | ✅ | Admin | List certifications |
| `PUT` | `/api/mejilis/certifications/:id/review` | ✅ | Admin | Review certification |
| `GET` | `/api/mejilis/complaints` | ✅ | Admin | View all complaints |
| `PUT` | `/api/mejilis/complaints/:id` | ✅ | Admin | Update complaint |
| `GET` | `/api/mejilis/sessions` | ✅ | Admin | View sessions |
| `POST` | `/api/mejilis/sessions` | ✅ | Admin | Create session |

---

> [!TIP]
> **Testing Flow:** Register User → Login → Register as Merchant → (Admin) Verify Merchant → Done!
