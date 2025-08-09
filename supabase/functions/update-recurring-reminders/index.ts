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

    console.log('Starting recurring reminders update...');

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const today = currentDate.toISOString().split('T')[0];

    // Buscar lembretes fixos (is_recurring = true) que precisam ser atualizados
    const { data: recurringReminders, error: fetchError } = await supabaseClient
      .from('lembretes')
      .select('*')
      .eq('is_recurring', true);

    if (fetchError) {
      console.error('Error fetching recurring reminders:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${recurringReminders?.length || 0} recurring reminders`);

    if (!recurringReminders || recurringReminders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No recurring reminders to update',
          updated: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    let updatedCount = 0;
    const updates = [];

    for (const reminder of recurringReminders) {
      try {
        if (!reminder.data) continue;

        const reminderDate = new Date(reminder.data);
        const reminderMonth = reminderDate.getMonth() + 1;
        const reminderYear = reminderDate.getFullYear();
        const reminderDay = reminderDate.getDate();

        // Se o lembrete é de um mês anterior e ainda não foi atualizado para o mês atual
        if (reminderYear < currentYear || 
            (reminderYear === currentYear && reminderMonth < currentMonth)) {
          
          // Criar nova data para o mês atual, mantendo o dia
          let newDate = new Date(currentYear, currentMonth - 1, reminderDay);
          
          // Se o dia não existe no mês atual (ex: 31 em fevereiro), usar o último dia do mês
          if (newDate.getMonth() !== currentMonth - 1) {
            newDate = new Date(currentYear, currentMonth, 0); // Último dia do mês anterior
          }

          const newDateString = newDate.toISOString().split('T')[0];

          // Verificar se já existe um lembrete para este usuário nesta data
          const { data: existingReminder } = await supabaseClient
            .from('lembretes')
            .select('id')
            .eq('userid', reminder.userid)
            .eq('descricao', reminder.descricao)
            .eq('data', newDateString)
            .maybeSingle();

          if (!existingReminder) {
            // Atualizar o lembrete existente para o mês atual
            updates.push({
              id: reminder.id,
              data: newDateString,
              status: 'pending' // Reset status para pending
            });
          }
        }
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
      }
    }

    // Executar todas as atualizações
    if (updates.length > 0) {
      console.log(`Updating ${updates.length} reminders...`);
      
      for (const update of updates) {
        const { error: updateError } = await supabaseClient
          .from('lembretes')
          .update({
            data: update.data,
            status: update.status
          })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Error updating reminder ${update.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`Updated reminder ${update.id} to ${update.data}`);
        }
      }
    }

    console.log(`Recurring reminders update completed. Updated: ${updatedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully updated ${updatedCount} recurring reminders`,
        updated: updatedCount,
        processed: recurringReminders.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in update-recurring-reminders function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        updated: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});