import { getDb } from "./db";
import { tasks, taskFiles, clients, emailLogs } from "../drizzle/schema";
import { eq, and, isNull, lt, sql } from "drizzle-orm";
import { sendEmail } from "./email";
import { sendGuiaConfirmationWhatsApp } from "./whatsapp";

const EQUILIBRIUM_EMAIL = "contato@equilibriumcont.com";
const LAST_AUTO_SEND = new Map<number, number>(); // taskId -> timestamp

/**
 * Enviar automaticamente guias que estão pendentes há mais de 1 hora
 * Executado a cada 1 hora por uma tarefa agendada
 */
export async function autoSendPendingGuias(): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  try {
    const database = await getDb();
    if (!database) {
      return { sent: 0, failed: 0, errors: ["Database not available"] };
    }

    // Buscar tarefas com status "PENDENTE" que têm arquivos anexados
    const pendingTasks = await database
      .select()
      .from(tasks)
      .where(eq(tasks.status, "PENDENTE"))
      .limit(100);

    for (const task of pendingTasks) {
      try {
        // Verificar se já foi enviada automaticamente há menos de 1 hora
        const lastSend = LAST_AUTO_SEND.get(task.id) || 0;
        const now = Date.now();
        if (now - lastSend < 3600000) {
          // 1 hora em ms
          continue;
        }

        // Buscar arquivos da tarefa
        const files = await database
          .select()
          .from(taskFiles)
          .where(eq(taskFiles.taskId, task.id))
          .limit(1);

        if (files.length === 0) {
          continue; // Sem arquivos para enviar
        }

        // Buscar cliente
        const client = await database
          .select()
          .from(clients)
          .where(eq(clients.id, task.clientId))
          .limit(1);

        if (client.length === 0 || !client[0]?.email) {
          errors.push(`Task ${task.id}: Client not found or no email`);
          failed++;
          continue;
        }

        const file = files[0];
        const clientData = client[0];

        // Enviar e-mail ao cliente
        await sendEmail({
          to: clientData.email,
          subject: `Guia - ${task.title} (${task.competencia})`,
          html: `<p>Prezado(a) ${clientData.name},</p>
<p>Segue em anexo a guia referente a <strong>${task.title}</strong> da competência <strong>${task.competencia}</strong>.</p>
<p>Atenciosamente,<br/>Equilibrium Consultoria</p>`,
          attachments: file.fileUrl
            ? [
                {
                  filename: file.filename || "guia.pdf",
                  path: file.fileUrl,
                },
              ]
            : [],
        });

        // Enviar cópia para Equilibrium
        await sendEmail({
          to: EQUILIBRIUM_EMAIL,
          subject: `[CÓPIA] Guia enviada - ${clientData.name} - ${task.title}`,
          html: `<p>Cópia do envio de guia:</p>
<p><strong>Cliente:</strong> ${clientData.name}</p>
<p><strong>CNPJ:</strong> ${clientData.cnpj}</p>
<p><strong>Tarefa:</strong> ${task.title}</p>
<p><strong>Competência:</strong> ${task.competencia}</p>
<p><strong>E-mail do cliente:</strong> ${clientData.email}</p>
<p><strong>Hora do envio:</strong> ${new Date().toLocaleString("pt-BR")}</p>`,
          attachments: file.fileUrl
            ? [
                {
                  filename: file.filename || "guia.pdf",
                  path: file.fileUrl,
                },
              ]
            : [],
        });

        // Registrar envio no log
        await database.insert(emailLogs).values({
          taskId: task.id,
          clientId: task.clientId,
          sentAt: new Date(),
          sentBy: 1, // auto-send ID
          recipientEmail: clientData.email,
          subject: `Guia - ${task.title}`,
          status: "ENVIADO",
        } as any);

        // Enviar confirmação por WhatsApp (se houver telefone)
        if (clientData.phone) {
          await sendGuiaConfirmationWhatsApp(
            clientData.phone,
            task.title,
            clientData.name
          );
        }

        // Atualizar timestamp do último envio
        LAST_AUTO_SEND.set(task.id, now);
        sent++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Task ${task.id}: ${errorMsg}`);
        failed++;
      }
    }

    console.log(
      `[AutoSend] Completed: ${sent} sent, ${failed} failed, ${errors.length} errors`
    );
    return { sent, failed, errors };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[AutoSend] Fatal error:", errorMsg);
    return { sent: 0, failed: 0, errors: [errorMsg] };
  }
}

/**
 * Enviar alertas de tarefas vencendo em 3 dias
 */
export async function sendDueSoonAlerts(): Promise<{
  sent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sent = 0;

  try {
    const database = await getDb();
    if (!database) {
      return { sent: 0, errors: ["Database not available"] };
    }

    // Buscar tarefas que vencem em 3 dias
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const now = new Date();
    const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0];
    const nowStr = now.toISOString().split("T")[0];

    const dueSoonTasks = await database
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.status, "PENDENTE"),
          sql`${tasks.dueDate} < ${threeDaysStr}`,
          sql`${nowStr} < ${tasks.dueDate}`
        )
      );

    for (const task of dueSoonTasks) {
      try {
        const client = await database
          .select()
          .from(clients)
          .where(eq(clients.id, task.clientId))
          .limit(1);

        if (client.length === 0) continue;

        const clientData = client[0];
        const dueDateStr =
          task.dueDate instanceof Date
            ? task.dueDate.toLocaleDateString("pt-BR")
            : new Date(task.dueDate).toLocaleDateString("pt-BR");

        // Enviar alerta para Equilibrium
        await sendEmail({
          to: EQUILIBRIUM_EMAIL,
          subject: `⚠️ ALERTA: Tarefa vencendo em 3 dias - ${clientData.name}`,
          html: `<p><strong>ALERTA DE VENCIMENTO</strong></p>
<p><strong>Cliente:</strong> ${clientData.name}</p>
<p><strong>CNPJ:</strong> ${clientData.cnpj}</p>
<p><strong>Tarefa:</strong> ${task.title}</p>
<p><strong>Vencimento:</strong> ${dueDateStr}</p>
<p>Por favor, providencie o envio da guia ao cliente.</p>`,
        });

        sent++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Task ${task.id}: ${errorMsg}`);
      }
    }

    console.log(`[DueSoonAlerts] Sent ${sent} alerts`);
    return { sent, errors };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[DueSoonAlerts] Fatal error:", errorMsg);
    return { sent: 0, errors: [errorMsg] };
  }
}
