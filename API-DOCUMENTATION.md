# API Documentation - Vending Machine Backend

Base URL: `http://localhost:3000`

## Table of Contents

- [Authentication](#authentication)
- [Auth API](#auth-api)
- [Transactions API](#transactions-api)
- [Expert System API](#expert-system-api)
- [Products API](#products-api)
- [Error Handling](#error-handling)

---

## Authentication

API menggunakan JWT (JSON Web Token) untuk authentication. Token dikirim melalui header `Authorization: Bearer <token>`.

### Required Authentication

Endpoint transaksi (`/payments/create`) **memerlukan authentication**. Pengguna harus login terlebih dahulu untuk membuat transaksi.

---

## Auth API

Endpoint untuk registrasi dan login pengguna.

### Base Path: `/auth`

---

### 1. Register

Mendaftarkan pengguna baru.

**Endpoint:** `POST /auth/register`

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "081234567890",
  "password": "password123"
}
```

**Request Fields:**

| Field    | Type   | Required | Description                   |
| -------- | ------ | -------- | ----------------------------- |
| name     | string | Yes      | Nama lengkap pengguna         |
| email    | string | Yes      | Email pengguna (valid email)  |
| phone    | string | Yes      | No. HP pengguna               |
| password | string | Yes      | Password (minimal 6 karakter) |

**Success Response (201 Created):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "081234567890"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (409 Conflict):**

```json
{
  "statusCode": 409,
  "message": "Email already registered",
  "error": "Conflict"
}
```

---

### 2. Login

Login untuk pengguna yang sudah terdaftar.

**Endpoint:** `POST /auth/login`

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Request Fields:**

| Field    | Type   | Required | Description       |
| -------- | ------ | -------- | ----------------- |
| email    | string | Yes      | Email pengguna    |
| password | string | Yes      | Password pengguna |

**Success Response (200 OK):**

```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "081234567890"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

---

## Transactions API

Endpoint untuk mengelola transaksi pembayaran menggunakan Midtrans.

### Base Path: `/payments`

---

### 1. Create Transaction

Membuat transaksi pembayaran baru. **Memerlukan authentication** - pengguna harus login terlebih dahulu.

**Endpoint:** `POST /payments/create`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "productId": 1,
  "quantity": 2,
  "platform": "web"
}
```

**Request Fields:**

| Field     | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| productId | number | Yes      | ID produk yang dibeli          |
| quantity  | number | Yes      | Jumlah produk (min: 1)         |
| platform  | string | No       | Platform ('web' atau 'mobile') |

**Note:** Informasi customer (name, email, phone) diambil dari data user yang sedang login.

**Success Response (200 OK):**

```json
{
  "success": true,
  "orderId": "ORDER-1762344412984-lb5qdwbj5",
  "snapToken": "66e4fa55-fdac-4ef9-91b5-733b97d1b862",
  "snapUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/66e4fa55-fdac-4ef9-91b5-733b97d1b862",
  "grossAmount": 50000,
  "product": {
    "id": 1,
    "nama": "Jamu Kunyit Asam",
    "harga": 25000,
    "gambar": "kunyit-asam.jpg"
  },
  "message": "Transaction created successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Product with ID 1 not found",
  "error": "Bad Request"
}
```

**Error Response (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "No token provided",
  "error": "Unauthorized"
}
```

**Error Response (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
}
```

---

### 2. Check Transaction Status

Mengecek status transaksi dari Midtrans.

**Endpoint:** `GET /payments/status/:orderId`

**URL Parameters:**

| Parameter | Type   | Description        |
| --------- | ------ | ------------------ |
| orderId   | string | Order ID transaksi |

**Example:** `GET /payments/status/ORDER-1762344412984-lb5qdwbj5`

**Success Response (200 OK):**

```json
{
  "orderId": "ORDER-1762344412984-lb5qdwbj5",
  "status": "pending",
  "transactionId": "be4f3e44-d6ee-4355-8c8f-d6a0d8b1d4e5",
  "paymentType": "bank_transfer",
  "grossAmount": 50000,
  "paidAt": null,
  "product": {
    "id": 1,
    "nama": "Jamu Kunyit Asam",
    "deskripsi": "Jamu tradisional...",
    "manfaat": "Meredakan nyeri haid...",
    "harga": 25000,
    "stok": 100,
    "gambar": "kunyit-asam.jpg"
  },
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "081234567890"
  },
  "midtransStatus": {
    "status_code": "201",
    "status_message": "Success, transaction is found",
    "transaction_id": "be4f3e44-d6ee-4355-8c8f-d6a0d8b1d4e5",
    "order_id": "ORDER-1762344412984-lb5qdwbj5",
    "gross_amount": "50000.00",
    "payment_type": "bank_transfer",
    "transaction_time": "2025-11-05 19:03:41",
    "transaction_status": "pending",
    "fraud_status": "accept"
  }
}
```

**Transaction Status Values:**

- `pending` - Menunggu pembayaran
- `success` - Pembayaran berhasil
- `failed` - Pembayaran gagal
- `expired` - Transaksi kadaluarsa
- `cancelled` - Transaksi dibatalkan

---

### 3. Get My Transaction History

Mendapatkan riwayat transaksi user yang sedang login.

**Endpoint:** `GET /payments/my-history`

**Authentication:** Required (Bearer Token)

**Headers:**

```
Authorization: Bearer <token>
```

**Success Response (200 OK):**

```json
[
  {
    "id": 1,
    "orderId": "ORDER-1762344412984-lb5qdwbj5",
    "product": {
      "id": 1,
      "nama": "Jamu Kunyit Asam",
      "harga": 25000,
      "gambar": "kunyit-asam.jpg"
    },
    "quantity": 2,
    "grossAmount": 50000,
    "status": "success",
    "paymentType": "qris",
    "platform": "web",
    "createdAt": "2025-11-05T12:03:41.000Z",
    "paidAt": "2025-11-05T12:15:00.000Z"
  },
  {
    "id": 2,
    "orderId": "ORDER-1762344513124-xyz789abc",
    "product": {
      "id": 2,
      "nama": "Jamu Beras Kencur",
      "harga": 22000,
      "gambar": "beras-kencur.jpg"
    },
    "quantity": 1,
    "grossAmount": 22000,
    "status": "pending",
    "paymentType": null,
    "platform": "mobile",
    "createdAt": "2025-11-06T10:20:15.000Z",
    "paidAt": null
  }
]
```

---

### 4. Get All Transactions

Mendapatkan semua transaksi (untuk admin).

**Endpoint:** `GET /payments/transactions`

**Success Response (200 OK):**

```json
[
  {
    "id": 1,
    "orderId": "ORDER-1762344412984-lb5qdwbj5",
    "productId": 1,
    "userId": 1,
    "quantity": 2,
    "grossAmount": 50000,
    "status": "pending",
    "paymentType": "bank_transfer",
    "snapToken": "66e4fa55-fdac-4ef9-91b5-733b97d1b862",
    "snapUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/...",
    "transactionId": "be4f3e44-d6ee-4355-8c8f-d6a0d8b1d4e5",
    "platform": "web",
    "createdAt": "2025-11-05T12:03:41.000Z",
    "updatedAt": "2025-11-05T12:03:41.000Z",
    "paidAt": null,
    "product": {
      "id": 1,
      "nama": "Jamu Kunyit Asam",
      "harga": 25000,
      "gambar": "kunyit-asam.jpg"
    },
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "081234567890"
    }
  }
]
```

---

### 5. Get Transaction by Order ID

Mendapatkan detail transaksi berdasarkan Order ID.

**Endpoint:** `GET /payments/transaction/:orderId`

**URL Parameters:**

| Parameter | Type   | Description        |
| --------- | ------ | ------------------ |
| orderId   | string | Order ID transaksi |

**Example:** `GET /payments/transaction/ORDER-1762344412984-lb5qdwbj5`

**Success Response (200 OK):**

```json
{
  "id": 1,
  "orderId": "ORDER-1762344412984-lb5qdwbj5",
  "productId": 1,
  "userId": 1,
  "quantity": 2,
  "grossAmount": 50000,
  "status": "success",
  "paymentType": "qris",
  "transactionId": "be4f3e44-d6ee-4355-8c8f-d6a0d8b1d4e5",
  "platform": "web",
  "paidAt": "2025-11-05T12:15:00.000Z",
  "createdAt": "2025-11-05T12:03:41.000Z",
  "product": {
    "id": 1,
    "nama": "Jamu Kunyit Asam",
    "deskripsi": "Jamu tradisional...",
    "harga": 25000
  },
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "081234567890"
  }
}
```

---

### 6. Cancel Transaction

Membatalkan transaksi yang masih pending.

**Endpoint:** `POST /payments/cancel/:orderId`

**URL Parameters:**

| Parameter | Type   | Description        |
| --------- | ------ | ------------------ |
| orderId   | string | Order ID transaksi |

**Example:** `POST /payments/cancel/ORDER-1762344412984-lb5qdwbj5`

**Success Response (200 OK):**

```json
{
  "message": "Transaction cancelled successfully",
  "orderId": "ORDER-1762344412984-lb5qdwbj5"
}
```

**Error Response (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Only pending transactions can be cancelled",
  "error": "Bad Request"
}
```

---

### 7. Midtrans Payment Notification (Webhook)

Endpoint untuk menerima notifikasi pembayaran dari Midtrans.

**Endpoint:** `POST /payments/notification`

> ⚠️ Endpoint ini dipanggil otomatis oleh Midtrans, bukan dari frontend.

**Request Body (from Midtrans):**

```json
{
  "transaction_status": "settlement",
  "status_code": "200",
  "transaction_id": "be4f3e44-d6ee-4355-8c8f-d6a0d8b1d4e5",
  "order_id": "ORDER-1762344412984-lb5qdwbj5",
  "gross_amount": "50000.00",
  "payment_type": "qris",
  "transaction_time": "2025-11-05 19:15:30",
  "fraud_status": "accept",
  "signature_key": "abc123..."
}
```

**Success Response (200 OK):**

```json
{
  "message": "Notification processed successfully",
  "orderId": "ORDER-1762344412984-lb5qdwbj5",
  "status": "success"
}
```

---

## Expert System API

Endpoint untuk sistem pakar rekomendasi produk jamu menggunakan Forward Chaining.

### Base Path: `/expert-system`

---

### 1. Initialize Expert System

Menginisialisasi sistem pakar (memuat data ke memori).

**Endpoint:** `POST /expert-system/initialize`

**Success Response (200 OK):**

```json
{
  "message": "Expert system ready. Questions and symptoms are loaded in memory.",
  "totalQuestions": 10,
  "totalRules": 14
}
```

---

### 2. Start Diagnosis

Memulai proses diagnosis baru dan mendapat pertanyaan pertama.

**Endpoint:** `GET /expert-system/start`

**Success Response (200 OK):**

```json
{
  "isComplete": false,
  "sessionId": "session_1762344412984_abc123def",
  "nextQuestion": {
    "id": "Q1",
    "text": "Apakah Anda mengalami nyeri haid?",
    "options": [
      {
        "id": "Q1_yes",
        "text": "Ya"
      },
      {
        "id": "Q1_no",
        "text": "Tidak"
      }
    ]
  }
}
```

---

### 3. Submit Answer / Diagnose

Mengirim jawaban pengguna dan mendapat pertanyaan berikutnya atau rekomendasi final.

**Endpoint:** `POST /expert-system/diagnose`

**Request Body:**

```json
{
  "questionId": "Q1",
  "selectedOptionId": "Q1_yes",
  "sessionId": "session_1762344412984_abc123def"
}
```

**Request Fields:**

| Field            | Type   | Required | Description                         |
| ---------------- | ------ | -------- | ----------------------------------- |
| questionId       | string | Yes      | ID pertanyaan saat ini              |
| selectedOptionId | string | Yes      | ID opsi yang dipilih                |
| sessionId        | string | Yes      | Session ID dari response sebelumnya |

**Success Response - Next Question (200 OK):**

```json
{
  "isComplete": false,
  "sessionId": "session_1762344412984_abc123def",
  "nextQuestion": {
    "id": "Q2",
    "text": "Apakah Anda mengalami masalah pencernaan (seperti sembelit atau kembung)?",
    "options": [
      {
        "id": "Q2_yes",
        "text": "Ya"
      },
      {
        "id": "Q2_no",
        "text": "Tidak"
      }
    ]
  }
}
```

**Success Response - Final Recommendation (200 OK):**

```json
{
  "isComplete": true,
  "sessionId": "session_1762344412984_abc123def",
  "recommendation": {
    "productId": 1,
    "productName": "Jamu Kunyit Asam",
    "alasan": "Berdasarkan gejala yang Anda alami, sistem AI merekomendasikan Jamu Kunyit Asam karena:\n\n✨ Manfaat Utama:\n- Meredakan nyeri haid secara alami\n- Melancarkan pencernaan\n- Meningkatkan daya tahan tubuh\n\n💡 Tips Pemulihan:\n1. Konsumsi jamu secara teratur 2x sehari\n2. Istirahat yang cukup (8 jam/hari)\n3. Minum air putih minimal 8 gelas\n4. Kompres hangat area perut saat nyeri\n5. Hindari makanan pedas dan berminyak\n\nSemoga lekas membaik! 🌿"
  }
}
```

**Success Response - No Recommendation (200 OK):**

```json
{
  "isComplete": true,
  "sessionId": "session_1762344412984_abc123def",
  "recommendation": {
    "productId": 0,
    "productName": "Tidak Ditemukan",
    "alasan": "Maaf, berdasarkan gejala yang Anda pilih, sistem tidak dapat menemukan rekomendasi produk yang sesuai. Silakan konsultasikan dengan tenaga kesehatan."
  }
}
```

---

### 4. Get All Questions

Mendapatkan semua pertanyaan yang tersedia di sistem.

**Endpoint:** `GET /expert-system/questions`

**Success Response (200 OK):**

```json
[
  {
    "id": "Q1",
    "text": "Apakah Anda mengalami nyeri haid?",
    "symptomCode": "G1",
    "symptomName": "Nyeri Haid"
  },
  {
    "id": "Q2",
    "text": "Apakah Anda mengalami masalah pencernaan (seperti sembelit atau kembung)?",
    "symptomCode": "G2",
    "symptomName": "Gangguan Pencernaan"
  },
  {
    "id": "Q3",
    "text": "Apakah Anda perlu mengontrol kadar gula darah?",
    "symptomCode": "G3",
    "symptomName": "Perlu Kontrol Gula Darah"
  },
  {
    "id": "Q4",
    "text": "Apakah daya tahan tubuh Anda sedang lemah?",
    "symptomCode": "G4",
    "symptomName": "Daya Tahan Tubuh Lemah"
  },
  {
    "id": "Q5",
    "text": "Apakah nafsu makan Anda menurun?",
    "symptomCode": "G5",
    "symptomName": "Nafsu Makan Menurun"
  },
  {
    "id": "Q6",
    "text": "Apakah Anda mengalami batuk atau hidung tersumbat?",
    "symptomCode": "G6",
    "symptomName": "Batuk/Hidung Tersumbat"
  },
  {
    "id": "Q7",
    "text": "Apakah Anda memiliki masalah kesehatan hati (liver)?",
    "symptomCode": "G7",
    "symptomName": "Masalah Liver/Hati"
  },
  {
    "id": "Q8",
    "text": "Apakah Anda butuh perlindungan antioksidan untuk melawan radikal bebas?",
    "symptomCode": "G8",
    "symptomName": "Butuh Antioksidan"
  },
  {
    "id": "Q9",
    "text": "Apakah Anda (pria) merasa stamina menurun?",
    "symptomCode": "G9",
    "symptomName": "Stamina Menurun (Pria)"
  },
  {
    "id": "Q10",
    "text": "Apakah Anda mengalami pegal linu atau nyeri otot pinggang?",
    "symptomCode": "G10",
    "symptomName": "Pegal Linu/Nyeri Otot"
  }
]
```

---

### 5. Get All Rules

Mendapatkan semua aturan inferensi (Knowledge Base).

**Endpoint:** `GET /expert-system/rules`

**Success Response (200 OK):**

```json
[
  {
    "id": "R1",
    "condition": ["G1"],
    "diagnosis": "D1",
    "diagnosisName": "Nyeri Haid"
  },
  {
    "id": "R2",
    "condition": ["G2"],
    "diagnosis": "D2",
    "diagnosisName": "Gangguan Pencernaan"
  },
  {
    "id": "R11",
    "condition": ["D1", "D2", "D3"],
    "productId": 1
  },
  {
    "id": "R12",
    "condition": ["D4", "D5", "D6"],
    "productId": 2
  }
]
```

---

## Products API

Endpoint untuk mengelola data produk jamu.

### Base Path: `/products`

---

### 1. Get All Products

Mendapatkan semua produk yang tersedia.

**Endpoint:** `GET /products`

**Success Response (200 OK):**

```json
[
  {
    "id": 1,
    "nama": "Jamu Kunyit Asam",
    "deskripsi": "Jamu tradisional dari kunyit dan asam jawa untuk kesehatan wanita",
    "manfaat": "Meredakan nyeri haid, melancarkan pencernaan, meningkatkan daya tahan tubuh, membantu mengontrol kadar gula darah",
    "harga": 25000,
    "stok": 100,
    "gambar": "kunyit-asam.jpg",
    "createdAt": "2025-11-05T10:00:00.000Z",
    "updatedAt": "2025-11-05T10:00:00.000Z"
  },
  {
    "id": 2,
    "nama": "Jamu Beras Kencur",
    "deskripsi": "Minuman herbal berbahan beras dan kencur untuk meningkatkan stamina",
    "manfaat": "Meningkatkan daya tahan tubuh, meredakan sakit perut, meningkatkan nafsu makan, mengatasi batuk dan hidung tersumbat",
    "harga": 22000,
    "stok": 100,
    "gambar": "beras-kencur.jpg",
    "createdAt": "2025-11-05T10:00:00.000Z",
    "updatedAt": "2025-11-05T10:00:00.000Z"
  },
  {
    "id": 3,
    "nama": "Sari Temulawak Deli",
    "deskripsi": "Ekstrak temulawak untuk kesehatan liver dan stamina",
    "manfaat": "Menjaga kesehatan hati, meningkatkan nafsu makan, meningkatkan daya tahan tubuh, antioksidan untuk melawan radikal bebas",
    "harga": 28000,
    "stok": 100,
    "gambar": "temulawak.jpg",
    "createdAt": "2025-11-05T10:00:00.000Z",
    "updatedAt": "2025-11-05T10:00:00.000Z"
  },
  {
    "id": 4,
    "nama": "KukuBima TL Herbal Sidomuncul",
    "deskripsi": "Jamu khusus pria untuk menjaga stamina dan vitalitas",
    "manfaat": "Menjaga stamina pria, meredakan pegal linu dan sakit otot pinggang, menjaga kesehatan secara umum",
    "harga": 30000,
    "stok": 100,
    "gambar": "kukubima.jpg",
    "createdAt": "2025-11-05T10:00:00.000Z",
    "updatedAt": "2025-11-05T10:00:00.000Z"
  }
]
```

---

### 2. Get Product by ID

Mendapatkan detail produk berdasarkan ID.

**Endpoint:** `GET /products/:id`

**URL Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | number | ID produk   |

**Example:** `GET /products/1`

**Success Response (200 OK):**

```json
{
  "id": 1,
  "nama": "Jamu Kunyit Asam",
  "deskripsi": "Jamu tradisional dari kunyit dan asam jawa untuk kesehatan wanita",
  "manfaat": "Meredakan nyeri haid, melancarkan pencernaan, meningkatkan daya tahan tubuh, membantu mengontrol kadar gula darah",
  "harga": 25000,
  "stok": 100,
  "gambar": "kunyit-asam.jpg",
  "createdAt": "2025-11-05T10:00:00.000Z",
  "updatedAt": "2025-11-05T10:00:00.000Z"
}
```

**Error Response (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
}
```

---

### 3. Create Product

Membuat produk baru (Admin only).

**Endpoint:** `POST /products`

**Request Body:**

```json
{
  "nama": "Jamu Sirih Merah",
  "deskripsi": "Jamu untuk kesehatan organ kewanitaan",
  "manfaat": "Menjaga kesehatan organ kewanitaan, mengatasi keputihan, meningkatkan daya tahan tubuh",
  "harga": 27000,
  "stok": 50,
  "gambar": "sirih-merah.jpg"
}
```

**Request Fields:**

| Field     | Type   | Required | Description                 |
| --------- | ------ | -------- | --------------------------- |
| nama      | string | Yes      | Nama produk                 |
| deskripsi | string | Yes      | Deskripsi produk            |
| manfaat   | string | Yes      | Manfaat produk              |
| harga     | number | Yes      | Harga produk (dalam Rupiah) |
| stok      | number | Yes      | Jumlah stok                 |
| gambar    | string | No       | URL/nama file gambar        |

**Success Response (201 Created):**

```json
{
  "id": 5,
  "nama": "Jamu Sirih Merah",
  "deskripsi": "Jamu untuk kesehatan organ kewanitaan",
  "manfaat": "Menjaga kesehatan organ kewanitaan, mengatasi keputihan, meningkatkan daya tahan tubuh",
  "harga": 27000,
  "stok": 50,
  "gambar": "sirih-merah.jpg",
  "createdAt": "2025-11-05T12:30:00.000Z",
  "updatedAt": "2025-11-05T12:30:00.000Z"
}
```

---

### 4. Update Product

Mengupdate data produk (Admin only).

**Endpoint:** `PATCH /products/:id`

**URL Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | number | ID produk   |

**Request Body (partial update):**

```json
{
  "harga": 26000,
  "stok": 75
}
```

**Example:** `PATCH /products/1`

**Success Response (200 OK):**

```json
{
  "id": 1,
  "nama": "Jamu Kunyit Asam",
  "deskripsi": "Jamu tradisional dari kunyit dan asam jawa untuk kesehatan wanita",
  "manfaat": "Meredakan nyeri haid, melancarkan pencernaan, meningkatkan daya tahan tubuh, membantu mengontrol kadar gula darah",
  "harga": 26000,
  "stok": 75,
  "gambar": "kunyit-asam.jpg",
  "createdAt": "2025-11-05T10:00:00.000Z",
  "updatedAt": "2025-11-05T12:35:00.000Z"
}
```

---

### 5. Delete Product

Menghapus produk (Admin only).

**Endpoint:** `DELETE /products/:id`

**URL Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | number | ID produk   |

**Example:** `DELETE /products/5`

**Success Response (200 OK):**

```json
{
  "message": "Product deleted successfully"
}
```

**Error Response (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
}
```

---

## Error Handling

### Standard Error Response Format

Semua error mengikuti format standar NestJS:

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request"
}
```

### HTTP Status Codes

| Code | Description                          |
| ---- | ------------------------------------ |
| 200  | OK - Request berhasil                |
| 201  | Created - Resource berhasil dibuat   |
| 400  | Bad Request - Request tidak valid    |
| 404  | Not Found - Resource tidak ditemukan |
| 500  | Internal Server Error - Server error |

### Common Error Messages

**Product Not Found:**

```json
{
  "statusCode": 404,
  "message": "Product with ID 1 not found",
  "error": "Not Found"
}
```

**Insufficient Stock:**

```json
{
  "statusCode": 400,
  "message": "Insufficient stock. Available: 10, Requested: 20",
  "error": "Bad Request"
}
```

**Invalid Product Price:**

```json
{
  "statusCode": 400,
  "message": "Invalid product price",
  "error": "Bad Request"
}
```

**Session Not Found:**

```json
{
  "statusCode": 404,
  "message": "Session not found. Please start over.",
  "error": "Not Found"
}
```

**Midtrans API Error:**

```json
{
  "statusCode": 400,
  "message": "Midtrans API Error",
  "errors": [
    "transaction_details.gross_amount must be greater than or equal to 0.01"
  ],
  "error": "Bad Request"
}
```

---

## Testing dengan Postman/Thunder Client

### Import Collection

1. Buat collection baru di Postman
2. Import semua endpoint di atas
3. Set base URL sebagai variable: `{{baseUrl}} = http://localhost:3000`

