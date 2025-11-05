# Products CRUD API

Module ini menyediakan operasi CRUD lengkap untuk tabel products dalam aplikasi vending machine.

## Endpoints

### 1. Create Product

**POST** `/products`

Membuat produk baru.

**Request Body:**

```json
{
  "name": "Coca Cola",
  "description": "Minuman soda segar",
  "price": 5000,
  "stock": 10
}
```

**Response:** `201 Created`

```json
{
  "id": 1,
  "name": "Coca Cola",
  "description": "Minuman soda segar",
  "price": 5000,
  "stock": 10,
  "createdAt": "2025-10-31T10:00:00.000Z",
  "updatedAt": "2025-10-31T10:00:00.000Z"
}
```

### 2. Get All Products

**GET** `/products`

Mendapatkan semua produk.

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "Coca Cola",
    "description": "Minuman soda segar",
    "price": 5000,
    "stock": 10,
    "createdAt": "2025-10-31T10:00:00.000Z",
    "updatedAt": "2025-10-31T10:00:00.000Z"
  }
]
```

### 3. Get Product by ID

**GET** `/products/:id`

Mendapatkan produk berdasarkan ID.

**Response:** `200 OK`

```json
{
  "id": 1,
  "name": "Coca Cola",
  "description": "Minuman soda segar",
  "price": 5000,
  "stock": 10,
  "createdAt": "2025-10-31T10:00:00.000Z",
  "updatedAt": "2025-10-31T10:00:00.000Z"
}
```

**Error Response:** `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "Product with ID 1 not found"
}
```

### 4. Update Product

**PATCH** `/products/:id`

Memperbarui produk berdasarkan ID (partial update).

**Request Body:**

```json
{
  "price": 6000,
  "stock": 15
}
```

**Response:** `200 OK`

```json
{
  "id": 1,
  "name": "Coca Cola",
  "description": "Minuman soda segar",
  "price": 6000,
  "stock": 15,
  "createdAt": "2025-10-31T10:00:00.000Z",
  "updatedAt": "2025-10-31T10:05:00.000Z"
}
```

### 5. Delete Product

**DELETE** `/products/:id`

Menghapus produk berdasarkan ID.

**Response:** `204 No Content`

## Testing

Jalankan test dengan perintah:

```bash
npm test products.service.spec.ts
```

## Struktur File

```
src/products/
├── dto/
│   ├── create-product.dto.ts    # DTO untuk membuat produk
│   └── update-product.dto.ts    # DTO untuk update produk
├── entities/
│   └── product.entity.ts        # Entity Product
├── products.controller.ts       # Controller untuk routing
├── products.service.ts          # Service untuk business logic
├── products.service.spec.ts     # Unit tests
└── products.module.ts           # Module definition
```

## Catatan

- Data saat ini disimpan dalam memory (in-memory storage)
- Untuk production, pertimbangkan menggunakan database (TypeORM, Prisma, dll)
- ID di-generate secara otomatis menggunakan counter
