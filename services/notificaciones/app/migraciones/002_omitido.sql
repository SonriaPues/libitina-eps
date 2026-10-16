-- Correos de cuentas de demostración: se registran pero no se envían.
ALTER TYPE estado_envio ADD VALUE IF NOT EXISTS 'omitido';