### Test Flow - Complete User Journey

#### Flow A: With Authentication (Logged In User)

##### 1. Register User

```http
POST {{baseUrl}}/auth/register
Body: {
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "081234567890",
  "password": "password123"
}
```

##### 2. Login (or use token from register response)

```http
POST {{baseUrl}}/auth/login
Body: {
  "email": "john@example.com",
  "password": "password123"
}
```

Save the token from the response.

##### 3. Browse Products

```http
GET {{baseUrl}}/products
```

##### 4. Start Diagnosis

```http
GET {{baseUrl}}/expert-system/start
```

##### 5. Answer Questions (repeat until isComplete: true)

```http
POST {{baseUrl}}/expert-system/diagnose
Body: {
  "questionId": "Q1",
  "selectedOptionId": "Q1_yes",
  "sessionId": "session_1762344412984_abc123def"
}
```

##### 6. Create Transaction (with authentication)

```http
POST {{baseUrl}}/payments/create
Headers: {
  "Authorization": "Bearer <your_token_here>"
}
Body: {
  "productId": 1,
  "quantity": 2,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "081234567890",
  "platform": "web"
}
```

##### 7. Check Payment Status

```http
GET {{baseUrl}}/payments/status/ORDER-1762344412984-lb5qdwbj5
```

---

