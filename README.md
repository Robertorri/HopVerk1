# Rating Game API

Hópverkefni 1 í Vefforritun 2 (Háskóli Íslands, 2025)

---

## 🚀 Uppsetning verkefnis

**Skref fyrir skref** til að setja upp verkefnið:

### 1. Afrita repository

```bash
git clone https://github.com/Robertorri/HopVerk1.git
cd HopVerk1
npm install
```

### 2. Umhverfisbreytur

Útbúið `.env` skrá með eftirfarandi gögnum, erum búnir að pusha .env file á git svo breytir ekki 

```env
DATABASE_URL="postgresql://vef2_2025_v2_erzv_user:VjurC0u90Bfz9dngZ4LZw6bxRxzzjrNz@dpg-cuqtnea3esus739srdvg-a.frankfurt-postgres.render.com/vef2_2025_v2_erzv"
CLOUDINARY_CLOUD_NAME=ddekbps8m
CLOUDINARY_API_KEY=638656471273766
CLOUDINARY_API_SECRET=NdrVSDcGGXa82hmV_uUBn9-vdfs
JWT_SECRET=f12fba93a757b212aed38a6b4ec8cb5154e3b265c999127b06a850c8d363d58e
```

### 3. Prisma uppsetning og gagnagrunnur

```bash
npx prisma migrate dev
npx prisma generate
```

### Keyra verkefnið

```bash
npm run dev
```

Verkefnið keyrir á `http://localhost:3000`

---

## 📌 Vefþjónustur (Endpoints)

Eftirfarandi slóðir eru studdar:

- **Auth**
  - `POST /auth/register` - Nýskrá notanda
  - `POST /auth/login` - Innskrá notanda

- **Items**
  - `GET /items` - Ná í öll item með pagination
  - `GET /items/:id` - Ná í eitt item
  - `POST /items` - Búa til item (aðeins admin)
  - `DELETE /items/:id` - Eyða item (aðeins admin)

- **Ratings**
  - `POST /ratings` - Gefa einkunn (authenticated users)

---

## 🛠 Dæmi um köll

**Nýskráning:**
```http
POST /auth/register
{
  "username": "newuser",
  "password": "Test123!"
}
```

**Innskráning**
```http
POST /auth/login
{
  "username": "newuser",
  "password": "Test123!"
}
```

**Búa til item (admin)**
```http
POST /items
Authorization: Bearer <JWT-token>
{
  "prompt": "My new item",
  "file": "https://example.com/my-image.png"
}
```

---

## 🔐 Admin aðgangur

- **Notandanafn:** `admin`  
- **Lykilorð:** `admin123!` 

---

## 👥 Hópameðlimir

| Nafn                     | GitHub Notandanafn   |
|--------------------------|----------------------|
| Kristófer Birgir         | kristoferbirgir      |
| Ari Gunnar               | forriddAri           |
| Róbert Orri              | Robertorri           |
| Benjamín Reynir          | Reynirjr             |

---

## 🛠 Keyra Jest tests

```bash
npm test
```

---

## ✅ CI/CD með GitHub Actions

GitHub Actions keyrir tests og Prisma migrations sjálfkrafa á öllum pull requests.

---

## 🎯 Deployment

- Verkefnið verður að lokum hýst á: [Settu inn hýsingarslóð hér þegar tilbúið]

