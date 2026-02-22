import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { processDocumentVectorization } from '@/lib/knowledge-context-v2';

// POST /api/knowledge/[id]/documents/upload - Upload de arquivo com suporte a PDF, DOCX, CSV, TXT, MD, JSON
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id },
    });

    if (!knowledgeBase) {
      return NextResponse.json({ error: 'Base de conhecimento não encontrada' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 });
    }

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['txt', 'md', 'csv', 'json', 'pdf', 'doc', 'docx'];

    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Formato não suportado: .${fileExtension}. Use: ${allowedExtensions.join(', ')}` },
        { status: 400 }
      );
    }

    // Limite de 20MB (aumentado para suportar PDFs maiores)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo excede o limite de 20MB' }, { status: 400 });
    }

    let textContent = '';
    const fileType = fileExtension;

    try {
      if (['txt', 'md'].includes(fileExtension)) {
        // Arquivos de texto puro
        textContent = await file.text();

      } else if (fileExtension === 'csv') {
        // CSV - converter para texto estruturado
        const csvText = await file.text();
        textContent = convertCsvToText(csvText);

      } else if (fileExtension === 'json') {
        // JSON - converter para texto legível
        const jsonText = await file.text();
        try {
          const parsed = JSON.parse(jsonText);
          textContent = convertJsonToText(parsed);
        } catch {
          textContent = jsonText; // fallback para texto bruto
        }

      } else if (fileExtension === 'pdf') {
        // PDF - usar pdf-parse para extração robusta
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        textContent = await extractTextFromPDFRobust(buffer);

      } else if (['doc', 'docx'].includes(fileExtension)) {
        // DOCX - usar mammoth para extração precisa
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        textContent = await extractTextFromDocxRobust(buffer);
      }

      if (!textContent.trim()) {
        return NextResponse.json(
          { error: 'Não foi possível extrair texto do arquivo. Verifique se o arquivo contém texto legível.' },
          { status: 400 }
        );
      }

      // Cria o documento inicialmente com status processing
      const document = await prisma.knowledgeDocument.create({
        data: {
          knowledgeBaseId: id,
          title: title || fileName.replace(/\.[^.]+$/, ''),
          content: textContent,
          sourceUrl: null,
          fileType,
          chunks: [],
          status: 'processing',
        },
      });

      // Processa embeddings em background (não bloqueia a resposta)
      processDocumentVectorization(document.id, textContent)
        .then(() => {
          console.log(`Document ${document.id} vectorized successfully`);
        })
        .catch((error) => {
          console.error(`Error vectorizing document ${document.id}:`, error);
        });

      return NextResponse.json({
        document,
        message: 'Documento enviado para processamento. Os embeddings serão gerados em breve.',
        stats: {
          characters: textContent.length,
          words: textContent.split(/\s+/).filter(Boolean).length,
          format: fileExtension.toUpperCase()
        }
      }, { status: 201 });

    } catch (processingError: any) {
      console.error('Error processing file:', processingError);

      // Salva documento com status de erro
      const document = await prisma.knowledgeDocument.create({
        data: {
          knowledgeBaseId: id,
          title: title || fileName.replace(/\.[^.]+$/, ''),
          content: textContent || `[Erro ao processar arquivo: ${fileName}]`,
          sourceUrl: null,
          fileType,
          chunks: [],
          status: 'error',
        },
      });

      return NextResponse.json({
        document,
        warning: `Arquivo salvo mas com erro no processamento: ${processingError.message || 'Erro desconhecido'}`
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload do documento' },
      { status: 500 }
    );
  }
}

/**
 * Extrai texto de PDF usando pdf-parse (robusto para PDFs modernos).
 * Suporta PDFs com texto comprimido, múltiplas páginas, fontes embarcadas.
 */
async function extractTextFromPDFRobust(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid build-time issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse: (buffer: Buffer, options?: { max?: number }) => Promise<{ text: string; numpages: number }> = require('pdf-parse');
    const data = await pdfParse(buffer, {
      // Limit pages to avoid memory issues with very large PDFs
      max: 200
    });

    if (!data.text?.trim()) {
      throw new Error('PDF sem texto extraível (pode ser um PDF de imagem)');
    }

    // Clean up the extracted text
    return data.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (error: any) {
    console.error('pdf-parse failed, trying fallback:', error.message);
    // Fallback to basic text extraction
    return extractTextFromPDFFallback(buffer);
  }
}

/**
 * Fallback básico para PDFs que o pdf-parse não consegue processar.
 */
function extractTextFromPDFFallback(buffer: Buffer): string {
  const text = buffer.toString('latin1');
  const textParts: string[] = [];

  // Extrair de blocos BT...ET (text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;

  while ((match = btEtRegex.exec(text)) !== null) {
    const block = match[1];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(tjMatch[1]);
    }
  }

  if (textParts.length === 0) {
    return '';
  }

  return textParts.join(' ')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai texto de DOCX usando mammoth (suporte completo a Word moderno).
 * Preserva parágrafos, tabelas e listas.
 */
async function extractTextFromDocxRobust(buffer: Buffer): Promise<string> {
  try {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });

    if (!result.value?.trim()) {
      throw new Error('DOCX sem texto extraível');
    }

    // Log any warnings
    if (result.messages?.length > 0) {
      console.log('mammoth warnings:', result.messages.map((m: any) => m.message).join(', '));
    }

    return result.value
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (error: any) {
    console.error('mammoth failed, trying fallback:', error.message);
    // Fallback XML-based extraction
    return extractTextFromDocxFallback(buffer);
  }
}

/**
 * Fallback para DOCX se o mammoth falhar.
 */
function extractTextFromDocxFallback(buffer: Buffer): string {
  const text = buffer.toString('utf-8');
  const textParts: string[] = [];
  const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match: RegExpExecArray | null;

  while ((match = wtRegex.exec(text)) !== null) {
    if (match[1]) textParts.push(match[1]);
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Converte CSV para texto estruturado e legível por IA.
 */
function convertCsvToText(csvText: string): string {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return '';

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  const textParts: string[] = [];

  // Add headers info
  textParts.push(`Planilha com ${lines.length - 1} registros e ${headers.length} colunas.`);
  textParts.push(`Colunas: ${headers.join(', ')}`);
  textParts.push('');

  // Convert each row to readable format
  for (let i = 1; i < Math.min(lines.length, 500); i++) {
    const values = parseCSVLine(lines[i]);
    const rowParts = headers.map((header, j) => `${header}: ${values[j] || ''}`)
    textParts.push(`Registro ${i}: ${rowParts.join(' | ')}`)
  }

  if (lines.length > 501) {
    textParts.push(`\n... e mais ${lines.length - 501} registros.`);
  }

  return textParts.join('\n');
}

/**
 * Parse a single CSV line handling quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Converte JSON para texto estruturado legível por IA.
 */
function convertJsonToText(data: any, depth = 0): string {
  if (depth > 5) return JSON.stringify(data); // Prevent infinite recursion

  if (Array.isArray(data)) {
    if (data.length === 0) return '(lista vazia)';
    const preview = data.slice(0, 50);
    const parts = preview.map((item, i) => `Item ${i + 1}: ${convertJsonToText(item, depth + 1)}`);
    if (data.length > 50) parts.push(`... e mais ${data.length - 50} itens.`);
    return parts.join('\n');
  }

  if (typeof data === 'object' && data !== null) {
    return Object.entries(data)
      .map(([key, value]) => `${key}: ${convertJsonToText(value, depth + 1)}`)
      .join('\n');
  }

  return String(data);
}