#### Flow B: Guest Checkout (Without Authentication)

##### 1. Browse Products

```http
GET {{baseUrl}}/products
```

##### 2. Start Diagnosis

```http
GET {{baseUrl}}/expert-system/start
```

##### 3. Answer Questions (repeat until isComplete: true)

```http
POST {{baseUrl}}/expert-system/diagnose
Body: {
  "questionId": "Q1",
  "selectedOptionId": "Q1_yes",
  "sessionId": "session_1762344412984_abc123def"
}
```

##### 4. Create Transaction (as guest - no token)

```http
POST {{baseUrl}}/payments/create
Body: {
  "productId": 1,
  "quantity": 2,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "081234567890",
  "platform": "web"
}
```

##### 5. Check Payment Status

```http
GET {{baseUrl}}/payments/status/ORDER-1762344412984-lb5qdwbj5
```

---

## Integration Notes

### Frontend Integration

**React/Next.js Example:**

```typescript
// Create transaction
const response = await fetch('http://localhost:3000/transactions/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 1,
    quantity: 2,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '081234567890',
    platform: 'web',
  }),
});

const data = await response.json();

// Open Midtrans Snap
window.snap.pay(data.snapToken, {
  onSuccess: (result) => {
    console.log('Payment success:', result);
  },
  onPending: (result) => {
    console.log('Payment pending:', result);
  },
  onError: (error) => {
    console.error('Payment error:', error);
  },
  onClose: () => {
    console.log('Payment popup closed');
  },
});
```

