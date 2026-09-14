-- New DigitalHub products (Dentist, WishHub, VingoBD) need their own intents
-- so the AI can distinguish them from the core agency services.
ALTER TYPE public.intent_type ADD VALUE IF NOT EXISTS 'dentist_product';
ALTER TYPE public.intent_type ADD VALUE IF NOT EXISTS 'dentist_appointment';
ALTER TYPE public.intent_type ADD VALUE IF NOT EXISTS 'dentist_patient_management';
ALTER TYPE public.intent_type ADD VALUE IF NOT EXISTS 'wishhub';
ALTER TYPE public.intent_type ADD VALUE IF NOT EXISTS 'wishhub_card';
ALTER TYPE public.intent_type ADD VALUE IF NOT EXISTS 'wishhub_scheduling';
ALTER TYPE public.intent_type ADD VALUE IF NOT EXISTS 'wishhub_event';
ALTER TYPE public.intent_type ADD VALUE IF NOT EXISTS 'vingobd';
ALTER TYPE public.intent_type ADD VALUE IF NOT EXISTS 'vingobd_card_design';
ALTER TYPE public.intent_type ADD VALUE IF NOT EXISTS 'vingobd_bangladeshi_event';
ALTER TYPE public.intent_type ADD VALUE IF NOT EXISTS 'digital_product_general';
