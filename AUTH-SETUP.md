# Authentication Setup Guide

## Quick Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Configure Environment Variables**

   Add to your `.env` file:

   ```env
   JWT_SECRET=your-secret-key-change-this-in-production
   ```

3. **Start the Server**
   ```bash
   npm run start:dev
   ```

## New Features

### Authentication System

- **Register**: `POST /auth/register`
- **Login**: `POST /auth/login`
- JWT token with 7-day expiration
- Password hashing with bcrypt

### Transaction Updates

- Added `customerEmail` and `customerPhone` fields
- Optional authentication - supports both logged-in and guest checkout
- User relation tracking for registered users
- Enhanced transaction response with complete customer data

## Database Changes

The `users` table will be automatically created with:

- id (PRIMARY KEY)
- name
- email (UNIQUE)
- phone
- password (hashed)
- createdAt
- updatedAt

The `transactions` table will be updated with:

- userId (FOREIGN KEY to users, nullable)
- customerEmail
- customerPhone

## API Examples

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "081234567890",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create Transaction (with auth)

```bash
curl -X POST http://localhost:3000/payments/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "productId": 1,
    "quantity": 2,
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "081234567890",
    "platform": "web"
  }'
```


## Testing

Run the server and test the endpoints:

```bash
npm run start:dev
```

Then test with your favorite HTTP client (Postman, Thunder Client, curl, etc.)

## Security Notes

- Always use a strong JWT_SECRET in production
- Password are hashed using bcrypt with salt rounds of 10
- JWT tokens expire after 7 days
- Guest checkout is supported for ease of use

For complete API documentation, see [API-DOCUMENTATION.md](./API-DOCUMENTATION.md)
