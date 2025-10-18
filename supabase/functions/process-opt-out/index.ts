import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { instanceName, sender, message } = await req.json();

    if (!instanceName || !sender || !message) {
      throw new Error('Missing required fields: instanceName, sender, message');
    }

    console.log('Processing opt-out request:', { instanceName, sender });

    // Buscar o user_id pelo instance_name
    const { data: instance, error: instanceError } = await supabaseClient
      .from('whatsapp_instances')
      .select('user_id')
      .eq('instance_name', instanceName)
      .single();

    if (instanceError || !instance) {
      console.error('Instance not found:', instanceError);
      throw new Error('WhatsApp instance not found');
    }

    // Verificar se a mensagem contém palavras de opt-out
    const optOutKeywords = ['não', 'nao', 'sair', 'parar', 'cancelar', 'stop', 'remover'];
    const messageText = message.toLowerCase().trim();
    
    const isOptOut = optOutKeywords.some(keyword => messageText === keyword);

    if (isOptOut) {
      console.log('Opt-out detected, adding to blocked list');

      // Adicionar à lista de bloqueio (INSERT ... ON CONFLICT DO NOTHING para evitar duplicatas)
      const { error: insertError } = await supabaseClient
        .from('blocked_contacts')
        .insert({
          user_id: instance.user_id,
          phone_number: sender,
          reason: `Opt-out via message: "${message}"`
        })
        .select()
        .single();

      if (insertError) {
        // Se for erro de constraint UNIQUE, ignorar (já existe)
        if (insertError.code === '23505') {
          console.log('Contact already in blocked list');
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Contact already blocked',
              blocked: true 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw insertError;
      }

      console.log('Contact added to blocked list successfully');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Contact blocked successfully',
          blocked: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('No opt-out detected in message');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'No opt-out detected',
        blocked: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
