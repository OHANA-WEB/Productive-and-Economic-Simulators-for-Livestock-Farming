# Database Migration Guide

This guide explains how to run the database migration for adding sales channels to the transformation module.

## Prerequisites

1. PostgreSQL database is set up and running
2. Database connection configured in `server/.env` file
3. Initial schema has been created (run `npm run migrate` first if you haven't)

## Option 1: Using the Migration Script (Recommended)

### Step 1: Navigate to Server Directory

```bash
cd server
```

### Step 2: Ensure Environment Variables are Set

Make sure your `server/.env` file contains your database connection:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mvp_ganaderia
# OR
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mvp_ganaderia
DB_USER=postgres
DB_PASSWORD=your_password
```

### Step 3: Run the Migration

```bash
npm run migrate:sales-channels
```

You should see output like:
```
🔄 Running sales channels migration...
✅ Sales channels migration completed successfully!
   Added columns:
   - sales_channel_direct_percentage
   - sales_channel_distributors_percentage
   - sales_channel_third_percentage
   - direct_sale_price_per_kg
   - distributors_price_per_kg
   - third_channel_price_per_kg
   Added constraint: check_sales_channels_sum
```

## Option 2: Manual SQL Execution

If you prefer to run the SQL manually:

### Step 1: Connect to Your Database

Using `psql` command line:
```bash
psql -U postgres -d mvp_ganaderia
```

Or using any PostgreSQL client (pgAdmin, DBeaver, etc.)

### Step 2: Execute the Migration SQL

Copy and paste the contents of `server/db/migration_add_sales_channels.sql`:

```sql
-- Migration: Add sales channels to transformation_data
-- This adds support for 3 sales channels: direct, distributors, third/mixed

ALTER TABLE transformation_data 
ADD COLUMN IF NOT EXISTS sales_channel_direct_percentage DECIMAL(5, 2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS sales_channel_distributors_percentage DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS sales_channel_third_percentage DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS direct_sale_price_per_kg DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS distributors_price_per_kg DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS third_channel_price_per_kg DECIMAL(10, 2);

-- Ensure percentages sum to 100
ALTER TABLE transformation_data 
ADD CONSTRAINT check_sales_channels_sum CHECK (
  COALESCE(sales_channel_direct_percentage, 0) + 
  COALESCE(sales_channel_distributors_percentage, 0) + 
  COALESCE(sales_channel_third_percentage, 0) = 100.00
);
```

### Step 3: Verify the Migration

Check that the columns were added:

```sql
\d transformation_data
```

You should see the new columns listed.

## Option 3: Using Supabase SQL Editor (For Cloud Deployments)

If you're using Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the migration SQL from `server/db/migration_add_sales_channels.sql`
5. Click **Run** to execute

## Verification

After running the migration, verify it worked:

```sql
-- Check if columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'transformation_data'
AND column_name LIKE 'sales_channel%' OR column_name LIKE '%_price_per_kg';

-- Check if constraint exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'transformation_data'
AND constraint_name = 'check_sales_channels_sum';
```

## Troubleshooting

### Error: "relation transformation_data does not exist"

**Solution**: Run the initial schema migration first:
```bash
cd server
npm run migrate
```

### Error: "column already exists"

**Solution**: This is OK! The migration uses `IF NOT EXISTS`, so it's safe to run multiple times. The columns already exist, so nothing changes.

### Error: "constraint already exists"

**Solution**: This is also OK! The constraint may have been added manually. You can drop it first if needed:
```sql
ALTER TABLE transformation_data DROP CONSTRAINT IF EXISTS check_sales_channels_sum;
```
Then run the migration again.

### Error: "permission denied"

**Solution**: Make sure your database user has ALTER TABLE permissions. You may need to run as a superuser or grant permissions:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
```

## What This Migration Does

1. **Adds 6 new columns** to `transformation_data` table:
   - `sales_channel_direct_percentage` - Percentage for direct sales (default: 100%)
   - `sales_channel_distributors_percentage` - Percentage for distributors (default: 0%)
   - `sales_channel_third_percentage` - Percentage for third channel (default: 0%)
   - `direct_sale_price_per_kg` - Price per kg for direct sales
   - `distributors_price_per_kg` - Price per kg for distributors
   - `third_channel_price_per_kg` - Price per kg for third channel

2. **Adds a constraint** to ensure percentages always sum to 100%

3. **Backward compatible**: Existing data will have 100% direct sales by default

## After Migration

Once the migration is complete:

1. Restart your server if it's running
2. Test the transformation module in the UI
3. Verify that you can configure the 3 sales channels
4. Check that calculations work correctly with multiple channels

## Need Help?

If you encounter any issues:
1. Check the error message carefully
2. Verify your database connection settings
3. Ensure you have the correct permissions
4. Check that the initial schema was created successfully
