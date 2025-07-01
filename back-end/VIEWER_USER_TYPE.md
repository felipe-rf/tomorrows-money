# Viewer User Type Implementation

## Overview

The Viewer user type (type=2) provides read-only access to assigned user data. This is perfect for:

- Financial advisors reviewing client data
- Accountants during tax season
- Family members monitoring shared finances
- Business partners reviewing company expenses
- Auditors examining financial records

## User Types

- **Regular User (type=0)**: Full access to own data
- **Admin User (type=1)**: Full access to all data
- **Viewer User (type=2)**: Read-only access to assigned user data

## API Changes

### Authentication

```bash
# Register a viewer account
POST /api/auth/register
{
  "name": "John Accountant",
  "email": "john@accounting.com",
  "password": "password123",
  "type": 2,
  "viewable_user_id": 5
}
```

### Permissions

- **Read Operations**: Viewers can read assigned user's data
- **Write Operations**: All POST/PUT/DELETE requests return 403 Forbidden
- **Data Access**: Restricted to `viewable_user_id` data only

### Error Responses

```json
{
  "error": "Viewer accounts have read-only access. Contact an administrator for write permissions."
}
```

## Database Changes

### New Field

- `viewable_user_id` (INTEGER, NULL): References which user's data a viewer can access

### Migration

```sql
ALTER TABLE users
ADD COLUMN viewable_user_id INTEGER NULL
REFERENCES users(id) ON DELETE SET NULL;
```

## Usage Examples

### Admin Creating Viewer Account

```bash
POST /api/users
Authorization: Bearer <admin-token>
{
  "name": "Financial Advisor",
  "email": "advisor@company.com",
  "password": "secure123",
  "type": "viewer",
  "viewable_user_id": 15
}
```

### Viewer Accessing Data

```bash
# Can read transactions
GET /api/transactions
Authorization: Bearer <viewer-token>

# Cannot create transactions
POST /api/transactions
Authorization: Bearer <viewer-token>
# Returns: 403 Forbidden
```

### Admin Assigning Viewer to User

```bash
PUT /api/users/25
Authorization: Bearer <admin-token>
{
  "viewable_user_id": 30
}
```

## Security Features

1. **Read-Only Access**: All write operations blocked at middleware level
2. **Data Isolation**: Can only see assigned user's data
3. **Secure Assignment**: Only admins can assign viewers to users
4. **Self-Profile**: Viewers can update their own basic profile info

## Implementation Files Modified

1. `swagger.yaml` - Updated API documentation
2. `User.js` - Added viewable_user_id field
3. `permissionsMiddleware.js` - New write permission checks
4. `*Controller.js` - Updated buildUserFilter methods
5. `mainRoutes.js` - Added write permission middleware
6. `authController.js` - Support for viewer registration

## Testing

### Test Viewer Permissions

```bash
# Should work (read operations)
GET /api/transactions
GET /api/goals
GET /api/categories

# Should fail with 403 (write operations)
POST /api/transactions
PUT /api/goals/1
DELETE /api/categories/5
```

### Test Data Access

```bash
# Viewer should only see viewable_user_id data
GET /api/transactions
# Returns only transactions from assigned user

GET /api/users/me
# Returns viewer's own profile

GET /api/users/other-id
# Returns 403 if not assigned user
```
