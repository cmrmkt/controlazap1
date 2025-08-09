-- Criar função para auto-geração de lembretes mensais
CREATE OR REPLACE FUNCTION public.auto_generate_monthly_reminders()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    reminder_record RECORD;
    new_date DATE;
    current_date_val DATE := CURRENT_DATE;
    current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    next_month INTEGER;
    next_year INTEGER;
    existing_count INTEGER;
BEGIN
    -- Calcular próximo mês
    IF current_month = 12 THEN
        next_month := 1;
        next_year := current_year + 1;
    ELSE
        next_month := current_month + 1;
        next_year := current_year;
    END IF;
    
    -- Buscar lembretes fixos que precisam ser replicados
    FOR reminder_record IN 
        SELECT * FROM lembretes 
        WHERE is_recurring = true 
        AND repeat_months > 0
        AND status = 'pending'
    LOOP
        -- Verificar quantos lembretes já existem para este lembrete base
        SELECT COUNT(*) INTO existing_count
        FROM lembretes 
        WHERE userid = reminder_record.userid 
        AND descricao = reminder_record.descricao 
        AND valor = reminder_record.valor
        AND icon = reminder_record.icon;
        
        -- Se ainda não atingiu o limite de repetições, criar próximo
        IF existing_count < reminder_record.repeat_months THEN
            -- Calcular nova data para o próximo mês
            BEGIN
                new_date := make_date(next_year, next_month, EXTRACT(DAY FROM reminder_record.data::date)::integer);
            EXCEPTION
                WHEN OTHERS THEN
                    -- Se o dia não existe no próximo mês (ex: 31 em fevereiro), usar o último dia do mês
                    new_date := (make_date(next_year, next_month, 1) + INTERVAL '1 month - 1 day')::date;
            END;
            
            -- Verificar se já não existe lembrete idêntico na nova data
            IF NOT EXISTS (
                SELECT 1 FROM lembretes 
                WHERE userid = reminder_record.userid 
                AND descricao = reminder_record.descricao 
                AND data::date = new_date
                AND valor = reminder_record.valor
            ) THEN
                -- Criar novo lembrete
                INSERT INTO lembretes (
                    userid,
                    descricao,
                    data,
                    valor,
                    status,
                    is_recurring,
                    repeat_months,
                    icon,
                    original_date
                ) VALUES (
                    reminder_record.userid,
                    reminder_record.descricao,
                    new_date,
                    reminder_record.valor,
                    'pending',
                    false, -- O novo lembrete não é mais recorrente
                    1,
                    reminder_record.icon,
                    reminder_record.data
                );
                
                RAISE NOTICE 'Criado novo lembrete para % em %', reminder_record.descricao, new_date;
            END IF;
        END IF;
    END LOOP;
END;
$function$;