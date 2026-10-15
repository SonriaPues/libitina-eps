-- Trámites · 001 · Valores nuevos en tipos existentes (van solos: PostgreSQL no deja usar
-- un valor de enum en la misma transacción en que se crea).
ALTER TYPE tipo_autorizacion ADD VALUE IF NOT EXISTS 'consulta_especializada';
ALTER TYPE estado_tramite    ADD VALUE IF NOT EXISTS 'cerrado';
