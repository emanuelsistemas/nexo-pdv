/*
  # Add default system units

  1. Changes
    - Add function to create default units for new companies
    - Add trigger to automatically create default units when a company is created
    - Add default units: UN (Unidade) and KG (Kilo)

  2. Notes
    - These units will be automatically created for each new company
    - Units are essential for product management
    - Maintains data consistency across the system
*/

-- Create function to add default units
CREATE OR REPLACE FUNCTION add_default_units_on_company_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default units for the new company
  INSERT INTO product_units (company_id, code, name, description)
  VALUES
    (NEW.id, 'UN', 'Unidade', 'Unidade padrão do sistema'),
    (NEW.id, 'KG', 'Kilo', 'Unidade de medida para peso em quilogramas');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add default units when a company is created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'company_default_units_trigger'
  ) THEN
    CREATE TRIGGER company_default_units_trigger
      AFTER INSERT
      ON companies
      FOR EACH ROW
      EXECUTE FUNCTION add_default_units_on_company_create();
  END IF;
END $$;