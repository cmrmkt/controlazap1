-- Criar trigger para execução automática da função quando necessário
CREATE OR REPLACE FUNCTION public.trigger_monthly_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Executar a função de auto-geração quando um lembrete fixo for criado ou atualizado
    IF NEW.is_recurring = true AND NEW.repeat_months > 1 THEN
        PERFORM public.auto_generate_monthly_reminders();
    END IF;
    
    RETURN NEW;
END;
$function$;