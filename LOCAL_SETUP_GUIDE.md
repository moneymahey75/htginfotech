# Local Development Setup Guide

This guide will help you set up the HTG InfoTech Learning Management System on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/)
- A **Supabase account** - [Sign up](https://supabase.com/)

## Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd htg-infotech-platform
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React & React Router
- Supabase JS Client
- Tailwind CSS
- Lucide Icons
- And other dependencies

## Step 3: Set Up Supabase

### 3.1 Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - Project Name: Choose any name
   - Database Password: Create a strong password (save it!)
   - Region: Choose the closest to your users
4. Click "Create new project" and wait for it to be ready (2-3 minutes)

### 3.2 Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (long JWT token)

### 3.3 Run Database Migrations

The database schema is already set up in the `supabase/migrations` folder. To apply them:

#### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref your-project-ref
```
(Get your project ref from the Project URL: `https://[project-ref].supabase.co`)

4. Push migrations:
```bash
supabase db push
```

#### Option B: Manual SQL Execution

1. Go to **SQL Editor** in your Supabase dashboard
2. Open each migration file in `supabase/migrations/` folder (in chronological order)
3. Copy the SQL content and execute it in the SQL Editor

**Important Migration Files (execute in this order):**
- `20250715185532_dusty_sea.sql` - Initial schema
- `20250811032609_snowy_haze.sql` - Course system
- All subsequent migration files in order...
- `20260306210300_add_missing_rls_policies.sql` - Latest security fixes

## Step 4: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Open `.env` and update with your Supabase credentials:

```env
# Required: Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Cloudflare R2 (only needed for video uploads)
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=your_r2_public_url
```

**Note:** Cloudflare R2 variables are optional. The app will work without them, but video upload features will be disabled.

## Step 5: Create Admin User

You need to create an admin user to access the admin panel.

1. Go to your Supabase dashboard → **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Enter email and password
4. After creating the user, go to **SQL Editor** and run:

```sql
-- Get the user's UUID from auth.users
SELECT id, email FROM auth.users WHERE email = 'your-admin-email@example.com';

-- Insert admin record (replace 'user-uuid-here' with the actual UUID)
INSERT INTO tbl_admin_users (
  tau_id,
  tau_email,
  tau_username,
  tau_role,
  tau_is_active
) VALUES (
  'user-uuid-here',
  'your-admin-email@example.com',
  'admin',
  'super_admin',
  true
);
```

## Step 6: Start Development Server

```bash
npm run dev
```

The application should now be running at `http://localhost:5173`

## Step 7: Access the Application

### User Portal
- **URL:** `http://localhost:5173`
- **Login:** `/login`
- **Register:** `/register`

### Admin Panel
- **URL:** `http://localhost:5173/backpanel/login`
- **Login:** Use the admin credentials you created in Step 5

## Common Issues and Solutions

### Issue 1: "Failed to fetch" or CORS errors

**Solution:** Make sure your Supabase project URL and anon key are correct in `.env`

### Issue 2: "relation does not exist" database errors

**Solution:** Run all database migrations in the correct order. See Step 3.3.

### Issue 3: Port 5173 already in use

**Solution:**
```bash
# Kill the process using port 5173
npx kill-port 5173

# Or use a different port
npm run dev -- --port 3000
```

### Issue 4: Module not found errors

**Solution:**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue 5: Redis connection errors

**Solution:** Redis is optional and only used for MLM tree optimization. The app works fine without it. Errors about Redis can be safely ignored.

### Issue 6: Vite fails to start

**Solution:**
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## Development Tips

### Hot Reload
Vite provides instant hot reload. Changes to your code will automatically reflect in the browser.

### TypeScript
The project uses TypeScript. Check for type errors:
```bash
npm run build
```

### Linting
Run ESLint to check code quality:
```bash
npm run lint
```

### Database Access
Access your database directly:
1. Go to Supabase Dashboard → **Table Editor**
2. Or use **SQL Editor** for custom queries

### Environment-Specific Configuration

For production builds:
```bash
npm run build
npm run preview
```

## Project Structure

```
htg-infotech-platform/
├── src/
│   ├── components/      # React components
│   │   ├── admin/       # Admin panel components
│   │   ├── auth/        # Authentication components
│   │   ├── layout/      # Layout components (Navbar, Footer)
│   │   ├── learner/     # Learner-specific components
│   │   ├── tutor/       # Tutor-specific components
│   │   └── ui/          # Reusable UI components
│   ├── contexts/        # React Context providers
│   ├── lib/             # Utility libraries
│   ├── pages/           # Page components
│   ├── utils/           # Helper functions
│   └── main.tsx         # Application entry point
├── supabase/
│   ├── functions/       # Edge Functions
│   └── migrations/      # Database migrations
├── public/              # Static assets
├── .env                 # Environment variables (create from .env.example)
├── .env.example         # Environment template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── package.json         # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Build and show deployment instructions

## Testing the Application

### Test User Registration
1. Go to `/register`
2. Choose user type (Learner/Tutor/Job Seeker/Job Provider)
3. Fill in registration form
4. Verify email (if email confirmation is enabled)

### Test Admin Functions
1. Login to `/backpanel/login`
2. Navigate through admin dashboard
3. Test course creation, user management, etc.

### Test Course Enrollment
1. Login as a learner
2. Browse courses at `/courses`
3. Enroll in a course
4. Access learning dashboard

## Security Notes

- Never commit `.env` file to version control
- Keep your Supabase credentials secure
- Use Row Level Security (RLS) policies (already configured)
- For production, enable rate limiting in Supabase

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## Getting Help

If you encounter issues:

1. Check the console for error messages
2. Review this guide's "Common Issues" section
3. Check Supabase project logs
4. Verify all environment variables are set correctly
5. Ensure all database migrations are applied

## Next Steps

Once your local setup is working:

1. Explore the codebase
2. Read the `SECURITY_PERFORMANCE_FIXES.md` for recent improvements
3. Check `README.md` for project overview
4. Review database schema in migration files
5. Customize the application for your needs

---

**Happy Coding!** 🚀
