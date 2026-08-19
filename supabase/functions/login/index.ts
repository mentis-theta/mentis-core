// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Capture Real IP
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';

    // Initialize Supabase Client with Service Role to check rate limits securely
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Rate Limiting Logic: Check recent failed attempts from this IP
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentAttempts, error: attemptsError } = await supabaseClient
      .from('login_attempts')
      .select('id')
      .eq('ip_address', clientIp)
      .eq('success', false)
      .gte('attempt_time', fiveMinutesAgo);

    if (attemptsError) {
      console.error('Error fetching login attempts:', attemptsError);
    }

    // Block if more than 5 failed attempts in the last 5 minutes
    if (recentAttempts && recentAttempts.length >= 5) {
      return new Response(JSON.stringify({ error: 'Muitas tentativas falhas. Tente novamente mais tarde.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if account is blocked
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('status')
      .eq('email', email)
      .single();

    if (profile?.status === 'blocked') {
      await supabaseClient.from('login_attempts').insert({
        email: email,
        ip_address: clientIp,
        success: false
      });

      return new Response(JSON.stringify({ error: 'Conta suspensa pelo administrador.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Proceed to authenticate
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Record failed attempt
      await supabaseClient.from('login_attempts').insert({
        email: email,
        ip_address: clientIp,
        success: false
      });

      return new Response(JSON.stringify({ error: 'E-mail ou senha incorretos.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record successful attempt
    await supabaseClient.from('login_attempts').insert({
      email: email,
      ip_address: clientIp,
      success: true
    });

    // Return the session so the client can log in
    return new Response(JSON.stringify({ session: authData.session }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
