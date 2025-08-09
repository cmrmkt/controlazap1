import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting recurring reminders generation...')

    // Buscar todos os lembretes que são recorrentes
    const { data: recurringReminders, error: fetchError } = await supabaseClient
      .from('lembretes')
      .select('*')
      .eq('is_recurring', true)
      .neq('status', 'removed')

    if (fetchError) {
      console.error('Error fetching recurring reminders:', fetchError)
      throw fetchError
    }

    console.log(`Found ${recurringReminders?.length || 0} recurring reminders`)

    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()
    
    let processedCount = 0
    let createdCount = 0

    for (const reminder of recurringReminders || []) {
      try {
        processedCount++
        
        // Verificar se já passou do período de recorrência
        if (reminder.repeat_months !== 999) { // 999 = indefinidamente
          const originalDate = new Date(reminder.original_date || reminder.data)
          const monthsElapsed = (currentYear - originalDate.getFullYear()) * 12 + (currentMonth - (originalDate.getMonth() + 1))
          
          if (monthsElapsed >= reminder.repeat_months) {
            console.log(`Reminder ${reminder.id} has expired, skipping...`)
            continue
          }
        }

        // Calcular a data do próximo mês
        const originalDate = new Date(reminder.data)
        const nextDate = new Date(currentYear, currentMonth - 1, originalDate.getDate())
        
        // Verificar se já existe um lembrete para este mês
        const { data: existingReminder, error: checkError } = await supabaseClient
          .from('lembretes')
          .select('id')
          .eq('userid', reminder.userid)
          .eq('descricao', reminder.descricao)
          .gte('data', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
          .lt('data', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`)
          .maybeSingle()

        if (checkError) {
          console.error('Error checking existing reminder:', checkError)
          continue
        }

        if (existingReminder) {
          console.log(`Reminder for ${reminder.descricao} already exists for current month`)
          continue
        }

        // Criar novo lembrete para o mês atual
        const newReminder = {
          userid: reminder.userid,
          descricao: reminder.descricao,
          data: nextDate.toISOString().split('T')[0],
          valor: reminder.valor,
          is_recurring: true,
          repeat_months: reminder.repeat_months,
          icon: reminder.icon,
          status: 'pending',
          original_date: reminder.original_date || reminder.data
        }

        const { error: insertError } = await supabaseClient
          .from('lembretes')
          .insert([newReminder])

        if (insertError) {
          console.error('Error creating recurring reminder:', insertError)
          continue
        }

        createdCount++
        console.log(`Created recurring reminder: ${reminder.descricao} for ${nextDate.toISOString().split('T')[0]}`)

      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error)
      }
    }

    const result = {
      success: true,
      message: `Processed ${processedCount} recurring reminders, created ${createdCount} new reminders`,
      processedCount,
      createdCount,
      timestamp: new Date().toISOString()
    }

    console.log('Recurring reminders generation completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in generate-recurring-reminders function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})