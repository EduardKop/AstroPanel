import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const messages = body.messages || [];

    if (!messages.length) return new Response('OK', { status: 200 });

    for (const msg of messages) {
        // Игнорируем твои ответы (isEcho: true)
        if (msg.isEcho === false) {
            
            const chatId = msg.chatId; 
            const channelId = msg.channelId;
            const name = msg.contact?.name || "Unknown";
            const avatar = msg.contact?.avatarUri || null;
            const isComment = !!msg.instPost; // Определяем тип текущего сообщения

            // МАГИЯ UPSERT:
            // Мы просим базу: "Вставь эти данные. Если такой клиент уже есть - обнови ему имя, аватарку и время последнего сообщения".
            // Мы СПЕЦИАЛЬНО не передаем created_at, чтобы он сохранился старым (вчерашним).
            
            const { error } = await supabase
                .from('leads')
                .upsert({
                    wazzup_chat_id: chatId,
                    channel_id: channelId,
                    name: name,
                    avatar_url: avatar,
                    // Если это новый лид - запишется тип (коммент/директ).
                    // Если старый - мы можем решить, перезаписывать ли тип входа. 
                    // Обычно лучше оставить is_comment как есть (откуда пришел первый раз), 
                    // либо обновлять. В данном коде он обновится на тип последнего сообщения.
                    is_comment: isComment, 
                    last_message_at: new Date().toISOString()
                }, { 
                    onConflict: 'wazzup_chat_id, channel_id' 
                });

            if (error) {
                console.error("DB Error:", error);
            } else {
                // Лог для проверки
                console.log(`[Lead Activity] ${name} (Channel: ${channelId})`);
            }
        }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response('OK', { status: 200 });
  }
})