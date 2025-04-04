/*
  # Add theme preference to profiles table

  1. Changes
    - Add theme_preference column to profiles table
    - Set default value as 'D' (Dark theme)
    - Add check constraint for valid values ('D', 'L')
    - Update existing rows to 'D'

  2. Notes
    - 'D' = Dark theme
    - 'L' = Light theme
*/

ALTER TABLE profiles 
ADD COLUMN theme_preference CHAR(1) NOT NULL DEFAULT 'D'
CHECK (theme_preference IN ('D', 'L'));