### Mobile Integration (React Native)

```typescript
import { WebView } from 'react-native-webview';

// After getting snapUrl from API
<WebView
  source={{ uri: snapUrl }}
  onNavigationStateChange={(navState) => {
    // Handle payment callbacks
    if (navState.url.includes('/payment/success')) {
      // Payment success
    }
  }}
/>
```

---

## Database Schema

### Table: users

| Column    | Type         | Constraints                 |
| --------- | ------------ | --------------------------- |
| id        | INT          | PRIMARY KEY, AUTO_INCREMENT |
| name      | VARCHAR(255) | NOT NULL                    |
| email     | VARCHAR(255) | UNIQUE, NOT NULL            |
| phone     | VARCHAR(50)  | NOT NULL                    |
| password  | VARCHAR(255) | NOT NULL                    |
| createdAt | DATETIME     | NOT NULL                    |
| updatedAt | DATETIME     | NOT NULL                    |

### Table: products

| Column    | Type         | Constraints                 |
| --------- | ------------ | --------------------------- |
| id        | INT          | PRIMARY KEY, AUTO_INCREMENT |
| nama      | VARCHAR(255) | NOT NULL                    |
| deskripsi | TEXT         | NOT NULL                    |
| manfaat   | TEXT         | NOT NULL                    |
| harga     | INT          | NOT NULL                    |
| stok      | INT          | NOT NULL                    |
| gambar    | VARCHAR(255) | NULLABLE                    |
| createdAt | DATETIME     | NOT NULL                    |
| updatedAt | DATETIME     | NOT NULL                    |

