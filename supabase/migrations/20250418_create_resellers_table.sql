-- Create resellers table
CREATE TABLE IF NOT EXISTS public.resellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_number TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    trade_name TEXT NOT NULL,
    address_cep TEXT,
    address_street TEXT,
    address_number TEXT,
    address_complement TEXT,
    address_district TEXT,
    address_city TEXT,
    address_state TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reseller_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reseller_updated_at ON resellers;
CREATE TRIGGER update_reseller_updated_at
BEFORE UPDATE ON resellers
FOR EACH ROW
EXECUTE PROCEDURE update_reseller_updated_at();

-- Create policy for access control
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY admin_all ON public.resellers 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
);

-- RLS policies can be defined later as needed
