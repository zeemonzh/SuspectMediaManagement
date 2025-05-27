# 🎯 SuspectCheats Management Platform

A comprehensive **TikTok streamer management platform** that tracks live streams, manages payouts, handles product key distribution, and provides detailed analytics for streamers and administrators.

## ✨ Features

### 🔥 **Admin Dashboard**
- **Real-time Stats**: Total streamers, active streams, pending payouts, avg viewers
- **Live Stream Monitoring**: Track active TikTok streams with real-time viewer counts
- **Quick Actions**: Direct access to all management features
- **Recent Activity**: Stream activity feed with duration and viewer info
- **Beautiful Animations**: Smooth hover effects and transitions throughout

### 📺 **Stream Management**
- **Live Stream Tracking**: Real-time monitoring with TikTok Live Connector
- **Session History**: Complete stream session records with filtering and search
- **Admin Notes**: Add administrative notes to stream sessions
- **Automatic Payouts**: AI-calculated payouts based on goals and performance
- **View on TikTok**: Direct links to live streams

### 💰 **Payout System**
- **Goal-Based Payouts**: Automated calculation based on time and viewer goals
- **PayPal Integration**: Direct payment processing with PayPal usernames
- **Status Tracking**: Pending → Approved → Paid workflow
- **Streamer Requests**: Self-service payout requests with PayPal details
- **Admin Approval**: Review and approve/deny payout requests

### 🔐 **Product Key Management**
- **Category-Based Keys**: Organized product key system
- **Request System**: Streamers request keys, admins approve
- **Assignment Tracking**: Track key usage and assignment history
- **Inventory Management**: Bulk key management for admins

### ⚙️ **Admin Settings**
- **Invitation Keys**: Generate registration keys (1-50 at a time)
- **User Management**: View streamers and manage accounts
- **Security Settings**: Session timeout, password requirements, 2FA settings
- **Activity Logs**: Comprehensive audit trail of all platform activities

### 👤 **Streamer Dashboard**
- **Performance Stats**: Total hours, streams, earnings, eligible payouts
- **Goal Tracking**: Visual progress toward streaming goals
- **Product Keys**: View assigned keys and request new ones
- **Payout History**: Track earnings and request payments
- **Responsive Design**: Mobile-friendly interface

### 🎨 **UI/UX Features**
- **Dark Theme**: Professional dark theme with suspect color scheme
- **Smooth Animations**: Hover effects, scaling, color transitions
- **Real-time Updates**: Live data refresh every 30 seconds
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Loading States**: Beautiful loading animations and transitions

## 🛠️ Tech Stack

### **Frontend**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Custom Animations** - Hand-crafted CSS animations

### **Backend & Database**
- **Supabase** - PostgreSQL database with real-time features
- **Row Level Security** - Secure data access policies
- **Database Migrations** - Version-controlled schema updates

### **Stream Tracking**
- **TikTok Live Connector** - Real-time TikTok stream monitoring
- **Node.js Server** - Background process for 24/7 stream tracking
- **WebSocket Connections** - Real-time viewer and engagement tracking

### **Authentication**
- **Supabase Auth** - Secure user authentication
- **Invitation-Only Registration** - Controlled access system
- **Role-Based Access** - Admin and streamer permissions

## 🚀 Quick Start

### **1. Prerequisites**
```bash
Node.js 18+
PostgreSQL (via Supabase)
Git
```

### **2. Clone Repository**
```bash
git clone https://github.com/your-username/suspect-management.git
cd suspect-management
```

### **3. Install Dependencies**
```bash
# Main application
npm install

# Stream tracker
cd stream-tracker
npm install
cd ..
```

### **4. Environment Setup**
Create `.env.local` in root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url
```

Create `stream-tracker/.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
```

### **5. Database Setup**
Run migrations in order:
```bash
psql $DATABASE_URL -f migrations/00_initial_schema.sql
psql $DATABASE_URL -f migrations/01_auth_setup.sql
# ... continue with all migration files in numerical order
```

### **6. Start Development**
```bash
# Start web application
npm run dev

