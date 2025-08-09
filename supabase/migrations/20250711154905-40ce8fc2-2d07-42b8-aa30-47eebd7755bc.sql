-- Criar trigger na tabela lembretes
DROP TRIGGER IF EXISTS auto_monthly_reminders_trigger ON lembretes;
CREATE TRIGGER auto_monthly_reminders_trigger
    AFTER INSERT OR UPDATE ON lembretes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_monthly_reminders();