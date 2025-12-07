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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Creating instance for user:', user.id);

    // Verificar se já existe uma instância
    const { data: existingInstance } = await supabaseClient
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingInstance) {
      console.log(`Found existing instance: ${existingInstance.instance_name} with status: ${existingInstance.status}`);
      
      // Se está conectada, apenas retornar
      if (existingInstance.status === 'connected') {
        if (!existingInstance.api_key) {
          console.warn('Connected instance has no API key saved. Consider refreshing the instance token.');
        }
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Instance already connected',
            instance: existingInstance 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Se está pending/disconnected, deletar a instância antiga da Evolution API
      const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
      const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
      
      if (evolutionApiUrl && evolutionApiKey) {
        try {
          console.log(`Deleting old instance from Evolution API: ${existingInstance.instance_name}`);
          
          // Primeiro tenta fazer logout
          try {
            await fetch(`${evolutionApiUrl}/instance/logout/${existingInstance.instance_name}`, {
              method: 'DELETE',
              headers: { 'apikey': evolutionApiKey }
            });
            console.log('Logout attempt completed');
          } catch (logoutError) {
            console.warn('Logout error:', logoutError);
          }
          
          // Depois deleta a instância
          const deleteResponse = await fetch(`${evolutionApiUrl}/instance/delete/${existingInstance.instance_name}`, {
            method: 'DELETE',
            headers: { 'apikey': evolutionApiKey }
          });
          
          if (deleteResponse.ok) {
            console.log('Old instance deleted successfully from Evolution API');
          } else {
            const deleteError = await deleteResponse.text();
            console.warn('Could not delete old instance, but continuing with new creation:', deleteError);
          }
        } catch (error) {
          console.warn('Error deleting old instance:', error);
          // Continua mesmo se falhar, para não bloquear o usuário
        }
      }
    }

    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    
    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API configuration missing');
    }
    
    const instanceName = `user-${user.id.substring(0, 8)}-${Date.now()}`;

    console.log('Creating Evolution API instance:', instanceName);

    const createInstanceResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    });

    if (!createInstanceResponse.ok) {
      const errorText = await createInstanceResponse.text();
      console.error('Evolution API error:', errorText);
      throw new Error(`Failed to create instance: ${errorText}`);
    }

    const evolutionData = await createInstanceResponse.json();
    console.log('Evolution API response:', evolutionData);

    // Try to capture the per-instance API key (token) from the create response
    let instanceApiKey: string | null = (
      evolutionData?.hash ||
      evolutionData?.instance?.hash ||
      evolutionData?.instance?.apikey ||
      evolutionData?.instance?.token ||
      evolutionData?.hash?.apikey ||
      evolutionData?.hash?.token ||
      evolutionData?.apikey ||
      evolutionData?.token ||
      null
    );
    console.log('Instance API key from create:', instanceApiKey ? `Found: ${instanceApiKey.substring(0, 8)}...` : 'Missing');
    console.log('Full Evolution create response:', JSON.stringify(evolutionData, null, 2));

    const connectResponse = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey
      }
    });

    const connectData = await connectResponse.json();
    console.log('Connect response:', connectData);

    // If still missing, try to extract it from the connect response
    if (!instanceApiKey) {
      const candidateFromConnect: string | null = (
        connectData?.hash ||
        connectData?.instance?.hash ||
        connectData?.instance?.apikey ||
        connectData?.instance?.token ||
        connectData?.hash?.apikey ||
        connectData?.hash?.token ||
        connectData?.apikey ||
        connectData?.token ||
        null
      );
      if (candidateFromConnect) {
        instanceApiKey = candidateFromConnect;
        console.log('Instance API key obtained from connect response:', instanceApiKey.substring(0, 8) + '...');
      } else {
        console.warn('Instance API key still missing after connect response');
        console.log('Full Connect response:', JSON.stringify(connectData, null, 2));
      }
    }
    
    // Final validation
    if (!instanceApiKey) {
      console.error('CRITICAL: Could not obtain instance API key. Messages will fail!');
    } else {
      console.log('Instance API key confirmed for storage:', instanceApiKey.substring(0, 8) + '...');
    }

    // Configurar webhook automaticamente para o receptor de respostas (opt-out)
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    let webhookConfigured = false;
    
    if (n8nWebhookUrl) {
      console.log('Configurando webhook automaticamente para:', instanceName);
      
      try {
        const webhookResponse = await fetch(`${evolutionApiUrl}/webhook/set/${instanceName}`, {
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
          console.log('Webhook configurado automaticamente com sucesso!');
          webhookConfigured = true;
        } else {
          const webhookError = await webhookResponse.text();
          console.warn('Falha ao configurar webhook:', webhookError);
        }
      } catch (webhookErr) {
        console.warn('Erro ao configurar webhook:', webhookErr);
      }
    } else {
      console.warn('N8N_WEBHOOK_URL não configurada - webhook não será configurado automaticamente');
    }

    const { data: instanceData, error: insertError } = await supabaseClient
      .from('whatsapp_instances')
      .upsert({
        user_id: user.id,
        instance_name: instanceName,
        instance_id: instanceApiKey || evolutionData.instance?.instanceId || instanceName,
        status: 'pending',
        qr_code: connectData.qrcode?.base64 || connectData.base64,
        qr_code_updated_at: new Date().toISOString(),
        api_key: instanceApiKey ?? undefined,
        webhook_url: webhookConfigured ? n8nWebhookUrl : null
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      throw insertError;
    }

    console.log('Instance created successfully:', instanceData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        instance: instanceData,
        qrCode: connectData.qrcode?.base64 || connectData.base64,
        webhookConfigured
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