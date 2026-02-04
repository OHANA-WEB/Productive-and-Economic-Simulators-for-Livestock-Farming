# MVP Web - Livestock Production Intelligence Platform

**MetaCaprine Scientific Intelligence System**

A comprehensive web platform for livestock (goat/dairy) production management, simulation, and decision-making with scientific breed comparison capabilities.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Module Documentation](#module-documentation)
- [Email Verification Setup](#email-verification-setup)
- [Deployment](#deployment)
- [Project Transfer Information](#project-transfer-information)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

MVP Web is a full-stack web application that helps livestock producers make data-driven decisions through:

- **Multi-scenario simulation** - Create and compare different production scenarios
- **Scientific breed intelligence** - Compare breeds using Energy Corrected Milk (ECM) calculations
- **Transformation analysis** - Analyze profitability of direct sales vs. dairy transformation
- **Cost calculators** - 5 integrated calculators for production planning
- **Reproductive management** - Gestation simulator and calendar
- **Multi-language support** - English and Spanish
- **User authentication** - Email verification and secure login

---

## ✨ Features

### Module 1: Production & Direct Sales
- Daily production tracking
- Cost analysis (feed, labor, health, infrastructure)
- Revenue and margin calculations
- Per-liter profitability metrics

### Module 2: Dairy Transformation
- Product mix support (multiple products per scenario)
- 3 sales channels: Direct, Distributors, Third/Mixed
- Processing and packaging cost tracking
- Profitability comparison: Direct sales vs. Transformation
- Per-product margin analysis

### Module 3: Scientific Breed Intelligence ⭐
**INDEPENDENT MODULE** - Does not depend on Modules 1 or 2

- **27 goat breeds** with scientific data
- **ECM (Energy Corrected Milk) calculations** - Lifetime production comparison
- **Automatic ranking** by breed performance
- **A vs B comparison** - Side-by-side breed analysis
- **Herd scenarios** - Compare different herd sizes and breeds
- **Parameter overrides** - Customize breed characteristics
- **Visual comparisons** - Charts showing:
  - Lactation curves (cumulative ECM over lifetime)
  - Fat and protein production
  - Productive life comparisons
  - Ranking visualizations

**Key Insight**: Module 3 demonstrates why lifetime production (ECM) matters more than single percentages. For example: Saanen produces more total protein kg than Nubian despite lower protein %, due to higher volume and longevity.

### Module 4: Cost Calculators
5 integrated calculators:
1. Feed cost calculator
2. Labor cost calculator
3. Health cost calculator
4. Infrastructure cost calculator
5. Total cost summary

### Module 5: Reproductive Management
- Gestation simulator
- Reproductive calendar
- Birth predictions
- Breeding schedule optimization

### Additional Features
- 🔐 **User authentication** with email verification
- 🌐 **Bilingual interface** (English/Spanish)
- 🌓 **Dark/Light mode** with color system
- 📊 **Interactive charts** with Recharts
- 💾 **Scenario management** - Save, load, and compare scenarios
- 📱 **Responsive design** - Works on desktop, tablet, and mobile

---

## 🛠 Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **Recharts** - Data visualization
- **Vite** - Build tool and dev server
- **CSS3** - Styling with CSS variables for theming

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **SendGrid** - Email service (for verification)

### Deployment
- **Vercel** - Frontend and serverless API hosting
- **PostgreSQL** - Database (Vercel Postgres, Supabase, or self-hosted)

---

## 📁 Project Structure

```
MVP Web/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── modules/     # Module components (Module1-5)
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── ...
│   │   ├── hooks/           # Custom React hooks
│   │   ├── i18n/            # Internationalization
│   │   ├── styles/          # CSS files
│   │   ├── utils/           # Utility functions
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   ├── public/              # Static assets
│   │   └── breeds/          # Breed images
│   ├── package.json
│   └── vite.config.js
│
├── server/                   # Backend Node.js application
│   ├── core/                # Business logic engines
│   │   ├── module3Engine.js # ECM calculation engine
│   │   ├── lactationEngine.js
│   │   └── simulationEngine.js
│   ├── db/                  # Database files
│   │   ├── complete_migration.sql  # Single consolidated migration
│   │   ├── schema.sql       # Original schema (reference)
│   │   └── pool.js          # Database connection pool
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # JWT authentication
│   │   └── requireEmailVerification.js
│   ├── routes/              # API routes
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── module3.js       # Module 3 API
│   │   ├── breeds.js        # Breed data endpoints
│   │   ├── modules.js       # General module endpoints
│   │   └── scenarios.js     # Scenario management
│   ├── services/            # External services
│   │   └── emailService.js  # SendGrid email service
│   ├── index.js             # Server entry point
│   ├── package.json
│   └── metacaprine_module3_breed_reference_ranked_ecm.json
│
├── api/                     # Vercel serverless functions
│   └── index.js             # Serverless API handler
│
├── setup.js                 # Automated setup script
├── package.json             # Root package.json
├── vercel.json              # Vercel deployment config
└── README.md                # This file
```

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ database
- **Git** (for cloning the repository)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd "MVP Web"
```

### Step 2: Install Dependencies

Install both server and client dependencies:

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

cd ..
```

### Step 3: Environment Configuration

Create a `.env` file in the `server` directory:

```bash
cd server
cp .env.example .env
# Edit .env with your configuration
```

See [Environment Variables](#environment-variables) section for details.

### Step 4: Database Setup

Run the automated setup script from the root directory:

```bash
node setup.js
```

This script will:
1. Check database connection
2. Run the complete migration
3. Seed breed reference data (27 breeds)
4. Verify the setup

**Manual setup** (if you prefer):

```bash
# Run migration
psql $DATABASE_URL -f server/db/complete_migration.sql

# The setup script handles breed seeding automatically
# Or seed breeds manually using the setup.js logic
```

### Step 5: Run the Application

Open **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# Client runs on http://localhost:3000
```

Open http://localhost:3000 in your browser.

---

## 🔑 Environment Variables

### Server Environment Variables

Create `server/.env` with the following:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your-secure-jwt-secret-here

# Application URL (for email verification links)
APP_URL=http://localhost:3000

# Email Service (SendGrid) - Optional for development
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Server Configuration
PORT=3001
NODE_ENV=development
```

### Production Environment Variables

For production deployment (Vercel, etc.):

```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
JWT_SECRET=your-production-jwt-secret
APP_URL=https://your-domain.vercel.app
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
NODE_ENV=production
```

---

## 🗄 Database Setup

### Database Schema

The application uses a PostgreSQL database with the following main tables:

- `users` - User accounts with email verification
- `scenarios` - User scenarios (simulations)
- `production_data` - Module 1 data
- `transformation_data` - Module 2 single product data
- `transformation_products` - Module 2 product mix data
- `breed_reference` - Module 3 scientific breed data (MASTER TABLE)
- `breed_scenarios` - Module 3 user simulations
- `lactation_data` - Legacy lactation data
- `results` - Calculated results

### Migration Files

All migrations have been consolidated into a single file:
- `server/db/complete_migration.sql` - Complete database schema

### Seeding Data

Breed reference data is automatically seeded by `setup.js` from:
- `server/metacaprine_module3_breed_reference_ranked_ecm.json` (27 breeds)

---

## 🏃 Running the Application

### Development Mode

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### Production Build

```bash
# Build client
cd client
npm run build

# The dist/ folder contains the production build

# Start production server
cd ../server
npm start
```

---

## 📚 Module Documentation

### Module 1: Production & Direct Sales

**Purpose**: Calculate profitability of direct milk sales

**Inputs**:
- Daily production (liters)
- Production days
- Number of animals
- Costs per liter (feed, labor, health, infrastructure, other)
- Milk price per liter

**Outputs**:
- Total production
- Total revenue
- Total costs
- Gross margin
- Margin percentage
- Revenue and cost per liter

### Module 2: Dairy Transformation

**Purpose**: Analyze profitability of transforming milk into dairy products

**Key Features**:
- Product mix support (multiple products per scenario)
- 3 sales channels per product
- Processing and packaging costs
- Comparison with direct milk sales

**Inputs**:
- Product type (cheese, yogurt, etc.)
- Conversion rate (liters per kg)
- Processing cost per liter
- Packaging cost per kg
- Distribution percentages across channels
- Prices per sales channel

**Outputs**:
- Total product weight
- Revenue by channel
- Weighted average price
- Total costs (production + processing + packaging)
- Gross margin
- Comparison: Transformation vs. Direct sales

### Module 3: Scientific Breed Intelligence

**Purpose**: Compare goat breeds using scientific ECM (Energy Corrected Milk) calculations

**IMPORTANT**: Module 3 is **INDEPENDENT** - it does not depend on Modules 1 or 2. It uses the `breed_reference` master table.

**Key Concepts**:
- **ECM (Energy Corrected Milk)**: A standardized measure accounting for fat and protein content
- **Formula**: ECM(kg) = Milk(kg) × (0.327 + 0.122×Fat% + 0.077×Protein%)
- **Lifetime production**: ECM × Lactations per lifetime
- **Why it matters**: A breed with lower percentages but higher volume and longevity can produce more total nutrients

**Features**:
1. **Ranking View**: All 27 breeds ranked by lifetime ECM
2. **Single Breed View**: Detailed analysis of one breed
3. **A vs B Comparison**: Side-by-side breed comparison with delta analysis

**Data Source**:
- 27 goat breeds with scientific data
- Sources: ADGA, DHI, USDA, ICAR, FAO, university research
- All calculations in kg (liters shown as approximation: kg/1.03)

**User Capabilities**:
- Override any breed parameter
- Simulate different herd sizes
- Compare scenarios (e.g., 2000 Malagueña vs. 700 LaMancha)
- Save and load simulations

**Example Use Case**:
```
Compare: Nubian vs. Saanen

Nubian:
  - Protein: 3.52%
  - Lactations: 4.5
  - Lifetime ECM: ~3,456 kg
  - Lifetime protein: ~143 kg

Saanen:
  - Protein: 3.06% (LOWER %)
  - Lactations: 5.0 (MORE lactations)
  - Lifetime ECM: ~5,459 kg
  - Lifetime protein: ~181 kg (MORE total kg)

Winner: Saanen produces 27% more total protein despite lower percentage!
```

### Module 4: Cost Calculators

5 integrated calculators for cost estimation:

1. **Feed Cost Calculator**
2. **Labor Cost Calculator**
3. **Health Cost Calculator**
4. **Infrastructure Cost Calculator**
5. **Total Cost Summary**

### Module 5: Reproductive Management

- Gestation simulator
- Reproductive calendar
- Birth date predictions
- Breeding schedule optimization

---

## 📧 Email Verification Setup

The application includes email verification for user registration.

### SendGrid Setup (Recommended for Production)

1. **Create SendGrid Account**
   - Go to https://sendgrid.com
   - Sign up for a free account (100 emails/day)

2. **Create API Key**
   - Navigate to Settings → API Keys
   - Click "Create API Key"
   - Choose "Restricted Access"
   - Grant "Mail Send" permissions
   - Copy the API key (you won't see it again!)

3. **Verify Sender Email**
   - Navigate to Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Enter your email (e.g., noreply@yourdomain.com)
   - Check your email and verify

4. **Configure Environment Variables**
   ```env
   SENDGRID_API_KEY=SG.your-api-key-here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   APP_URL=http://localhost:3000  # or your production URL
   ```

### Email Verification Flow

1. User registers with email/password
2. System generates verification token (expires in 24 hours)
3. Verification email sent via SendGrid
4. User clicks link → email verified
5. User can now login and access all features

### Development Without Email

For local development, you can:
- Skip email verification by manually setting `email_verified = true` in database
- Or use a console log to get the verification token from server logs

---

## 🚀 Deployment

### Deploying to Vercel

This application is configured for Vercel deployment with serverless API.

#### Prerequisites
- Vercel account
- PostgreSQL database (Vercel Postgres, Supabase, or other)
- SendGrid account (for email verification)

#### Steps

1. **Prepare Database**
   - Create PostgreSQL database
   - Run `setup.js` to initialize schema and data
   - Get connection string

2. **Install Vercel CLI** (optional)
   ```bash
   npm install -g vercel
   ```

3. **Configure Environment Variables in Vercel**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all variables from the [Environment Variables](#environment-variables) section

4. **Deploy**
   ```bash
   # Option 1: Using Vercel CLI
   vercel

   # Option 2: Push to GitHub and connect to Vercel
   # Vercel will automatically deploy on push
   ```

5. **Verify Deployment**
   - Check Vercel deployment logs
   - Test API endpoints
   - Register a test user
   - Verify email verification works

### Database Hosting Options

1. **Vercel Postgres** - Integrated with Vercel
2. **Supabase** - Free PostgreSQL hosting
3. **Railway** - Easy PostgreSQL hosting
4. **AWS RDS** - Production-grade PostgreSQL
5. **Self-hosted** - Your own PostgreSQL server

---

## 🔄 Project Transfer Information

### Source Code Delivery

This project is delivered with complete source code and all necessary files for independent development.

**Included**:
- ✅ Complete frontend source code (client/)
- ✅ Complete backend source code (server/)
- ✅ Database schema and migration files
- ✅ Breed reference data (27 breeds)
- ✅ Deployment configuration
- ✅ Comprehensive documentation

### Database Export

**Structure**: All database schema is in `server/db/complete_migration.sql`

**Data**: 
- Breed reference data: `server/metacaprine_module3_breed_reference_ranked_ecm.json`
- User data and scenarios: Can be exported with standard PostgreSQL tools

**Export User Data** (if needed):
```bash
pg_dump $DATABASE_URL > database_backup.sql
```

### Transferring from Developer Accounts

#### Vercel Transfer
1. Go to Vercel Dashboard → Project Settings → General
2. Click "Transfer Project"
3. Enter the new owner's Vercel account email
4. New owner accepts the transfer

#### Database Transfer
- Export data: `pg_dump $DATABASE_URL > backup.sql`
- Import to new database: `psql $NEW_DATABASE_URL < backup.sql`
- Update `DATABASE_URL` in Vercel environment variables

#### SendGrid Transfer
- Create new SendGrid account
- Create new API key
- Verify new sender email
- Update `SENDGRID_API_KEY` in Vercel environment variables

### Running Independently

After transfer, the client can:
1. Run the application locally (see [Installation](#installation--setup))
2. Deploy to their own Vercel account
3. Use their own database
4. Continue development with other developers
5. Modify and extend any feature

**No dependencies on developer accounts** after transfer.

---

## 🐛 Troubleshooting

### Database Connection Issues

**Problem**: "Database connection failed"

**Solutions**:
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running
- Test connection: `psql $DATABASE_URL`
- For SSL issues, add `?sslmode=require` to connection string

### Email Verification Not Working

**Problem**: Verification emails not sent

**Solutions**:
- Check `SENDGRID_API_KEY` is set correctly
- Verify sender email in SendGrid dashboard
- Check SendGrid Activity for delivery status
- Check server logs for error messages

### Module 3 Data Missing

**Problem**: No breeds showing in Module 3

**Solutions**:
- Run `node setup.js` to seed breed data
- Check that `breed_reference` table exists
- Verify breed data file exists: `server/metacaprine_module3_breed_reference_ranked_ecm.json`

### Port Already in Use

**Problem**: "Port 3000/3001 already in use"

**Solutions**:
```bash
# Find process using port
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or use different port
# Change port in vite.config.js (client) or server/index.js
```

### Build Errors

**Problem**: Build fails with dependency errors

**Solutions**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache (client)
cd client
rm -rf node_modules .vite dist
npm install
```

### API Errors in Production

**Problem**: API routes return 404 in production

**Solutions**:
- Check `vercel.json` configuration
- Verify all environment variables are set in Vercel
- Check Vercel function logs
- Ensure serverless function size is within limits

---

## 📝 Additional Notes

### Data Validation

- All user inputs are validated on frontend and backend
- Database constraints prevent invalid data
- ECM calculations use scientific formulas from European dairy standards

### Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for authentication
- Email verification required
- SQL injection prevention with parameterized queries
- CORS configured for frontend domain

### Performance

- Database indexes on frequently queried columns
- React components optimized with proper state management
- Lazy loading for routes
- Chart rendering optimized with Recharts

### Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

---

## 📞 Support

For technical issues or questions after project transfer:

1. **Check this README** first
2. **Review code comments** in source files
3. **Check browser console** for frontend errors
4. **Check server logs** for backend errors
5. **Database issues**: Review `complete_migration.sql`

---

## 📄 License

This project is delivered as proprietary software to the client with full source code ownership and rights to modify, extend, and redistribute as they see fit.

---

## 🎉 Project Status

**Status**: ✅ **COMPLETE AND READY FOR DELIVERY**

**Delivered**:
- ✅ Module 3 visualization working correctly
- ✅ Module 3 confirmed independent from Modules 1 & 2
- ✅ Email verification functional
- ✅ All migrations consolidated
- ✅ Development files cleaned up
- ✅ Comprehensive documentation
- ✅ Setup script for easy installation
- ✅ Ready for project transfer

**Date**: February 4, 2026

---

**Thank you for using MVP Web!** 🚀
