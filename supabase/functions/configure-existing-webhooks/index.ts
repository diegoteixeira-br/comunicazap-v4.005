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

    // Verificar autenticação - apenas admins podem executar
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verificar se é admin
    const { data: isAdmin } = await supabaseClient.rpc('is_admin');
    if (!isAdmin) {
      throw new Error('Only admins can execute this function');
    }

    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API configuration missing');
    }

    if (!n8nWebhookUrl) {
      throw new Error('N8N_WEBHOOK_URL not configured');
    }

    console.log('Buscando instâncias do sistema para configurar webhook...');

    // Buscar todas as instâncias do sistema (apenas as que estão no banco de dados)
    const { data: instances, error: fetchError } = await supabaseClient
      .from('whatsapp_instances')
      .select('id, instance_name, webhook_url, status')
      .in('status', ['connected', 'pending']);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Encontradas ${instances?.length || 0} instâncias para verificar`);

    const results: { 
      instance_name: string; 
      success: boolean; 
      message: string;
      skipped?: boolean;
    }[] = [];

    for (const instance of instances || []) {
      // Pular instâncias que já têm webhook configurado
      if (instance.webhook_url) {
        console.log(`Instância ${instance.instance_name} já tem webhook configurado, pulando...`);
        results.push({
          instance_name: instance.instance_name,
          success: true,
          message: 'Webhook já configurado',
          skipped: true
        });
        continue;
      }

      console.log(`Configurando webhook para: ${instance.instance_name}`);

      try {
        const webhookResponse = await fetch(`${evolutionApiUrl}/webhook/set/${instance.instance_name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey
          },
          body: JSON.stringify({
            url: n8nWebhookUrl,
            webhook_by_events: false,
            webhook_base64: true,
            events: ['MESSAGES_UPSERT']
          })
        });

        if (webhookResponse.ok) {
          console.log(`Webhook configurado para ${instance.instance_name}`);
          
          // Atualizar o banco de dados com a URL do webhook
          await supabaseClient
            .from('whatsapp_instances')
            .update({ webhook_url: n8nWebhookUrl })
            .eq('id', instance.id);

          results.push({
            instance_name: instance.instance_name,
            success: true,
            message: 'Webhook configurado com sucesso'
          });
        } else {
          const errorText = await webhookResponse.text();
          console.warn(`Falha ao configurar webhook para ${instance.instance_name}:`, errorText);
          results.push({
            instance_name: instance.instance_name,
            success: false,
            message: `Erro: ${errorText}`
          });
        }
      } catch (err: any) {
        console.error(`Erro ao configurar ${instance.instance_name}:`, err);
        results.push({
          instance_name: instance.instance_name,
          success: false,
          message: `Erro: ${err.message}`
        });
      }
    }

    const configured = results.filter(r => r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Configuração concluída: ${configured} configurados, ${skipped} já tinham, ${failed} falharam`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: {
          total: instances?.length || 0,
          configured,
          skipped,
          failed
        },
        results
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
