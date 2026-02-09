import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

// POST /api/integrations/[id]/test - Test integration connection
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

    const integration = await prisma.integration.findUnique({
      where: { id },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integração não encontrada' },
        { status: 404 }
      );
    }

    // Test based on integration type
    let testResult = { success: false, message: '' };

    switch (integration.type) {
      case 'whatsapp':
        testResult = await testWhatsAppConnection(integration);
        break;
      case 'webhook':
        testResult = await testWebhookConnection(integration);
        break;
      case 'api_rest':
        testResult = await testApiRestConnection(integration);
        break;
      case 'email_smtp':
        testResult = await testEmailSmtpConnection(integration);
        break;
      default:
        testResult = {
          success: false,
          message: 'Tipo de integração não suportado para teste',
        };
    }

    return NextResponse.json(testResult);
  } catch (error) {
    console.error('Error testing integration:', error);
    return NextResponse.json(
      { error: 'Erro ao testar integração' },
      { status: 500 }
    );
  }
}

async function testWhatsAppConnection(integration: {
  config: unknown;
  credentials: unknown;
}): Promise<{ success: boolean; message: string }> {
  try {
    const config = integration.config as Record<string, unknown>;
    const evolutionApiUrl = config.evolutionApiUrl as string | undefined;
    const instanceName = config.instanceName as string | undefined;
    const credentials = integration.credentials as Record<string, unknown>;
    const apiKey = credentials.apiKey as string | undefined;

    if (!evolutionApiUrl || !instanceName || !apiKey) {
      return {
        success: false,
        message: 'Configuração incompleta: URL da API, nome da instância e chave API são obrigatórios',
      };
    }

    const response = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Erro na conexão com Evolution API: ${response.status}`,
      };
    }

    const data = await response.json() as { state?: string };
    const isConnected = data.state === 'open';

    return {
      success: isConnected,
      message: isConnected
        ? 'Conexão WhatsApp estabelecida com sucesso'
        : `WhatsApp não conectado. Estado: ${data.state || 'desconhecido'}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro ao testar WhatsApp: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    };
  }
}

async function testWebhookConnection(integration: {
  config: unknown;
}): Promise<{ success: boolean; message: string }> {
  try {
    const config = integration.config as Record<string, unknown>;
    const webhookUrl = config.webhookUrl as string | undefined;

    if (!webhookUrl) {
      return {
        success: false,
        message: 'URL do webhook não configurada',
      };
    }

    // Send a test ping
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'test',
        message: 'Teste de conexão ROI Labs',
        timestamp: new Date().toISOString(),
      }),
    });

    return {
      success: response.ok,
      message: response.ok
        ? 'Webhook respondeu com sucesso'
        : `Webhook retornou status ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro ao testar webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    };
  }
}

async function testApiRestConnection(integration: {
  config: unknown;
  credentials: unknown;
}): Promise<{ success: boolean; message: string }> {
  try {
    const config = integration.config as Record<string, unknown>;
    const baseUrl = config.baseUrl as string | undefined;
    const testEndpoint = config.testEndpoint as string | undefined;
    const credentials = integration.credentials as Record<string, unknown>;

    if (!baseUrl) {
      return {
        success: false,
        message: 'URL base da API não configurada',
      };
    }

    const url = testEndpoint ? `${baseUrl}${testEndpoint}` : baseUrl;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth headers if provided
    if (credentials.apiKey) {
      headers['Authorization'] = `Bearer ${credentials.apiKey as string}`;
    }
    if (credentials.customHeaders) {
      Object.assign(headers, credentials.customHeaders as Record<string, string>);
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    return {
      success: response.ok,
      message: response.ok
        ? 'API REST respondeu com sucesso'
        : `API retornou status ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro ao testar API REST: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    };
  }
}

async function testEmailSmtpConnection(integration: {
  credentials: unknown;
}): Promise<{ success: boolean; message: string }> {
  const credentials = integration.credentials as Record<string, unknown>;
  const host = credentials.host as string | undefined;
  const port = credentials.port as number | undefined;
  const user = credentials.user as string | undefined;
  const pass = credentials.pass as string | undefined;

  if (!host || !port || !user || !pass) {
    return {
      success: false,
      message: 'Configuração SMTP incompleta: host, porta, usuário e senha são obrigatórios',
    };
  }

  // For now, just validate that credentials are present
  // In production, you would use nodemailer to test actual connection
  return {
    success: true,
    message: 'Credenciais SMTP configuradas (teste de conexão real será implementado)',
  };
}
