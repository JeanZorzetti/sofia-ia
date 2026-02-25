/**
 * Google Sheets integration tools.
 * Ferramentas para ler, escrever e adicionar dados em planilhas Google Sheets.
 */

import { getOAuthConnection } from './oauth'

/**
 * Busca o token de acesso do Google Sheets para um usuário.
 * Lança erro se não houver conexão configurada.
 */
async function getGoogleSheetsToken(userId: string): Promise<string> {
  const connection = await getOAuthConnection(userId, 'google-sheets')
  if (!connection) {
    throw new Error(
      'Google Sheets não conectado. Acesse /dashboard/integrations/google-sheets para conectar.'
    )
  }
  return connection.accessToken
}

/**
 * Tool: sheets_read — lê células de uma planilha Google Sheets.
 * @param userId ID do usuário
 * @param spreadsheetId ID da planilha (da URL do Google Sheets)
 * @param range Range no formato A1 (ex: "Sheet1!A1:D10")
 */
export async function sheetsRead(
  userId: string,
  spreadsheetId: string,
  range: string
): Promise<{ values: unknown[][]; range: string; majorDimension: string }> {
  const accessToken = await getGoogleSheetsToken(userId)

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Google Sheets API error (read): ${response.status} ${err}`)
  }

  const data = await response.json()
  return {
    values: data.values || [],
    range: data.range || range,
    majorDimension: data.majorDimension || 'ROWS',
  }
}

/**
 * Tool: sheets_write — escreve/atualiza células em uma planilha Google Sheets.
 * @param userId ID do usuário
 * @param spreadsheetId ID da planilha
 * @param range Range no formato A1 (ex: "Sheet1!A1")
 * @param values Array de arrays com os valores a escrever
 */
export async function sheetsWrite(
  userId: string,
  spreadsheetId: string,
  range: string,
  values: unknown[][]
): Promise<{ updatedRange: string; updatedRows: number; updatedColumns: number; updatedCells: number }> {
  const accessToken = await getGoogleSheetsToken(userId)

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Google Sheets API error (write): ${response.status} ${err}`)
  }

  const data = await response.json()
  return {
    updatedRange: data.updatedRange || range,
    updatedRows: data.updatedRows || 0,
    updatedColumns: data.updatedColumns || 0,
    updatedCells: data.updatedCells || 0,
  }
}

/**
 * Tool: sheets_append — adiciona uma nova linha ao final de uma planilha.
 * @param userId ID do usuário
 * @param spreadsheetId ID da planilha
 * @param sheetName Nome da aba (ex: "Sheet1" ou "Dados")
 * @param row Array com os valores da nova linha
 */
export async function sheetsAppend(
  userId: string,
  spreadsheetId: string,
  sheetName: string,
  row: unknown[]
): Promise<{ spreadsheetId: string; tableRange: string; updates: { updatedRows: number; updatedCells: number } }> {
  const accessToken = await getGoogleSheetsToken(userId)

  const range = `${sheetName}`
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: [row],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Google Sheets API error (append): ${response.status} ${err}`)
  }

  const data = await response.json()
  return {
    spreadsheetId: data.spreadsheetId || spreadsheetId,
    tableRange: data.tableRange || range,
    updates: {
      updatedRows: data.updates?.updatedRows || 1,
      updatedCells: data.updates?.updatedCells || row.length,
    },
  }
}

/**
 * Executa uma tool de Google Sheets dado o nome e input.
 * Usado pelo sistema de tools dos agentes.
 */
export async function runGoogleSheetsTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string
): Promise<unknown> {
  switch (toolName) {
    case 'sheets_read':
      return sheetsRead(
        userId,
        input.spreadsheetId as string,
        input.range as string
      )
    case 'sheets_write':
      return sheetsWrite(
        userId,
        input.spreadsheetId as string,
        input.range as string,
        input.values as unknown[][]
      )
    case 'sheets_append':
      return sheetsAppend(
        userId,
        input.spreadsheetId as string,
        input.sheetName as string,
        input.row as unknown[]
      )
    default:
      throw new Error(`Tool Google Sheets desconhecida: ${toolName}`)
  }
}

/**
 * Definições de tools Google Sheets para injeção em agentes.
 */
export const GOOGLE_SHEETS_TOOL_DEFINITIONS = [
  {
    name: 'sheets_read',
    description:
      'Lê células de uma planilha Google Sheets. Use para buscar dados de planilhas.',
    inputSchema: {
      type: 'object',
      properties: {
        spreadsheetId: {
          type: 'string',
          description: 'ID da planilha (encontrado na URL do Google Sheets)',
        },
        range: {
          type: 'string',
          description: 'Range no formato A1 (ex: "Sheet1!A1:D10" ou "A:Z")',
        },
      },
      required: ['spreadsheetId', 'range'],
    },
  },
  {
    name: 'sheets_write',
    description:
      'Escreve/atualiza células em uma planilha Google Sheets. Use para atualizar dados existentes.',
    inputSchema: {
      type: 'object',
      properties: {
        spreadsheetId: {
          type: 'string',
          description: 'ID da planilha',
        },
        range: {
          type: 'string',
          description: 'Range inicial para escrita (ex: "Sheet1!A1")',
        },
        values: {
          type: 'array',
          description: 'Array de arrays com os valores. Cada array interno é uma linha.',
          items: { type: 'array' },
        },
      },
      required: ['spreadsheetId', 'range', 'values'],
    },
  },
  {
    name: 'sheets_append',
    description:
      'Adiciona uma nova linha ao final de uma aba da planilha Google Sheets.',
    inputSchema: {
      type: 'object',
      properties: {
        spreadsheetId: {
          type: 'string',
          description: 'ID da planilha',
        },
        sheetName: {
          type: 'string',
          description: 'Nome da aba (ex: "Sheet1", "Dados", "Leads")',
        },
        row: {
          type: 'array',
          description: 'Array com os valores da nova linha',
          items: {},
        },
      },
      required: ['spreadsheetId', 'sheetName', 'row'],
    },
  },
]
