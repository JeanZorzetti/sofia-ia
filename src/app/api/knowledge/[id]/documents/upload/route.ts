import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { chunkText } from '@/lib/chunking';
import { generateEmbeddingsBatch } from '@/lib/embeddings';

// POST /api/knowledge/[id]/documents/upload - Upload de arquivo
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

    // Limite de 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo excede o limite de 10MB' }, { status: 400 });
    }

    let textContent = '';
    let fileType = fileExtension;
    let status = 'processing';

    try {
      if (['txt', 'md', 'csv'].includes(fileExtension)) {
        // Arquivos de texto puro
        textContent = await file.text();
      } else if (fileExtension === 'json') {
        // JSON - converter para texto legível
        const jsonText = await file.text();
        const parsed = JSON.parse(jsonText);
        textContent = JSON.stringify(parsed, null, 2);
      } else if (fileExtension === 'pdf') {
        // PDF - extrair texto das páginas
        const arrayBuffer = await file.arrayBuffer();
        textContent = await extractTextFromPDF(new Uint8Array(arrayBuffer));
      } else if (['doc', 'docx'].includes(fileExtension)) {
        // DOC/DOCX - extrair texto básico
        const arrayBuffer = await file.arrayBuffer();
        textContent = extractTextFromDocx(new Uint8Array(arrayBuffer));
      }

      if (!textContent.trim()) {
        return NextResponse.json(
          { error: 'Não foi possível extrair texto do arquivo. Verifique se o arquivo contém texto.' },
          { status: 400 }
        );
      }

      const chunks = chunkText(textContent);

      // Gerar embeddings para os chunks
      try {
        const chunkTexts = chunks.map(c => c.text);
        const embeddings = await generateEmbeddingsBatch(chunkTexts);

        // Adiciona embeddings aos chunks
        const chunksWithEmbeddings = chunks.map((chunk, index) => ({
          ...chunk,
          embedding: embeddings[index],
        }));

        status = 'completed';

        const document = await prisma.knowledgeDocument.create({
          data: {
            knowledgeBaseId: id,
            title: title || fileName,
            content: textContent,
            sourceUrl: null,
            fileType,
            chunks: chunksWithEmbeddings as any,
            status,
          },
        });

        return NextResponse.json({ document }, { status: 201 });
      } catch (embeddingError) {
        console.warn('Failed to generate embeddings, saving without them:', embeddingError);

        // Salva sem embeddings se houver erro
        status = 'completed';

        const document = await prisma.knowledgeDocument.create({
          data: {
            knowledgeBaseId: id,
            title: title || fileName,
            content: textContent,
            sourceUrl: null,
            fileType,
            chunks: chunks as any,
            status,
          },
        });

        return NextResponse.json({ document, warning: 'Documento processado sem embeddings' }, { status: 201 });
      }

    } catch (processingError) {
      console.error('Error processing file:', processingError);

      // Salva documento com status de erro
      const document = await prisma.knowledgeDocument.create({
        data: {
          knowledgeBaseId: id,
          title: title || fileName,
          content: textContent || `[Erro ao processar arquivo: ${fileName}]`,
          sourceUrl: null,
          fileType,
          chunks: [],
          status: 'error',
        },
      });

      return NextResponse.json({ document, warning: 'Arquivo salvo mas com erro no processamento' }, { status: 201 });
    }
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload do documento' },
      { status: 500 }
    );
  }
}

/**
 * Extrai texto de um PDF usando parsing básico de streams de conteúdo.
 * Para PDFs simples com texto não-comprimido funciona bem.
 * Para PDFs complexos, retorna o texto que conseguir extrair.
 */
async function extractTextFromPDF(data: Uint8Array): Promise<string> {
  const text = new TextDecoder('latin1').decode(data);
  const textParts: string[] = [];

  // Método 1: Extrair de blocos BT...ET (text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;

  while ((match = btEtRegex.exec(text)) !== null) {
    const block = match[1];
    // Extrair strings entre parênteses (operador Tj)
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(tjMatch[1]);
    }

    // Extrair de arrays TJ
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrMatch: RegExpExecArray | null;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const arrayContent = tjArrMatch[1];
      const stringRegex = /\(([^)]*)\)/g;
      let strMatch: RegExpExecArray | null;
      while ((strMatch = stringRegex.exec(arrayContent)) !== null) {
        textParts.push(strMatch[1]);
      }
    }
  }

  // Método 2: Se nenhum texto encontrado, tentar extrair de streams
  if (textParts.length === 0) {
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    while ((match = streamRegex.exec(text)) !== null) {
      const streamContent = match[1];
      // Extrair apenas caracteres ASCII legíveis
      const readable = streamContent.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      if (readable.length > 50) {
        textParts.push(readable);
      }
    }
  }

  let result = textParts.join(' ')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();

  return result;
}

/**
 * Extrai texto de DOCX (que é um ZIP contendo XML).
 * Busca texto dentro das tags XML do document.xml.
 */
function extractTextFromDocx(data: Uint8Array): string {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(data);

  // DOCX é um ZIP - procurar conteúdo XML dentro dele
  // Buscar texto entre tags <w:t> do word/document.xml
  const textParts: string[] = [];
  const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match: RegExpExecArray | null;

  while ((match = wtRegex.exec(text)) !== null) {
    if (match[1]) {
      textParts.push(match[1]);
    }
  }

  if (textParts.length > 0) {
    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  }

  // Fallback: extrair qualquer texto legível
  const readable = text.replace(/[^\x20-\x7E\n\r\tÀ-ÿ]/g, ' ').replace(/\s+/g, ' ').trim();
  // Retornar apenas se houver texto significativo
  if (readable.length > 100) {
    return readable;
  }

  return '';
}
