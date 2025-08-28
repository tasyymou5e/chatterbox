# Spectrum Harmony - Project Knowledge Base
**Comprehensive Technical Documentation & Architecture Guide**

---

## 📋 PROJECT OVERVIEW

**Project Name:** Spectrum Harmony  
**Purpose:** A web platform designed specifically for autistic children, featuring educational games, communication support, and family engagement tools  
**Technology Stack:** React + TypeScript + Vite + Supabase + Tailwind CSS  
**Target Users:** Autistic children, their parents/caregivers, and administrators  

### 🎯 Core Mission
Empowering autistic children through technology, education, and family connection with personalized learning experiences, communication support, and progress tracking.

---

## 🏗️ ARCHITECTURE OVERVIEW

### **Frontend Architecture**
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite  
- **Routing:** React Router DOM v6 (nested routes)
- **State Management:** React Context API + React Query
- **UI Framework:** Custom component system built on Radix UI
- **Styling:** Tailwind CSS with custom design system
- **Icons:** Lucide React
- **Animations:** Tailwind CSS animations + CSS transitions

### **Backend Architecture**
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication:** Supabase Auth with role-based permissions
- **Edge Functions:** Deno-based serverless functions
- **Real-time:** Supabase subscriptions (available but not currently used)
- **File Storage:** Supabase Storage (configured but not used)

---

## 🗂️ PROJECT STRUCTURE

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── admin/           # Admin-specific components
│   ├── Hero.tsx         # Landing page hero section
│   └── PortalSelection.tsx # Portal selection interface
├── pages/               # Route components
│   ├── admin/           # Admin portal pages
│   ├── Index.tsx        # Landing page
│   ├── Auth.tsx         # Authentication page
│   ├── About.tsx        # About page
│   ├── ParentDashboard.tsx # Parent portal
│   └── NotFound.tsx     # 404 page
├── hooks/               # Custom React hooks
│   ├── useAuth.tsx      # Parent authentication
│   ├── useAdminAuth.tsx # Admin authentication
│   ├── use-toast.ts     # Toast notifications
│   └── use-mobile.tsx   # Mobile detection
├── integrations/        # External service integrations
│   └── supabase/        # Supabase configuration
├── lib/                 # Utility functions
└── App.tsx             # Main application component

supabase/
├── functions/           # Edge functions
│   └── create-test-family/ # Family creation endpoint
├── migrations/         # Database migrations (auto-generated)
└── config.toml        # Supabase configuration
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### **User Roles System**
```sql
-- Role Enumeration
CREATE TYPE app_role AS ENUM ('admin', 'parent', 'child');
```

#### **Role Hierarchy:**
1. **Admin** - Full system access, family management, analytics
2. **Parent** - Family management, child account creation, progress tracking  
3. **Child** - Educational games, progress viewing (limited permissions)

### **Authentication Providers**
- **Parent Auth:** `useAuth()` hook - Standard user authentication
- **Admin Auth:** `useAdminAuth()` hook - Role-based admin authentication

### **Security Features**
- Row Level Security (RLS) enabled on all tables
- Role-based access control via database policies
- JWT token validation on edge functions
- Automatic user profile creation via database triggers

---

## 🗄️ DATABASE SCHEMA

### **Core Tables**

#### **families**
```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code TEXT NOT NULL UNIQUE,        -- Auto-generated: FAM-YYYY-XXX
  display_name TEXT NOT NULL,              -- User-friendly name
  name TEXT NOT NULL,                      -- Internal name (display + code)
  created_by UUID NOT NULL,               -- Parent who created family
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### **family_members**
```sql
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id),
  user_id UUID NOT NULL,                  -- References auth.users
  role app_role NOT NULL DEFAULT 'child',
  invited_by UUID,                        -- Who added this member
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### **profiles**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,           -- References auth.users
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### **user_roles**
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                  -- References auth.users  
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### **Database Functions**

#### **generate_family_code()**
```sql
-- Generates unique family codes in format: FAM-YYYY-XXX
-- Example: FAM-2025-001, FAM-2025-002
CREATE OR REPLACE FUNCTION generate_family_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

#### **has_role(user_id, role)**
```sql
-- Security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER;
```

#### **handle_new_user()**
```sql
-- Trigger function: Auto-creates profile and assigns parent role on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🎨 DESIGN SYSTEM

