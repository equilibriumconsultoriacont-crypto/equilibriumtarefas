import twilio from "twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+5519999560591";

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!client && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return client;
}

export interface WhatsAppMessage {
  to: string; // Número do cliente com formato: whatsapp:+55XXXXX
  body: string;
  mediaUrl?: string;
}

/**
 * Enviar mensagem de WhatsApp para o cliente
 */
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> {
  try {
    const client = getClient();
    if (!client) {
      console.warn("[WhatsApp] Twilio not configured. Skipping message.");
      return {
        success: false,
        error: "Twilio not configured",
      };
    }

    const result = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: message.to,
      body: message.body,
      ...(message.mediaUrl && { mediaUrl: [message.mediaUrl] }),
    } as any);

    return {
      success: true,
      messageSid: result.sid,
    };
  } catch (error) {
    console.error("[WhatsApp] Error sending message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Formatar número de telefone para WhatsApp
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove caracteres especiais
  const cleaned = phone.replace(/\D/g, "");
  // Adiciona prefixo whatsapp: e código do país
  if (!cleaned.startsWith("55")) {
    return `whatsapp:+55${cleaned}`;
  }
  return `whatsapp:+${cleaned}`;
}

/**
 * Enviar lembrete de tarefa vencendo por WhatsApp
 */
export async function sendTaskReminderWhatsApp(
  clientPhone: string,
  taskTitle: string,
  dueDate: Date,
  clientName: string
): Promise<{ success: boolean; error?: string }> {
  const formattedPhone = formatPhoneForWhatsApp(clientPhone);
  const dueDateStr = dueDate.toLocaleDateString("pt-BR");

  const message = `Olá ${clientName}! 📋\n\nLembrete: A tarefa "${taskTitle}" vence em ${dueDateStr}.\n\nPor favor, providencie a documentação necessária.\n\nAtenciosamente,\nEquilibrium Consultoria`;

  return sendWhatsAppMessage({
    to: formattedPhone,
    body: message,
  });
}

/**
 * Enviar confirmação de guia enviada por WhatsApp
 */
export async function sendGuiaConfirmationWhatsApp(
  clientPhone: string,
  taskTitle: string,
  clientName: string
): Promise<{ success: boolean; error?: string }> {
  const formattedPhone = formatPhoneForWhatsApp(clientPhone);

  const message = `Olá ${clientName}! ✅\n\nSua guia "${taskTitle}" foi enviada com sucesso.\n\nAcesse seu e-mail para visualizar o documento em anexo.\n\nAtenciosamente,\nEquilibrium Consultoria`;

  return sendWhatsAppMessage({
    to: formattedPhone,
    body: message,
  });
}
