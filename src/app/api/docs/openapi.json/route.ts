import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Polaris IA — Public API',
    description:
      'REST API for programmatic access to Polaris IA teams, agents and runs. Authenticate with an API key from /dashboard/api-keys.',
    version: '1.0.0',
    contact: {
      name: 'Polaris IA Support',
      url: 'https://polarisia.com.br/contato',
    },
    license: {
      name: 'MIT',
      url: 'https://github.com/JeanZorzetti/sofia-ia/blob/main/LICENSE',
    },
  },
  servers: [
    {
      url: 'https://polarisia.com.br',
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
      Team: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Content Pipeline' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'inactive'] },
          memberCount: { type: 'integer', example: 3 },
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
      TeamRun: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          teamId: { type: 'string' },
          mission: { type: 'string', nullable: true },
          mode: { type: 'string', enum: ['chat', 'code'] },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed'],
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/api/public/teams': {
      get: {
        summary: 'List teams',
        description: 'Returns all teams belonging to the authenticated user.',
        operationId: 'listTeams',
        tags: ['Teams'],
        responses: {
          '200': {
            description: 'List of teams',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Team' } },
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
    '/api/public/teams/{id}/run': {
      post: {
        summary: 'Run a team',
        description:
          'Triggers a new team run (Lead coordinates Workers). Returns immediately with a runId — the result is delivered via the team output webhook (configure it in the team room).',
        operationId: 'runTeam',
        tags: ['Teams'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Team ID',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  mission: {
                    type: 'string',
                    description: 'The mission/task for the team (aliases: input, message)',
                    example: 'Write a blog post about AI teams',
                  },
                  mode: {
                    type: 'string',
                    enum: ['chat', 'code'],
                    default: 'chat',
                    description: 'Run mode',
                  },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Run accepted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        runId: { type: 'string' },
                        status: { type: 'string', example: 'pending' },
                        mode: { type: 'string', example: 'chat' },
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
            description: 'Team not found',
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
