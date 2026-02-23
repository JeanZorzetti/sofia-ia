import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Sofia AI — Public API',
    description:
      'REST API for programmatic access to Sofia AI orchestrations, agents and executions. Authenticate with an API key from /dashboard/api-keys.',
    version: '1.0.0',
    contact: {
      name: 'Sofia AI Support',
      url: 'https://sofiaia.roilabs.com.br/contato',
    },
    license: {
      name: 'MIT',
      url: 'https://github.com/JeanZorzetti/sofia-ia/blob/main/LICENSE',
    },
  },
  servers: [
    {
      url: 'https://sofiaia.roilabs.com.br',
      description: 'Production',
    },
  ],
  security: [{ ApiKeyHeader: [] }, { BearerToken: [] }],
  components: {
    securitySchemes: {
      ApiKeyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key from /dashboard/api-keys',
      },
      BearerToken: {
        type: 'http',
        scheme: 'bearer',
        description: 'Same API key as Authorization: Bearer sk_live_...',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
      Orchestration: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Content Pipeline' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'inactive', 'draft'] },
          agentCount: { type: 'integer', example: 3 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Agent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Research Agent' },
          description: { type: 'string', nullable: true },
          model: { type: 'string', example: 'llama-3.3-70b-versatile' },
          status: { type: 'string', enum: ['active', 'inactive'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Execution: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          orchestrationId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed'],
          },
          input: { type: 'object', nullable: true },
          output: { type: 'object', nullable: true },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          error: { type: 'string', nullable: true },
        },
      },
    },
  },
  paths: {
    '/api/public/orchestrations': {
      get: {
        summary: 'List orchestrations',
        description: 'Returns all active orchestrations belonging to the authenticated user.',
        operationId: 'listOrchestrations',
        tags: ['Orchestrations'],
        responses: {
          '200': {
            description: 'List of orchestrations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Orchestration' } },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid or missing API key',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/public/orchestrations/{id}/run': {
      post: {
        summary: 'Run an orchestration',
        description:
          'Triggers a new execution. Returns immediately with an executionId — poll /api/public/executions/{id} for the result.',
        operationId: 'runOrchestration',
        tags: ['Orchestrations'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Orchestration ID',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  input: {
                    type: 'string',
                    description: 'Initial input text for the first agent',
                    example: 'Write a blog post about AI orchestration',
                  },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Execution accepted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        executionId: { type: 'string' },
                        status: { type: 'string', example: 'pending' },
                        pollUrl: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'Orchestration not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/public/agents': {
      get: {
        summary: 'List agents',
        description: 'Returns all active agents belonging to the authenticated user.',
        operationId: 'listAgents',
        tags: ['Agents'],
        responses: {
          '200': {
            description: 'List of agents',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Agent' } },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/public/executions/{id}': {
      get: {
        summary: 'Get execution status',
        description:
          'Poll after calling /run to get status and, when completed, the full output.',
        operationId: 'getExecution',
        tags: ['Executions'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Execution ID returned by /run',
          },
        ],
        responses: {
          '200': {
            description: 'Execution details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Execution' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'Execution not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
}

export function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
