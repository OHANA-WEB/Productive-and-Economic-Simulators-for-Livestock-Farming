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
