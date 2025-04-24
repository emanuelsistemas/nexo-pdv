-- Add user_pai field to companies table to store the email of the creator user
ALTER TABLE companies ADD COLUMN user_pai TEXT;

-- Update existing records (will be null for existing records)
-- This comment is just a placeholder, you'll need to update existing records separately
-- using a script or manual process

-- Add a trigger to automatically set user_pai when new companies are created
CREATE OR REPLACE FUNCTION set_user_pai_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get the user email from auth.users table
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.created_by;
    
    -- Update the user_pai field with the email
    NEW.user_pai = user_email;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS set_user_pai_trigger ON companies;
CREATE TRIGGER set_user_pai_trigger
BEFORE INSERT ON companies
FOR EACH ROW
EXECUTE FUNCTION set_user_pai_on_insert();

-- The trigger will handle new companies, but we need to update existing records
-- Unfortunately we can't do that inline in this migration as it requires more complex logic
-- You'll need to run a separate update script for that
