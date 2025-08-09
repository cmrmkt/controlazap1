-- Criar trigger para atualizar automaticamente a data dos lembretes fixos
CREATE OR REPLACE FUNCTION update_recurring_reminders()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    reminder_record RECORD;
    new_date DATE;
    current_date_val DATE := CURRENT_DATE;
    current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    -- Buscar lembretes fixos que precisam ser atualizados
    FOR reminder_record IN 
        SELECT * FROM lembretes 
        WHERE is_recurring = true 
        AND EXTRACT(MONTH FROM data::date) < current_month
        AND EXTRACT(YEAR FROM data::date) <= current_year
    LOOP
        -- Calcular nova data mantendo o mesmo dia do mês
        BEGIN
            new_date := make_date(current_year, current_month, EXTRACT(DAY FROM reminder_record.data::date)::integer);
        EXCEPTION
            WHEN OTHERS THEN
                -- Se o dia não existe no mês atual (ex: 31 em fevereiro), usar o último dia do mês
                new_date := (make_date(current_year, current_month, 1) + INTERVAL '1 month - 1 day')::date;
        END;
        
        -- Verificar se já existe um lembrete com a mesma descrição para este usuário na nova data
        IF NOT EXISTS (
            SELECT 1 FROM lembretes 
            WHERE userid = reminder_record.userid 
            AND descricao = reminder_record.descricao 
            AND data::date = new_date
            AND id != reminder_record.id
        ) THEN
            -- Atualizar o lembrete para a nova data
            UPDATE lembretes 
            SET data = new_date,
                status = 'pending'
            WHERE id = reminder_record.id;
            
            RAISE NOTICE 'Updated recurring reminder % to %', reminder_record.id, new_date;
        END IF;
    END LOOP;
END;
$$;

-- Criar cron job para executar automaticamente todo dia 1º do mês às 00:00
SELECT cron.schedule(
    'update-recurring-reminders-monthly',
    '0 0 1 * *', -- Todo dia 1º do mês às 00:00
    $$
    SELECT update_recurring_reminders();
    $$
);