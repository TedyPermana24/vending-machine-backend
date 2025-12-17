# Vending Machine Backend API

Backend API untuk sistem vending machine dengan payment gateway Midtrans, role-based access control, dan monitoring MQTT.

## Features

- 🔐 Authentication & Authorization (JWT with roles: USER & ADMIN)
- 💳 Payment Gateway Integration (Midtrans Snap & Core API)
- 🏪 Product Management
- 🤖 Machine Management & Monitoring
- 📊 Transaction History
- 🌡️ Temperature & Humidity Monitoring (MQTT)
- 📱 Real-time Updates (WebSocket)

## Tech Stack

- **Framework**: NestJS
- **Database**: MySQL + TypeORM
- **Authentication**: JWT, bcrypt
- **Payment**: Midtrans
- **Monitoring**: MQTT (Mosquitto)
- **API Docs**: Swagger/OpenAPI

## Base URL

```
http://localhost:3001
```

## Swagger Documentation

```
http://localhost:3001/api-docs
```

---

## 📋 API Testing Guide

### 1️⃣ Authentication

#### Register User (USER Role)

```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "081234567890",
  "password": "password123"
}
```

**Response (201)**:

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "081234567890",
  "role": "USER",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Register Admin (ADMIN Role)

```http
POST /auth/register-admin
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@example.com",
  "phone": "081234567891",
  "password": "admin123"
}
```

**Response (201)**:

