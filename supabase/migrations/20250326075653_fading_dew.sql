/*
  # Add company registration status to profiles

  1. Changes
    - Add status_cad_empresa column to profiles table
    - Set default value as 'N'
    - Update existing rows to 'N'

  2. Notes
    - 'N' = Not completed
    - 'S' = Completed
*/

ALTER TABLE profiles 
ADD COLUMN status_cad_empresa CHAR(1) NOT NULL DEFAULT 'N' 
CHECK (status_cad_empresa IN ('N', 'S'));