### Table: transactions

| Column           | Type         | Constraints                                            |
| ---------------- | ------------ | ------------------------------------------------------ |
| id               | INT          | PRIMARY KEY, AUTO_INCREMENT                            |
| orderId          | VARCHAR(255) | UNIQUE, NOT NULL                                       |
| productId        | INT          | FOREIGN KEY → products.id                              |
| userId           | INT          | FOREIGN KEY → users.id, NULLABLE                       |
| quantity         | INT          | NOT NULL                                               |
| grossAmount      | INT          | NOT NULL                                               |
| status           | ENUM         | 'pending', 'success', 'failed', 'expired', 'cancelled' |
| paymentType      | VARCHAR(50)  | NULLABLE                                               |
| snapToken        | VARCHAR(255) | NULLABLE                                               |
| snapUrl          | TEXT         | NULLABLE                                               |
| transactionId    | VARCHAR(255) | NULLABLE                                               |
| customerName     | VARCHAR(255) | NULLABLE                                               |
| customerEmail    | VARCHAR(255) | NULLABLE                                               |
| customerPhone    | VARCHAR(50)  | NULLABLE                                               |
| platform         | VARCHAR(20)  | NULLABLE                                               |
| midtransResponse | TEXT         | NULLABLE                                               |
| createdAt        | DATETIME     | NOT NULL                                               |
| updatedAt        | DATETIME     | NOT NULL                                               |
| paidAt           | DATETIME     | NULLABLE                                               |

---

## Environment Variables

Required environment variables in `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=vending_machine

# JWT Authentication
JWT_SECRET=your-jwt-secret-key-change-this-in-production

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Midtrans
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_MERCHANT_ID=your_merchant_id

# Frontend
FRONTEND_URL=http://localhost:3001
```

---

## Support

Untuk pertanyaan atau issue, silakan hubungi tim development.

**API Version:** 1.0.0  
**Last Updated:** November 5, 2025
