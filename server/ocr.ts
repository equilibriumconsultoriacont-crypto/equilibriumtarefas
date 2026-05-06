import { invokeLLM } from "./_core/llm";

export interface DocumentRecognition {
  documentType: string; // DAS, NFS, DCTF, SPED, etc.
  cnpj?: string;
  competencia?: string; // MM/YYYY
  confidence: number; // 0-100
  extractedText?: string;
}

/**
 * Reconhecer tipo de guia e extrair informações do PDF usando IA
 * Suporta: DAS, NFS, DCTF, SPED, e outros documentos contábeis
 */
export async function recognizeDocument(
  fileUrl: string,
  mimeType: string
): Promise<DocumentRecognition> {
  try {
    // Se não for PDF, retornar erro
    if (!mimeType.includes("pdf") && !mimeType.includes("image")) {
      return {
        documentType: "UNKNOWN",
        confidence: 0,
      };
    }

    // Chamar LLM para analisar o documento
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Você é um especialista em documentos contábeis brasileiros. 
Analise o documento fornecido e extraia as seguintes informações em JSON:
- documentType: tipo do documento (DAS, NFS, DCTF, SPED, IRPF, ECF, ou outro)
- cnpj: CNPJ do cliente (formato XX.XXX.XXX/XXXX-XX)
- competencia: competência do documento (formato MM/YYYY)
- confidence: confiança da identificação (0-100)
- extractedText: texto relevante extraído

Responda APENAS com JSON válido, sem markdown.`,
        },
        {
          role: "user",
          content: [
            {
              type: "file_url",
              file_url: {
                url: fileUrl,
                detail: "high",
              },
            } as any,
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "document_recognition",
          strict: true,
          schema: {
            type: "object",
            properties: {
              documentType: {
                type: "string",
                description: "Tipo de documento (DAS, NFS, DCTF, etc.)",
              },
              cnpj: {
                type: "string",
                description: "CNPJ extraído do documento",
              },
              competencia: {
                type: "string",
                description: "Competência do documento (MM/YYYY)",
              },
              confidence: {
                type: "integer",
                description: "Confiança da identificação (0-100)",
              },
              extractedText: {
                type: "string",
                description: "Texto relevante extraído",
              },
            },
            required: ["documentType", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = typeof response.choices[0]?.message?.content === 'string' 
      ? response.choices[0]?.message?.content 
      : JSON.stringify(response.choices[0]?.message?.content);
    if (!content) {
      return {
        documentType: "UNKNOWN",
        confidence: 0,
      };
    }

    const parsed = JSON.parse(content);
    return {
      documentType: parsed.documentType || "UNKNOWN",
      cnpj: parsed.cnpj,
      competencia: parsed.competencia,
      confidence: parsed.confidence || 0,
      extractedText: parsed.extractedText,
    };
  } catch (error) {
    console.error("[OCR] Error recognizing document:", error);
    return {
      documentType: "UNKNOWN",
      confidence: 0,
    };
  }
}

/**
 * Mapear tipo de documento reconhecido para tipo de tarefa recorrente
 */
export function mapDocumentTypeToTaskType(
  documentType: string
): string {
  const mapping: Record<string, string> = {
    DAS: "DAS Simples Nacional",
    NFS: "Emissão de Nota de Serviço",
    DCTF: "DCTF - Declaração de Débitos e Créditos",
    SPED: "SPED Fiscal",
    IRPF: "IRPF - Imposto de Renda",
    ECF: "ECF - Escrituração Contábil Fiscal",
    RPA: "RPA - Recibo de Pagamento Autônomo",
  };

  return mapping[documentType] || documentType;
}
