/**
 * Totvs ERP integration tools.
 * Ferramentas para buscar clientes e criar pedidos via Totvs Protheus REST API.
 *
 * Configuração via variáveis de ambiente:
 *   TOTVS_API_URL    — URL base da API Protheus (ex: https://protheus.empresa.com/rest)
 *   TOTVS_USERNAME   — usuário do Protheus
 *   TOTVS_PASSWORD   — senha do Protheus
 *
 * O token de auth é gerado via Basic Auth ou via endpoint de autenticação do Fluig.
 */

import { prisma } from '@/lib/prisma'

interface TotvsConfig {
  apiUrl: string
  username: string
  password: string
}

/**
 * Busca a config Totvs do usuário armazenada no banco, ou usa variáveis de ambiente globais.
 */
async function getTotvsConfig(userId: string): Promise<TotvsConfig> {
  // Tentar buscar config do usuário no banco (campo metadata da integração)
  const integration = await prisma.integration.findFirst({
    where: { type: 'totvs', status: 'active' },
  }).catch(() => null)

  if (integration) {
    const cfg = (integration.config as Record<string, string>) || {}
    if (cfg.apiUrl && cfg.username && cfg.password) {
      return { apiUrl: cfg.apiUrl, username: cfg.username, password: cfg.password }
    }
  }

  // Fallback para variáveis de ambiente
  const apiUrl = process.env.TOTVS_API_URL
  const username = process.env.TOTVS_USERNAME
  const password = process.env.TOTVS_PASSWORD

  if (!apiUrl || !username || !password) {
    throw new Error(
      'Totvs não configurado. Acesse /dashboard/integrations/totvs para configurar as credenciais.'
    )
  }

  return { apiUrl, username, password }
}

/**
 * Gera header de autenticação Basic para Protheus REST.
 */
function getBasicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

/**
 * Tool: totvs_get_customer — busca cliente no Totvs Protheus pelo código.
 * @param userId ID do usuário
 * @param code   Código do cliente no Protheus (campo A1_COD)
 */
export async function totvsGetCustomer(
  userId: string,
  code: string
): Promise<Record<string, unknown>> {
  const { apiUrl, username, password } = await getTotvsConfig(userId)

  const response = await fetch(
    `${apiUrl}/FWMODEL/CUSTOMERS?$filter=A1_COD eq '${encodeURIComponent(code)}'&$format=json`,
    {
      headers: {
        Authorization: getBasicAuthHeader(username, password),
        Accept: 'application/json',
      },
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Totvs API error (get_customer): ${response.status} ${err}`)
  }

  const data = await response.json()
  const items = data.value || data.items || []

  if (items.length === 0) {
    return { found: false, message: `Cliente '${code}' não encontrado no Protheus.` }
  }

  return { found: true, customer: items[0] }
}

/**
 * Tool: totvs_create_order — cria pedido de venda no Totvs Protheus.
 * @param userId     ID do usuário
 * @param customerId Código do cliente
 * @param items      Array de itens do pedido [{productCode, quantity, unitPrice}]
 */
export async function totvsCreateOrder(
  userId: string,
  customerId: string,
  items: Array<{ productCode: string; quantity: number; unitPrice: number }>
): Promise<{ orderId: string; status: string; message: string }> {
  const { apiUrl, username, password } = await getTotvsConfig(userId)

  const payload = {
    C5_CLIENTE: customerId,
    C5_LOJACLI: '01',
    itens: items.map((item, i) => ({
      C6_ITEM: String(i + 1).padStart(2, '0'),
      C6_PRODUTO: item.productCode,
      C6_QTDVEN: item.quantity,
      C6_PRCVEN: item.unitPrice,
    })),
  }

  const response = await fetch(`${apiUrl}/FWMODEL/SALESORDERS`, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(username, password),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Totvs API error (create_order): ${response.status} ${err}`)
  }

  const data = await response.json()
  return {
    orderId: data.C5_NUM || data.orderId || 'N/A',
    status: 'created',
    message: `Pedido criado com sucesso para o cliente ${customerId}.`,
  }
}

/**
 * Executa uma tool do Totvs dado o nome e input.
 */
export async function runTotvsToool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string
): Promise<unknown> {
  switch (toolName) {
    case 'totvs_get_customer':
      return totvsGetCustomer(userId, input.code as string)
    case 'totvs_create_order':
      return totvsCreateOrder(
        userId,
        input.customerId as string,
        input.items as Array<{ productCode: string; quantity: number; unitPrice: number }>
      )
    default:
      throw new Error(`Tool Totvs desconhecida: ${toolName}`)
  }
}

/**
 * Definições de tools Totvs para injeção em agentes.
 */
export const TOTVS_TOOL_DEFINITIONS = [
  {
    name: 'totvs_get_customer',
    description:
      'Busca dados de um cliente no Totvs Protheus pelo código. Retorna nome, CNPJ, endereço e situação.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Código do cliente no Protheus (campo A1_COD)',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'totvs_create_order',
    description:
      'Cria um pedido de venda no Totvs Protheus para um cliente com os itens especificados.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'Código do cliente no Protheus',
        },
        items: {
          type: 'array',
          description: 'Lista de itens do pedido',
          items: {
            type: 'object',
            properties: {
              productCode: { type: 'string', description: 'Código do produto' },
              quantity: { type: 'number', description: 'Quantidade' },
              unitPrice: { type: 'number', description: 'Preço unitário' },
            },
            required: ['productCode', 'quantity', 'unitPrice'],
          },
        },
      },
      required: ['customerId', 'items'],
    },
  },
]
