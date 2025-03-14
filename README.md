# Rating Game API

Hópverkefni 1 í Vefforritun 2 (Háskóli Íslands, 2025)

---

## 🚀 Uppsetning verkefnis

**Skref fyrir skref** til að setja upp verkefnið:

### 1. Afrita repository

```bash
git clone <REPO_URL>
cd <repo_nafn>
npm install
```

### 2. Umhverfisbreytur

Útbúið `.env` skrá með eftirfarandi gögnum:

```env
DATABASE_URL="postgres://user:pass@host:5432/database"
JWT_SECRET="öruggt-jwt-lykilorð"
CLOUDINARY_CLOUD_NAME="cloudinary-nafn"
CLOUDINARY_API_KEY="cloudinary-api-lykil"
CLOUDINARY_API_SECRET="cloudinary-leyndarlykilorð"
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
- **Lykilorð:** `admin123!` (Athugaðu að skipta þessu lykilorði út fyrir öruggara í production!)

---

## 👥 Hópameðlimir

| Nafn                     | GitHub Notandanafn   |
|--------------------------|----------------------|
| Kristófer Birgir         | kristoferbirgir      |
| *(Bættu við fleiri hér)* |                       |

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

