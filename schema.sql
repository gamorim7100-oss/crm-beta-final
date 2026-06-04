-- Complete SQL Schema for Markello CRM
-- Execute this in Supabase SQL Editor in order

-- 1. PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. CLIENTS
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cpf TEXT,
  grupo INTEGER,
  cota INTEGER,
  consortium_type TEXT NOT NULL CHECK (consortium_type IN ('automovel', 'imoveis', 'outros')),
  contract_value DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'contemplado')),
  data_fechamento DATE NOT NULL,
  criterio_de_lance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LEADS
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  consortium_interest TEXT CHECK (consortium_interest IN ('automovel', 'imoveis', 'outros')),
  status TEXT DEFAULT 'negociacao' CHECK (status IN ('negociacao', 'reuniao', 'fechamento', 'venda_concluida')),
  kanban_position INTEGER DEFAULT 0,
  notes TEXT,
  converted_client_id UUID REFERENCES clients(id),
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MESSAGES
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  whatsapp_message_id TEXT UNIQUE,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'audio', 'video', 'document')),
  read_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MEETINGS
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SALES
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  consortium_type TEXT NOT NULL CHECK (consortium_type IN ('automovel', 'imoveis', 'outros')),
  value DECIMAL(12,2) NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PAYMENT_SCHEDULE
CREATE TABLE payment_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  competencia DATE NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  fase INTEGER CHECK (fase IN (1, 2, 3)),
  pago BOOLEAN DEFAULT FALSE,
  data_pagamento DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, competencia)
);

-- 8. INDEXES
CREATE INDEX idx_leads_user_status ON leads(user_id, status);
CREATE INDEX idx_messages_lead ON messages(lead_id, timestamp DESC);
CREATE INDEX idx_clients_user ON clients(user_id, status);
CREATE INDEX idx_sales_user_date ON sales(user_id, sale_date DESC);
CREATE INDEX idx_meetings_user_time ON meetings(user_id, start_time);
CREATE INDEX idx_schedule_client_date ON payment_schedule(client_id, competencia);
CREATE INDEX idx_schedule_pending ON payment_schedule(competencia, pago) WHERE pago = FALSE;

-- 9. ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own clients" ON clients FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own leads" ON leads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own meetings" ON meetings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sales" ON sales FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage messages of own leads" ON messages FOR ALL
  USING (lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid()));
CREATE POLICY "Users see own clients schedules" ON payment_schedule FOR ALL
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