### **Color Palette (HSL Format)**
```css
/* Primary - Warm, accessible blue for trust */
--primary: 213 94% 68%;
--primary-foreground: 0 0% 100%;
--primary-hover: 213 94% 58%;

/* Secondary - Soft green for growth and success */
--secondary: 142 69% 58%;
--secondary-foreground: 0 0% 100%;
--secondary-hover: 142 69% 48%;

/* Accent - Gentle orange for joy and engagement */
--accent: 25 95% 65%;
--accent-foreground: 0 0% 100%;
--accent-hover: 25 95% 55%;

/* Backgrounds - Soft and calming */
--background: 248 100% 99%;
--foreground: 218 18% 20%;
--card: 0 0% 100%;
--muted: 220 13% 95%;
```

### **Gradients**
```css
--gradient-primary: linear-gradient(135deg, hsl(213 94% 68%), hsl(213 94% 78%));
--gradient-secondary: linear-gradient(135deg, hsl(142 69% 58%), hsl(142 69% 68%));
--gradient-hero: linear-gradient(135deg, hsl(213 94% 68%) 0%, hsl(142 69% 58%) 100%);
--gradient-card: linear-gradient(145deg, hsl(0 0% 100%) 0%, hsl(220 13% 98%) 100%);
```

### **Typography**
- **Font Family:** Nunito (Google Fonts) - Friendly, accessible for autism spectrum
- **Font Weights:** 300, 400, 500, 600, 700, 800
- **Accessibility:** High contrast ratios, clear visual hierarchy

### **Component Design Principles**
1. **Accessibility First:** WCAG compliant, keyboard navigation, screen reader support
2. **Autism-Friendly:** Calm colors, consistent layouts, predictable interactions
3. **Responsive:** Mobile-first design with touch-friendly interfaces
4. **Consistent:** Semantic tokens prevent direct color usage

---

## 🔧 FEATURES & FUNCTIONALITY

### **Landing Page (Index.tsx)**
- **Hero Section:** Mission statement, feature highlights, call-to-action
- **Feature Grid:** 6 main features with icons and descriptions
- **Statistics Banner:** User engagement metrics
- **Navigation:** Fixed header with login/signup buttons
- **Footer:** Comprehensive links and branding

### **Authentication System (Auth.tsx)**
- **Dual Mode:** Sign up and sign in tabs
- **Parent Signup:** Collects first name, last name, email, password
- **Validation:** Client-side and server-side validation
- **Auto-redirect:** Routes to parent dashboard on success
- **Error Handling:** User-friendly error messages

### **Parent Dashboard (ParentDashboard.tsx)**
- **Profile Display:** Shows authenticated parent information
- **Family Overview:** Current family status and member count
- **Quick Actions:** Family management, child accounts, progress tracking
- **Future Features:** Placeholder cards for planned functionality

### **Admin Portal**
#### **Admin Login (AdminLogin.tsx)**
- **Security-First:** Warning banners, restricted access messaging
- **Role Validation:** Checks admin role before granting access
- **Dark Theme:** Professional admin interface aesthetic

#### **Admin Dashboard (AdminDashboard.tsx)**
- **System Overview:** Real-time statistics from database
- **Metrics Display:** Total families, users, parents, children
- **Recent Activity:** New signups, system status
- **Create Test Family:** Integration with family creation dialog

#### **Admin Layout (AdminLayout.tsx)**
- **Navigation:** Dashboard, Families, Users, Reports
- **User Info:** Current admin email display
- **Sign Out:** Secure logout functionality
- **Nested Routing:** Outlet for child admin pages

### **Family Management System**
#### **Create Test Family Dialog**
- **Family Identifier System:** Auto-generated codes (FAM-YYYY-XXX)
- **Emoji-Enhanced Suggestions:** 5 categories with 8 suggestions each
  - 🏛️ Classic Families (The Johnsons, The Williams, etc.)
  - 🎉 Fun & Playful (The Space Explorers, The Rainbow Warriors, etc.)
  - 🌿 Nature Themed (The Blossom Family, The Butterfly Squad, etc.)
  - 🏃‍♂️ Adventure & Activity (The Happy Campers, The Goal Kickers, etc.)
  - 🤪 Silly & Humorous (The Giggle Squad, The Cookie Monsters, etc.)
- **Smart Form Validation:**
  - Parent 1: Required (first name, last name, email)
  - Parent 2: Optional (all fields or none)
  - Children: Dynamic list with auto-generated emails
- **Email Generation Logic:** `{parent1_email}.{child_first_name_lowercase}`
- **Real-time Preview:** Shows generated family structure before creation

