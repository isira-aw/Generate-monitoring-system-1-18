# User Profile & Device Settings Security Features - Setup Guide

## The Issue You Encountered

The error "You don't have access to this device" occurs when you try to access device settings for a device that hasn't been attached to your user account yet.

### Why This Happens:
1. The device exists in the system (registered via `/register-device` page)
2. You're logged in
3. **BUT** the device hasn't been attached to your account yet
4. The security check `device.getUsers().contains(user)` fails

## How to Fix This - Complete Workflow

### Step 1: Register the Device (One-time setup)
If the device doesn't exist yet, register it first:

1. Go to `/register-device` page (no login required)
2. Fill in:
   - Device ID (e.g., "GEN-001")
   - Device Password (create one, e.g., "mypass123")
   - Device Name (e.g., "Generator 1")
   - Location (e.g., "Building A")
3. Click "Register Device"

### Step 2: Attach Device to Your Account
This is **REQUIRED** before accessing device settings:

1. **Login** to your account
2. Go to `/devices` page
3. Click **"+ Add Device"** button
4. Enter:
   - **Device ID**: The ID you registered (e.g., "GEN-001")
   - **Device Password**: The password you set during registration
5. Click "Add Device"
6. The device will now appear in your devices list

### Step 3: Access Device Settings (with Email Verification)
Now you can securely access settings:

1. From `/devices` page, click **"Settings"** on your device card
2. You'll see a verification modal:
   - Click **"Send Verification Code"**
   - Check your email for a 4-digit code (valid for 10 minutes)
   - Enter the code
   - Click **"Verify Code"**
3. After verification, you can:
   - **Change Device Password** - Updates the password for attaching device
   - **Update Thresholds** - Configure alarm limits for sensors

## Feature 1: User Profile Management

### Access Profile Page
- Navigate to `/profile` (requires login)

### Available Actions:

#### 1. Update Profile Information
- **Full Name**: Change your display name
- **Email**: Update your email address (must be unique)
- **Mobile Number**: Update contact number

#### 2. Change Password
- Enter current password (for security)
- Enter new password (min 6 characters)
- Confirm new password
- Click "Change Password"

## Feature 2: Password Reset Flow

### If You Forget Your Password:

1. Go to `/login` page
2. Click **"Forgot password?"** link
3. Enter your email address
4. Click "Send Verification Code"
5. Check your email for a 4-digit code (valid for 15 minutes)
6. Enter the code and your new password
7. Click "Reset Password"
8. You can now login with your new password

## Email Configuration (For Deployment)

Before the email features work, configure these environment variables:

### For Gmail (Recommended for testing):
```bash
# In application.properties or environment variables
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password  # NOT your regular password!
MAIL_FROM=noreply@your-domain.com
```

### How to Get Gmail App Password:
1. Go to Google Account settings
2. Security → 2-Step Verification (must be enabled)
3. App passwords → Generate new app password
4. Copy the 16-character password
5. Use this as `MAIL_PASSWORD`

### For Other Email Providers:
Update `MAIL_HOST` and `MAIL_PORT` accordingly:
- **Outlook**: smtp.office365.com:587
- **Yahoo**: smtp.mail.yahoo.com:587
- **Custom SMTP**: Your provider's SMTP server

## API Endpoints Reference

### User Profile Endpoints:
- `PUT /api/profile` - Update profile (name, email, mobile)
- `POST /api/profile/change-password` - Change password

### Password Reset Endpoints:
- `POST /api/auth/forgot-password` - Request reset code
- `POST /api/auth/reset-password` - Reset with code

### Device Verification Endpoints:
- `POST /api/devices/{deviceId}/request-verification` - Send OTP
- `POST /api/devices/{deviceId}/verify-code` - Verify OTP
- `PUT /api/devices/{deviceId}/password` - Update device password

## Security Features

✅ **Email Verification Required**: Before accessing device settings
✅ **Time-Limited OTP Codes**:
   - Device settings: 10 minutes
   - Password reset: 15 minutes
✅ **One-Time Use**: Codes are marked as used after verification
✅ **Password Change Protection**: Requires current password
✅ **Device Access Control**: Only attached devices can be configured

## Troubleshooting

### "You don't have access to this device"
**Solution**: Go to `/devices` → Click "+ Add Device" → Enter device ID and password

### "Email not sending"
**Solution**:
1. Check email configuration in `application.properties`
2. Verify SMTP credentials
3. For Gmail, ensure app password is used (not regular password)
4. Check spam folder

### "Invalid or expired verification code"
**Solution**:
1. Codes expire after 10-15 minutes
2. Request a new code
3. Ensure you're entering the most recent code

### "Failed to load device information"
**Solution**:
1. Check if device exists (it should be registered first)
2. Verify device ID is correct

## Complete User Journey Example

### Scenario: New user wants to monitor their generator

1. **Register an account**: `/register` → Enter details → Login
2. **Register the device** (if not done): `/register-device` → Enter GEN-001, password123, etc.
3. **Attach device to account**: `/devices` → "+ Add Device" → GEN-001, password123
4. **View dashboard**: Click "Dashboard" → See real-time telemetry
5. **Configure settings**: Click "Settings" → Verify email → Update password/thresholds
6. **Update profile**: `/profile` → Change name, email, or password

## Notes

- Device password is stored as **plain text** (as per requirements)
- All profile and device endpoints require **authentication** (JWT cookie)
- Dashboard is **public** (no auth required) but settings require verification
- Multiple users can attach the same device (multi-user support)
