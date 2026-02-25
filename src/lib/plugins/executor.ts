/**
 * Plugin executor — executa código JavaScript de plugins de agentes.
 * Usa Function constructor com sandbox manual (sem vm2/edge restriction).
 * Timeout manual de 5s via Promise.race.
 */

export interface PluginExecutionResult {
  success: boolean
  output?: unknown
  error?: string
}

/**
 * Executa o código JavaScript de um plugin com o input fornecido.
 * Bloqueia acesso a globais perigosos (fetch, require, process, eval, etc.).
 *
 * @param code  - Código JS da função (deve conter lógica que opera sobre `input`)
 * @param input - Objeto de entrada passado para o plugin
 */
export async function executePlugin(
  code: string,
  input: Record<string, unknown>
): Promise<PluginExecutionResult> {
  const timeoutMs = 5000

  const executionPromise = new Promise<PluginExecutionResult>((resolve) => {
    try {
      // Validar sintaxe básica antes de executar
      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return resolve({ success: false, error: 'Código do plugin está vazio' })
      }

      // Criar função com sandbox — bloqueia globais perigosos
      // eslint-disable-next-line no-new-func
      const fn = new Function(
        'input',
        `
"use strict";
const fetch = undefined;
const require = undefined;
const process = undefined;
const eval = undefined;
const Function = undefined;
const XMLHttpRequest = undefined;
const WebSocket = undefined;
const importScripts = undefined;

${code}
`
      )

      const result = fn(input)

      // Suporta retorno síncrono ou Promise
      if (result && typeof result === 'object' && typeof result.then === 'function') {
        Promise.resolve(result)
          .then((val) => resolve({ success: true, output: val }))
          .catch((err: unknown) =>
            resolve({
              success: false,
              error: err instanceof Error ? err.message : String(err),
            })
          )
      } else {
        resolve({ success: true, output: result })
      }
    } catch (e: unknown) {
      resolve({
        success: false,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  })

  const timeoutPromise = new Promise<PluginExecutionResult>((resolve) =>
    setTimeout(
      () => resolve({ success: false, error: 'Timeout: plugin excedeu 5 segundos de execução' }),
      timeoutMs
    )
  )

  return Promise.race([executionPromise, timeoutPromise])
}

/**
 * Valida se o código JS do plugin tem sintaxe válida.
 */
export function validatePluginCode(code: string): { valid: boolean; error?: string } {
  try {
    // eslint-disable-next-line no-new-func
    new Function('input', code)
    return { valid: true }
  } catch (e: unknown) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : 'Erro de sintaxe desconhecido',
    }
  }
}

/**
 * Templates de plugins prontos para uso.
 */
export const PLUGIN_TEMPLATES = {
  calculadora: {
    name: 'Calculadora Simples',
    description: 'Realiza operações matemáticas básicas',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        operacao: { type: 'string', enum: ['soma', 'subtracao', 'multiplicacao', 'divisao'] },
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['operacao', 'a', 'b'],
    }),
    code: `const { operacao, a, b } = input;
switch (operacao) {
  case 'soma': return a + b;
  case 'subtracao': return a - b;
  case 'multiplicacao': return a * b;
  case 'divisao':
    if (b === 0) throw new Error('Divisão por zero');
    return a / b;
  default: throw new Error('Operação desconhecida: ' + operacao);
}`,
  },
  formatadorCep: {
    name: 'Formatador de CEP',
    description: 'Formata um CEP no padrão XXXXX-XXX',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        cep: { type: 'string', description: 'CEP com ou sem hífen' },
      },
      required: ['cep'],
    }),
    code: `const cep = String(input.cep).replace(/\\D/g, '');
if (cep.length !== 8) throw new Error('CEP deve ter 8 dígitos');
return cep.slice(0, 5) + '-' + cep.slice(5);`,
  },
  geradorSlug: {
    name: 'Gerador de Slug',
    description: 'Converte um texto em slug para URLs',
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Texto a converter em slug' },
      },
      required: ['texto'],
    }),
    code: `const texto = String(input.texto);
return texto
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\\u0300-\\u036f]/g, '')
  .replace(/[^a-z0-9\\s-]/g, '')
  .replace(/\\s+/g, '-')
  .replace(/-+/g, '-')
  .trim();`,
  },
}