#### **Family Name Suggestions Component**
- **Searchable Dropdown:** Filters suggestions in real-time
- **Random Generator:** "Surprise Me!" button for quick selection
- **Categorized Display:** Organized by theme with emoji indicators
- **User Experience:** Click-to-select, keyboard navigation support

---

## 🔗 API ENDPOINTS & EDGE FUNCTIONS

### **create-test-family**
**Path:** `supabase/functions/create-test-family/index.ts`  
**Method:** POST  
**Authentication:** Required (JWT validation)  
**CORS:** Enabled for web app access  

#### **Request Payload:**
```typescript
interface CreateFamilyRequest {
  displayName: string;           // User-friendly family name
  parent1: {                     // Required parent
    firstName: string;
    lastName: string;
    email: string;
  };
  parent2?: {                    // Optional second parent
    firstName: string;
    lastName: string;
    email: string;
  };
  children: Array<{              // Optional children
    firstName: string;
    lastName: string;
    email: string;               // Auto-generated from parent1.email
  }>;
}
```

#### **Response:**
```typescript
interface CreateFamilyResponse {
  success: boolean;
  familyCode: string;            // Generated code (FAM-YYYY-XXX)
  familyId: string;              // Database UUID
  displayName: string;           // User input
  internalName: string;          // displayName + familyCode
  membersCreated: number;        // Count of created accounts
  members: Array<{               // Account details for admin reference
    name: string;
    email: string;
    role: 'parent' | 'child';
    tempPassword: string;
  }>;
  tempPassword: string;          // Universal temp password for all accounts
}
```

#### **Process Flow:**
1. Generate unique family code using database function
2. Create family record with display name, code, and internal name
3. Create auth users for all family members
4. Create profiles (handled by database trigger)
5. Assign appropriate roles (parent/child)
6. Add members to family_members table
7. Return comprehensive creation report

---

## 🔒 SECURITY IMPLEMENTATION

### **Row Level Security Policies**

#### **families table**
```sql
-- Parents can create families
CREATE POLICY "Parents can create families" ON families 
FOR INSERT WITH CHECK (auth.uid() = created_by AND has_role(auth.uid(), 'parent'));

-- Parents can view their own families
CREATE POLICY "Parents can view families they created" ON families 
FOR SELECT USING (auth.uid() = created_by);

-- Parents can update their families  
CREATE POLICY "Parents can update their families" ON families 
FOR UPDATE USING (auth.uid() = created_by AND has_role(auth.uid(), 'parent'));
```

#### **family_members table**
```sql
-- Parents can add family members
CREATE POLICY "Parents can add family members" ON family_members 
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'parent') AND 
  EXISTS (SELECT 1 FROM families WHERE id = family_id AND created_by = auth.uid())
);

-- Family members can view other family members
CREATE POLICY "Family members can view their family members" ON family_members 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM family_members fm 
          WHERE fm.family_id = family_members.family_id AND fm.user_id = auth.uid())
);
```

#### **profiles table**
```sql
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON profiles 
FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles 
FOR UPDATE USING (auth.uid() = user_id);
```

#### **user_roles table**
```sql
-- Users can view their own roles
CREATE POLICY "Users can view their own roles" ON user_roles 
FOR SELECT USING (auth.uid() = user_id);
```

### **Security Best Practices Implemented**
- ✅ All database functions use `SECURITY DEFINER SET search_path = public`
- ✅ No direct auth.users table access from client
- ✅ Role-based access control via has_role() function
- ✅ CORS headers properly configured on edge functions
- ✅ JWT verification on sensitive endpoints
- ✅ Input validation and sanitization
- ✅ Proper error handling without information leakage

---

## 🎯 USER EXPERIENCE FLOWS

### **New Parent Registration Flow**
1. Land on homepage → See hero section and features
2. Click "Parent Sign Up" → Navigate to `/auth`
3. Fill signup form → Server creates account + profile + parent role
4. Receive email verification → Optional email confirmation
5. Auto-redirect to `/parent-dashboard` → Begin family management

### **Admin User Flow**
1. Navigate to `/admin/login` → Security warning displayed
2. Enter admin credentials → Role validation performed
3. Success → Navigate to `/admin/dashboard` → View system metrics
4. Use "Create Test Family" → Open comprehensive family creation dialog
5. Fill family details → Auto-generate family code and member accounts
6. Review created family → All members appear with temp passwords

