-- Drop trigger and function that depend on system_units
DROP TRIGGER IF EXISTS company_default_units_trigger ON companies;
DROP FUNCTION IF EXISTS add_default_units_on_company_create();

-- Recreate function without querying system_units
CREATE OR REPLACE FUNCTION add_default_units_on_company_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_units (company_id, code, name, description)
  VALUES
    (NEW.id, 'UN', 'Unidade', 'Unidade padrão do sistema'),
    (NEW.id, 'KG', 'Kilo', 'Unidade padrão do sistema para peso em quilogramas');
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new function
CREATE TRIGGER company_default_units_trigger
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION add_default_units_on_company_create();
