# Chatterbox Site Flow & User Journeys
**Application Flow Documentation**

## 🌊 User Journey Overview

### **Landing & Portal Selection** (`/`)
1. **Hero Section**: Platform introduction and mission
2. **Portal Selection**: Role-based navigation cards
3. **Getting Started**: New family guidance

### **Admin Portal Flow** (`/admin/*`)
1. **Secure Login** (`/admin/login`) → Enhanced security, rate limiting
2. **Dashboard** (`/admin/dashboard`) → System overview, KPIs, alerts
3. **User Management** (`/admin/users`) → CRUD operations, role assignment
4. **Family Management** (`/admin/families`) → Family oversight, bulk operations
5. **Content Management** (`/admin/content`) → Approval workflow, moderation
6. **System Monitoring** (`/admin/system`) → Real-time health, error tracking
7. **Reports** (`/admin/reports`) → Analytics, insights, export functionality

### **Parent Portal Flow** (`/auth`, `/parent/*`)
1. **Authentication** (`/auth`) → Login/signup with role detection
2. **Family Dashboard** (`/parent/dashboard`) → Family overview, child progress
3. **Chore Management** (`/parent/chores`) → Task creation, assignment, tracking
4. **Connection Management** (`/parent/connections`) → Extended family, permissions
5. **Progress Reports** (`/reports`) → Family analytics, achievement tracking

### **Child Portal Flow** (`/games`, `/children/*`)
1. **Games Catalog** (`/games`) → Educational content, autism-friendly filtering
2. **Task Dashboard** (`/children/tasks`) → Assigned tasks, gamified completion
3. **Progress Tracking** → Personal achievements, streaks, family recognition

## 🔐 Security Flow

### **Authentication States**
- **Unauthenticated** → Landing page, public content
- **Authenticated** → Role-based portal access
- **Admin** → Full system access with audit logging
- **Parent** → Family-scoped access with child oversight
- **Child** → Supervised access with progress tracking

### **Permission Enforcement**
- **Route Guards**: Authentication and role verification
- **Data Access**: RLS policies with 60+ security rules
- **Activity Logging**: Comprehensive audit trail
- **Session Management**: Timeout protection, emergency logout

## 🎯 Key User Flows

### **Family Creation** (Admin)
Admin Login → Families → Create Test Family → Bulk User Creation → Role Assignment → Activity Logging

### **Child Task Completion** (Child)
Games Portal → Task Dashboard → Select Task → Complete with Photos → Points Reward → Achievement Check

### **Progress Monitoring** (Parent)  
Parent Login → Dashboard → Child Progress → Detailed Reports → Export for Professionals

---

**Architecture**: React Router + Zustand + RLS Security  
**Performance**: <3s load time, optimized routing  
**Security**: Role-based access, comprehensive audit logging