### **Family Creation Flow**
1. Admin clicks "Create Test Family" → Dialog opens
2. Enter family display name → Suggestions appear with emoji categories
3. Click suggestion or use "Surprise Me!" → Auto-fill display name
4. Fill Parent 1 (required) → Email becomes base for child emails
5. Fill Parent 2 (optional) → Can leave blank for single-parent families
6. Add children → Names auto-generate emails as `parent1@domain.com.childname`
7. Review preview → Shows full family structure and generated emails
8. Submit → Edge function creates all accounts and family structure
9. Success → Display family code and member account details

---

## 🚀 DEPLOYMENT & CONFIGURATION

### **Environment Variables**
```bash
# Supabase Configuration (hardcoded for this project)
SUPABASE_URL=https://lxuqfgbukrrickanmmic.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Supabase Configuration**
```toml
# supabase/config.toml
project_id = "lxuqfgbukrrickanmmic"

[functions.create-test-family]
verify_jwt = true
```

### **Build & Development**
```bash
# Development
npm run dev           # Start Vite dev server

# Production
npm run build         # Build for production
npm run preview       # Preview production build

# Supabase (if needed)
supabase start        # Start local development
supabase db reset     # Reset local database
```

---

## 📊 CURRENT STATUS & ROADMAP

### **✅ Implemented Features**
- [x] Complete authentication system (parent + admin)
- [x] Database schema with RLS policies
- [x] Family identifier system (FAM-YYYY-XXX codes)
- [x] Emoji-enhanced family name suggestions
- [x] Comprehensive family creation dialog
- [x] Admin dashboard with real-time metrics
- [x] Parent dashboard structure
- [x] Edge function for family creation
- [x] Responsive design system
- [x] Security best practices

### **🔄 In Progress**
- [ ] Families management page (admin)
- [ ] Users management page (admin)
- [ ] Reports system (admin)
- [ ] Parent family management interface

### **📋 Planned Features**
- [ ] Children's portal with educational games
- [ ] Communication support with AAC symbols
- [ ] Visual schedules and routine management
- [ ] Speech therapy and phonics exercises
- [ ] Progress tracking and analytics
- [ ] Achievement system with rewards
- [ ] Parent task assignment system
- [ ] Real-time notifications
- [ ] File storage for avatars/content
- [ ] Reporting and analytics dashboard

---

## 🛠️ DEVELOPMENT GUIDELINES

### **Code Organization**
- **Components:** One component per file, descriptive naming
- **Hooks:** Custom hooks for reusable stateful logic
- **Types:** TypeScript interfaces for all data structures
- **Styles:** Tailwind classes using semantic tokens only
- **Database:** All changes via migrations, never direct edits

### **Design System Rules**
- **Colors:** Always use HSL format, never direct color values
- **Components:** Extend shadcn/ui base components
- **Variants:** Create component variants for different states
- **Accessibility:** Test with screen readers, keyboard navigation
- **Responsive:** Mobile-first design approach

### **Security Guidelines**
- **Authentication:** Always check user roles before sensitive operations
- **Database:** Use RLS policies, never trust client-side validation
- **Edge Functions:** Validate JWT tokens, sanitize inputs
- **Error Handling:** Don't leak sensitive information in errors

### **Performance Considerations**
- **Database:** Use proper indexes, avoid N+1 queries
- **Frontend:** Lazy load routes, optimize images
- **Bundle Size:** Tree-shake unused dependencies
- **Caching:** Leverage React Query for data caching

---

## 🔗 KEY INTEGRATIONS

### **Supabase Services Used**
- **Database:** PostgreSQL with real-time subscriptions
- **Authentication:** JWT-based auth with role management
- **Edge Functions:** Deno runtime for serverless functions
- **Security:** Row Level Security and role-based access

### **UI Libraries**
- **Radix UI:** Accessible component primitives
- **Tailwind CSS:** Utility-first styling
- **Lucide React:** Consistent icon system
- **React Hook Form:** Form validation and management
- **React Query:** Server state management

---

## 🎯 BUSINESS LOGIC SUMMARY

**Spectrum Harmony** is designed as a comprehensive platform for autistic children and their families. The system implements a three-tier user hierarchy (admin, parent, child) with sophisticated family management capabilities. 

The unique family identifier system allows administrators to create test families with auto-generated codes (FAM-YYYY-XXX format) and child email addresses based on parent emails. The emoji-enhanced name suggestion system makes family creation engaging and user-friendly.

The architecture prioritizes security with Row Level Security policies, accessibility with autism-friendly design choices, and scalability with a modern React/Supabase stack. The system is designed to grow from the current family management foundation into a full educational and communication platform for autistic children.

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Contributors:** AI Development Team  
**License:** Proprietary