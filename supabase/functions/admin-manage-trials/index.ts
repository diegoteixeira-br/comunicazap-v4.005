import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-MANAGE-TRIALS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Verificar se o usuário é admin
    const { data: isAdminData } = await supabaseClient
      .rpc('is_admin');

    if (!isAdminData) {
      logStep("User is not admin");
      return new Response(JSON.stringify({ error: "Unauthorized - Admin only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    logStep("Admin verified");

    const { action, user_ids, days } = await req.json();

    if (!action || !user_ids || !Array.isArray(user_ids)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Processing action", { action, userCount: user_ids.length, days });

    switch (action) {
      case 'activate_trial': {
        const trialDays = days || 7;
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

        for (const userId of user_ids) {
          await supabaseClient
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              status: 'trial',
              trial_active: true,
              trial_ends_at: trialEndsAt.toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        }

        logStep("Trials activated", { count: user_ids.length, days: trialDays });
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: `${user_ids.length} trial(s) ativado(s) por ${trialDays} dias` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'deactivate_trial': {
        for (const userId of user_ids) {
          await supabaseClient
            .from('user_subscriptions')
            .update({
              status: 'inactive',
              trial_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        }

        logStep("Trials deactivated", { count: user_ids.length });
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: `${user_ids.length} trial(s) desativado(s)` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'extend_trial': {
        const extensionDays = days || 7;

        for (const userId of user_ids) {
          const { data: subscription } = await supabaseClient
            .from('user_subscriptions')
            .select('trial_ends_at')
            .eq('user_id', userId)
            .maybeSingle();

          if (subscription?.trial_ends_at) {
            const currentEndDate = new Date(subscription.trial_ends_at);
            const newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + extensionDays);

            await supabaseClient
              .from('user_subscriptions')
              .update({
                trial_ends_at: newEndDate.toISOString(),
                trial_active: true,
                status: 'trial',
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);
          }
        }

        logStep("Trials extended", { count: user_ids.length, days: extensionDays });
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: `${user_ids.length} trial(s) estendido(s) por ${extensionDays} dias` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});