# Start stream tracker (separate terminal)
cd stream-tracker
npm run dev
```

## 🗄️ Database Schema

### **Core Tables**
- `streamers` - User accounts and streamer profiles
- `stream_sessions` - Individual streaming session records
- `goals` - Monthly streaming goals and targets
- `payouts` - Payout tracking and history
- `payout_requests` - Streamer payout requests

### **Product Management**
- `product_keys` - Product key inventory
- `product_categories` - Key categorization
- `key_requests` - Key request tracking

### **Administration**
- `invitation_keys` - Registration invitation system
- `system_defaults` - Platform configuration
- `activity_logs` - Audit trail and activity tracking

## 🚢 Deployment

### **Production Setup**
1. **Create fresh Supabase project**
2. **Run all migration files in order**
3. **Deploy to Railway/Vercel**:
   - **Web App**: Next.js application
   - **Stream Tracker**: Node.js background service
4. **Set environment variables**
5. **Use bootstrap key**: `SUSPECT-SUPERADMIN` for first admin

### **Environment Variables (Production)**
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
DATABASE_URL=your_production_database_url
```

## 🔐 First-Time Setup

### **1. Create Admin Account**
1. Go to registration page
2. Use invitation key: **`SUSPECT-SUPERADMIN`**
3. Create your superuser admin account
4. Key automatically deactivates after use

### **2. Generate Invitation Keys**
1. Login as admin
2. Go to **Admin Settings → Invitation Keys**
3. Generate keys for streamers (1-50 at a time)
4. Share keys with streamers for registration

### **3. Set Up Product Categories**
1. Go to **Admin → Product Keys**
2. Create product categories
3. Add product keys to inventory
4. Configure automatic key assignment

## 📊 Key Features Detail

### **Stream Tracking**
- **Real-time Monitoring**: Tracks viewer count, likes, duration
- **Automatic Session Creation**: Starts when stream begins
- **Goal-based Payouts**: Calculates earnings based on performance
- **Data Persistence**: All stream data saved to database

### **Payout System**
- **Time Goals**: Minimum streaming duration requirements
- **Viewer Goals**: Target viewer count achievements  
- **Proportional Payouts**: Overtime earnings for longer streams
- **PayPal Integration**: Direct payment processing

### **Security Features**
- **Invitation-Only Registration**: Controlled access
- **Session Management**: Configurable timeouts
- **Password Requirements**: Enforced security standards
- **Activity Logging**: Complete audit trail
- **Role-Based Permissions**: Admin vs streamer access

## 🎯 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │ Stream Tracker  │    │    Supabase     │
│   (Frontend)    │────│  (Background)   │────│   (Database)    │
│                 │    │                 │    │                 │
│ • Admin Panel   │    │ • TikTok API    │    │ • PostgreSQL    │
│ • Dashboards    │    │ • Live Monitor  │    │ • Real-time     │
│ • API Routes    │    │ • Data Updates  │    │ • Auth & RLS    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛡️ Security

- **Row Level Security (RLS)** - Database-level access control
- **Environment Variables** - Sensitive data protection
- **Input Validation** - SQL injection prevention
- **CSRF Protection** - Built-in Next.js security
- **Invitation System** - Controlled user registration

## 📈 Analytics & Monitoring

- **Real-time Dashboards** - Live streaming statistics
- **Performance Metrics** - Viewer engagement tracking
- **Payout Analytics** - Earnings and goal tracking
- **Activity Logging** - Complete platform audit trail
- **Session History** - Detailed streaming records

## 🔧 Development

### **Project Structure**
```
├── src/
│   ├── app/           # Next.js app router pages
│   ├── components/    # React components
│   └── contexts/      # React contexts (auth, etc.)
├── stream-tracker/    # Background stream monitoring
├── migrations/        # Database migration files
└── public/           # Static assets
```

### **Key Commands**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 📝 License

Private project - All rights reserved

## 🤝 Contributing

This is a private project. Contact the repository owner for contribution guidelines.

---

**Built with ❤️ for the SuspectCheats community** 