```json
{
  "id": 2,
  "name": "Admin User",
  "email": "admin@example.com",
  "phone": "081234567891",
  "role": "ADMIN",
  "createdAt": "2024-01-15T10:35:00.000Z"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200)**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

---

### 2️⃣ Users

#### Get My Profile (Requires Login)

```http
GET /users/profile
Authorization: Bearer <your_token>
```

**Response (200)**:

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "081234567890",
  "role": "USER",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Get All Users (Admin Only)

```http
GET /users
Authorization: Bearer <admin_token>
```

**Response (200)**:

```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "081234567890",
    "role": "USER",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": 2,
    "name": "Admin User",
    "email": "admin@example.com",
    "phone": "081234567891",
    "role": "ADMIN",
    "createdAt": "2024-01-15T10:35:00.000Z"
  }
]
```

#### Get User by ID (Admin Only)

```http
GET /users/1
Authorization: Bearer <admin_token>
```

**Response (200)**:

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "081234567890",
  "role": "USER",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Delete User (Admin Only)

```http
DELETE /users/1
Authorization: Bearer <admin_token>
```

**Response (200)**:

```json
{
  "message": "User deleted successfully"
}
```

---

### 3️⃣ Products

#### Create Product (Admin Only)

```http
POST /products
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Coca Cola",
  "description": "Minuman bersoda segar",
  "price": 5000,
  "stock": 50,
  "category": "Minuman",
  "imageUrl": "https://example.com/coca-cola.jpg"
}
```

**Response (201)**:

```json
{
  "id": 1,
  "name": "Coca Cola",
  "description": "Minuman bersoda segar",
  "price": 5000,
  "stock": 50,
  "category": "Minuman",
  "imageUrl": "https://example.com/coca-cola.jpg",
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

#### Get All Products

```http
GET /products
```

**Response (200)**:

```json
[
  {
    "id": 1,
    "name": "Coca Cola",
    "description": "Minuman bersoda segar",
    "price": 5000,
    "stock": 50,
    "category": "Minuman",
    "imageUrl": "https://example.com/coca-cola.jpg",
    "createdAt": "2024-01-15T11:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Chitato",
    "description": "Snack kentang renyah",
    "price": 8000,
    "stock": 30,
    "category": "Snack",
    "imageUrl": "https://example.com/chitato.jpg",
    "createdAt": "2024-01-15T11:05:00.000Z"
  }
]
```

#### Get Product by ID

```http
GET /products/1
```

**Response (200)**:

```json
{
  "id": 1,
  "name": "Coca Cola",
  "description": "Minuman bersoda segar",
  "price": 5000,
  "stock": 50,
  "category": "Minuman",
  "imageUrl": "https://example.com/coca-cola.jpg",
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

#### Update Product (Admin Only)

```http
PATCH /products/1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "price": 6000,
  "stock": 45
}
```

**Response (200)**:

```json
{
  "id": 1,
  "name": "Coca Cola",
  "description": "Minuman bersoda segar",
  "price": 6000,
  "stock": 45,
  "category": "Minuman",
  "imageUrl": "https://example.com/coca-cola.jpg",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

#### Delete Product (Admin Only)

```http
DELETE /products/1
Authorization: Bearer <admin_token>
```

**Response (200)**:

```json
{
  "message": "Product deleted successfully"
}
```

---

### 4️⃣ Machines

#### Get All Machines

```http
GET /machines
```

**Response (200)**:

```json
[
  {
    "id": 1,
    "code": "VM-001",
    "name": "Vending Machine 1",
    "location": "Gedung A Lantai 1",
    "mqttTopic": "vending/vm001/sensor",
    "status": "ONLINE",
    "currentTemperature": 24.5,
    "currentHumidity": 65.2,
    "lastOnline": "2024-01-15T12:30:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  {
    "id": 2,
    "code": "VM-002",
    "name": "Vending Machine 2",
    "location": "Gedung B Lantai 2",
    "mqttTopic": "vending/vm002/sensor",
    "status": "ONLINE",
    "currentTemperature": 23.8,
    "currentHumidity": 63.5,
    "lastOnline": "2024-01-15T12:29:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]
```

#### Get Online Machines Only

```http
GET /machines/online
```

**Response (200)**:

```json
[
  {
    "id": 1,
    "code": "VM-001",
    "name": "Vending Machine 1",
    "location": "Gedung A Lantai 1",
    "status": "ONLINE"
  }
]
```

#### Get Machine by ID

```http
GET /machines/1
```

**Response (200)**:

```json
{
  "id": 1,
  "code": "VM-001",
  "name": "Vending Machine 1",
  "location": "Gedung A Lantai 1",
  "mqttTopic": "vending/vm001/sensor",
  "status": "ONLINE",
  "currentTemperature": 24.5,
  "currentHumidity": 65.2,
  "lastOnline": "2024-01-15T12:30:00.000Z",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T12:30:00.000Z"
}
```

#### Get Dashboard Stats (Admin Only)

```http
GET /machines/dashboard
Authorization: Bearer <admin_token>
```

**Response (200)**:

```json
{
  "totalMachines": 5,
  "onlineMachines": 4,
  "offlineMachines": 0,
  "maintenanceMachines": 1,
  "averageTemperature": 24.2,
  "averageHumidity": 64.3
}
```

#### Get Temperature History (Admin Only)

```http
GET /machines/1/temperature?limit=10
Authorization: Bearer <admin_token>
```

**Response (200)**:

```json
[
  {
    "id": 45,
    "machineId": 1,
    "temperature": 24.5,
    "humidity": 65.2,
    "createdAt": "2024-01-15T12:30:00.000Z"
  },
  {
    "id": 44,
    "machineId": 1,
    "temperature": 24.3,
    "humidity": 64.8,
    "createdAt": "2024-01-15T12:25:00.000Z"
  }
]
```

---

### 5️⃣ Transactions (Payments)

#### Create Transaction (Requires Login)

```http
POST /payments/create
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "productId": 1,
  "machineId": 1,
  "quantity": 2,
  "platform": "web"
}
```

**Response (201)**:

```json
{
  "orderId": "ORDER-1705318200000",
  "transactionId": "TRX-1705318200000-ABC123",
  "snapToken": "66e4fa55-fdac-4ef9-91b5-733b5d859e21",
  "snapUrl": "https://app.sandbox.midtrans.com/snap/v3/redirection/66e4fa55-fdac-4ef9-91b5-733b5d859e21",
  "grossAmount": 10000,
  "status": "pending"
}
```

#### Midtrans Webhook (Called by Midtrans)

```http
POST /payments/notification
Content-Type: application/json

{
  "transaction_time": "2024-01-15 12:45:00",
  "transaction_status": "settlement",
  "transaction_id": "TRX-1705318200000-ABC123",
  "status_message": "midtrans payment notification",
  "status_code": "200",
  "signature_key": "abc123...",
  "payment_type": "gopay",
  "order_id": "ORDER-1705318200000",
  "merchant_id": "G123456789",
  "gross_amount": "10000.00",
  "fraud_status": "accept",
  "currency": "IDR"
}
```

**Response (200)**:

```json
{
  "message": "OK"
}
```

#### Check Transaction Status

```http
GET /payments/status/ORDER-1705318200000
Authorization: Bearer <user_token>
```

**Response (200)**:

```json
{
  "orderId": "ORDER-1705318200000",
  "transactionStatus": "SUCCESS",
  "paymentType": "gopay",
  "grossAmount": 10000,
  "paidAt": "2024-01-15T12:45:30.000Z"
}
```

#### Get All Transactions (Admin Only)

```http
GET /payments/transactions
Authorization: Bearer <admin_token>
```

**Response (200)**:

```json
[
  {
    "orderId": "ORDER-1705318200000",
    "userId": 1,
    "productId": 1,
    "machineId": 1,
    "quantity": 2,
    "transactionId": "TRX-1705318200000-ABC123",
    "transactionStatus": "SUCCESS",
    "paymentType": "gopay",
    "grossAmount": 10000,
    "paidAt": "2024-01-15T12:45:30.000Z",
    "user": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "product": {
      "name": "Coca Cola",
      "price": 5000
    },
    "machine": {
      "code": "VM-001",
      "name": "Vending Machine 1"
    }
  }
]
```

#### Get My Transaction History (Requires Login)

```http
GET /payments/my-history
Authorization: Bearer <user_token>
```

**Response (200)**:

```json
[
  {
    "orderId": "ORDER-1705318200000",
    "productId": 1,
    "machineId": 1,
    "quantity": 2,
    "transactionStatus": "SUCCESS",
    "paymentType": "gopay",
    "grossAmount": 10000,
    "paidAt": "2024-01-15T12:45:30.000Z",
    "product": {
      "name": "Coca Cola",
      "price": 5000,
      "imageUrl": "https://example.com/coca-cola.jpg"
    },
    "machine": {
      "code": "VM-001",
      "name": "Vending Machine 1",
      "location": "Gedung A Lantai 1"
    }
  }
]
```

#### Get Transaction Detail

```http
GET /payments/transaction/ORDER-1705318200000
Authorization: Bearer <user_token>
```

**Response (200)**:

```json
{
  "orderId": "ORDER-1705318200000",
  "userId": 1,
  "productId": 1,
  "machineId": 1,
  "quantity": 2,
  "transactionId": "TRX-1705318200000-ABC123",
  "status": "pending",
  "transactionStatus": "SUCCESS",
  "paymentType": "gopay",
  "grossAmount": 10000,
  "paidAt": "2024-01-15T12:45:30.000Z",
  "snapToken": "66e4fa55-fdac-4ef9-91b5-733b5d859e21",
  "snapUrl": "https://app.sandbox.midtrans.com/snap/v3/redirection/66e4fa55-fdac-4ef9-91b5-733b5d859e21",
  "platform": "web",
  "createdAt": "2024-01-15T12:43:20.000Z",
  "updatedAt": "2024-01-15T12:45:30.000Z"
}
```

#### Cancel Transaction

```http
POST /payments/cancel/ORDER-1705318200000
Authorization: Bearer <user_token>
```

**Response (200)**:

```json
{
  "message": "Transaction cancelled successfully",
  "orderId": "ORDER-1705318200000",
  "status": "CANCELLED"
}
```

---

## 📝 Important Notes

### HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation error)
- `401` - Unauthorized (not logged in or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `500` - Internal server error

### Roles & Permissions

- **USER**: Can view products, machines, create transactions, view own history
- **ADMIN**: All USER permissions + manage products, view all users/transactions, view machine monitoring

### Transaction Status (transactionStatus)

- `PENDING` - Waiting for payment
- `SUCCESS` - Payment successful, stock updated
- `FAILED` - Payment failed
- `EXPIRED` - Payment timeout
- `CANCELLED` - Cancelled by user

### Payment Types (paymentType)

Midtrans supports: `gopay`, `shopeepay`, `qris`, `bank_transfer`, `echannel`, `bca_klikpay`, `bca_klikbca`, `bri_epay`, `cimb_clicks`, `danamon_online`, `akulaku`

### Machine Status

- `ONLINE` - Machine is operational (can process transactions)
- `OFFLINE` - Machine is not responding
- `MAINTENANCE` - Machine under maintenance (cannot process transactions)

---

## 🧪 Testing Instructions

### Using Postman

1. Import endpoints ke Postman
2. Buat environment variable `base_url` = `http://localhost:3001`
3. Login dan simpan `access_token` ke environment variable
4. Gunakan `{{base_url}}` dan `Bearer {{access_token}}` untuk request berikutnya

### Using Thunder Client (VS Code Extension)

1. Install Thunder Client extension
2. Buat New Request
3. Masukkan URL dan method
4. Untuk endpoint yang perlu auth: Tab "Auth" → Type "Bearer" → Token: `<your_token>`
5. Untuk POST/PATCH: Tab "Body" → JSON → masukkan JSON request

### Test Flow Recommendation

```
1. Register Admin → Login Admin → Create Products & Machines
2. Register User → Login User → View Products
3. Create Transaction → Get Snap URL → Pay (simulate via Midtrans dashboard)
4. Check Transaction Status → View History
5. Admin: View All Transactions → View Dashboard Stats
```

---
