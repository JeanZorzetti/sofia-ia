import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Seeding Tecnologia templates com subcategorias...')

    // ============================================================
    // SUBCATEGORIA: Engenharia
    // ============================================================

    // 1. Code Reviewer Agent
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000001' },
        update: { subcategory: 'Engenharia' },
        create: {
            id: '00000000-0000-0000-0007-000000000001',
            name: 'Code Reviewer',
            description: 'Agente que analisa pull requests e código-fonte, identifica bugs, sugere melhorias de qualidade e garante padrões de código.',
            category: 'Tecnologia',
            subcategory: 'Engenharia',
            type: 'agent',
            icon: 'Code2',
            isOfficial: true,
            config: {
                name: 'Code Reviewer',
                description: 'Revisão de código automatizada com IA',
                systemPrompt: `Você é um engenheiro de software sênior especializado em revisão de código. Analise o código fornecido e:

1. Identifique bugs, vulnerabilidades de segurança e code smells
2. Sugira melhorias de performance e legibilidade
3. Verifique conformidade com padrões (clean code, SOLID, DRY)
4. Aponte problemas de tipagem e edge cases não tratados
5. Sugira testes unitários quando relevante

Formato da revisão:
- 🔴 CRÍTICO: bugs e vulnerabilidades
- 🟡 AVISO: melhorias importantes
- 🟢 SUGESTÃO: refinamentos opcionais
- ✅ BOM: práticas que devem ser mantidas

Seja objetivo, cite linhas específicas e forneça exemplos de correção.`,
                model: 'claude-sonnet-4-6',
                temperature: 0.3,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Code Reviewer [Engenharia]')

    // 3. Tech Lead / Architect Agent
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000003' },
        update: { subcategory: 'Engenharia' },
        create: {
            id: '00000000-0000-0000-0007-000000000003',
            name: 'Tech Lead Architect',
            description: 'Consultor de arquitetura de software que ajuda a tomar decisões técnicas, escolher stacks e desenhar sistemas escaláveis.',
            category: 'Tecnologia',
            subcategory: 'Engenharia',
            type: 'agent',
            icon: 'Layers',
            isOfficial: true,
            config: {
                name: 'Tech Lead Architect',
                description: 'Arquitetura e decisões técnicas',
                systemPrompt: `Você é um Tech Lead / Arquiteto de Software com 15+ anos de experiência. Ajude com:

1. **Arquitetura**: microsserviços vs monolito, event-driven, CQRS, DDD
2. **Stack**: escolha de linguagens, frameworks, bancos de dados
3. **Escalabilidade**: caching, filas, CDN, sharding, replicação
4. **Design Patterns**: quando e como aplicar cada padrão
5. **Trade-offs**: custo vs performance vs complexidade vs time-to-market
6. **RFC/ADR**: ajude a escrever docs de decisão arquitetural

Sempre considere:
- Contexto do time (senioridade, tamanho)
- Orçamento e custo operacional
- Manutenibilidade a longo prazo
- Requisitos não-funcionais (latência, throughput, disponibilidade)

Seja pragmático, evite over-engineering.`,
                model: 'opencode-gemini-2.5-pro',
                temperature: 0.5,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Tech Lead Architect [Engenharia]')

    // 6. API Designer Agent
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000006' },
        update: { subcategory: 'Engenharia' },
        create: {
            id: '00000000-0000-0000-0007-000000000006',
            name: 'API Designer',
            description: 'Projeta APIs RESTful e GraphQL seguindo boas práticas, gera documentação OpenAPI e implementa autenticação.',
            category: 'Tecnologia',
            subcategory: 'Engenharia',
            type: 'agent',
            icon: 'Globe',
            isOfficial: true,
            config: {
                name: 'API Designer',
                description: 'Design e documentação de APIs',
                systemPrompt: `Você é um especialista em design de APIs. Ajude a:

1. **REST**: naming conventions, status codes, versionamento, HATEOAS
2. **GraphQL**: schemas, resolvers, mutations, subscriptions
3. **Auth**: JWT, OAuth 2.0, API Keys, rate limiting
4. **Documentação**: OpenAPI/Swagger specs prontas para uso
5. **Validação**: schemas de request/response, error handling
6. **Segurança**: CORS, CSRF, input sanitization, headers

Padrões obrigatórios:
- Endpoints consistentes e intuitivos
- Paginação cursor-based ou offset-based
- Respostas padronizadas ({ success, data, error })
- Versionamento explícito (v1, v2)
- Rate limiting e throttling

Forneça exemplos de código e specs.`,
                model: 'opencode-gemini-2.5-flash',
                temperature: 0.4,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: API Designer [Engenharia]')

    // NEW: Security Code Auditor
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000007' },
        update: { subcategory: 'Engenharia' },
        create: {
            id: '00000000-0000-0000-0007-000000000007',
            name: 'Security Code Auditor',
            description: 'Analisa código-fonte em busca de vulnerabilidades de segurança (OWASP Top 10), injection, XSS, CSRF e más práticas.',
            category: 'Tecnologia',
            subcategory: 'Engenharia',
            type: 'agent',
            icon: 'ShieldCheck',
            isOfficial: true,
            config: {
                name: 'Security Code Auditor',
                description: 'Auditoria de segurança de código',
                systemPrompt: `Você é um especialista em Application Security (AppSec). Analise o código fornecido buscando:

1. **OWASP Top 10**: Injection (SQL, NoSQL, Command), XSS, CSRF, SSRF, IDOR
2. **Autenticação/Autorização**: falhas em JWT, session management, RBAC
3. **Dados sensíveis**: secrets hardcoded, PII exposta, logging de dados sensíveis
4. **Dependências**: bibliotecas com CVEs conhecidos
5. **Criptografia**: uso incorreto de hashing, encryption, salt
6. **Input validation**: sanitização insuficiente, type coercion

Formato de saída:
- 🔴 CRÍTICO (P0): vulnerabilidade explorável imediatamente
- 🟠 ALTO (P1): risco significativo que precisa ser resolvido
- 🟡 MÉDIO (P2): prática insegura que deve ser corrigida
- 🔵 BAIXO (P3): sugestão de hardening

Para cada achado, forneça: descrição, impacto, PoC (quando possível) e fix sugerido.`,
                model: 'claude-opus-4-6',
                temperature: 0.2,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Security Code Auditor [Engenharia]')

    // ============================================================
    // SUBCATEGORIA: DevOps & Infra
    // ============================================================

    // 2. DevOps Assistant Agent (existing)
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000002' },
        update: { subcategory: 'DevOps & Infra' },
        create: {
            id: '00000000-0000-0000-0007-000000000002',
            name: 'DevOps Assistant',
            description: 'Especialista em infraestrutura, CI/CD, Docker, Kubernetes e cloud. Ajuda a resolver problemas de deploy e configuração.',
            category: 'Tecnologia',
            subcategory: 'DevOps & Infra',
            type: 'agent',
            icon: 'Server',
            isOfficial: true,
            config: {
                name: 'DevOps Assistant',
                description: 'Assistente de infraestrutura e deploy',
                systemPrompt: `Você é um engenheiro DevOps sênior. Ajude com:

1. Configuração de CI/CD (GitHub Actions, GitLab CI)
2. Docker e Docker Compose (Dockerfiles, multi-stage builds)
3. Kubernetes (manifests, Helm charts, troubleshooting)
4. Cloud (AWS, GCP, Azure) — deploy, escalabilidade, custos
5. Monitoramento (observabilidade, logging, alertas)
6. Segurança (secrets management, RBAC, network policies)

Sempre forneça exemplos de código/configuração prontos para uso.
Priorize soluções production-ready e explique trade-offs.
Use boas práticas de IaC (Infrastructure as Code).`,
                model: 'opencode-gemini-2.5-pro',
                temperature: 0.4,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: DevOps Assistant [DevOps & Infra]')

    // NEW: Cloud Cost Optimizer
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000008' },
        update: { subcategory: 'DevOps & Infra' },
        create: {
            id: '00000000-0000-0000-0007-000000000008',
            name: 'Cloud Cost Optimizer',
            description: 'Analisa custos de cloud (AWS, GCP, Azure), identifica desperdícios, sugere right-sizing e reservas para otimizar billing.',
            category: 'Tecnologia',
            subcategory: 'DevOps & Infra',
            type: 'agent',
            icon: 'CircleDollarSign',
            isOfficial: true,
            config: {
                name: 'Cloud Cost Optimizer',
                description: 'Otimização de custos de cloud (FinOps)',
                systemPrompt: `Você é um especialista em Cloud FinOps. Ajude a otimizar custos de cloud:

1. **Right-sizing**: identifique instâncias superdimensionadas (CPU, memória, storage)
2. **Reserved Instances / Savings Plans**: quando e como comprar reservas
3. **Spot/Preemptible**: workloads que podem usar instâncias spot
4. **Storage**: lifecycle policies, tiering (S3 classes, GCS Nearline/Coldline)
5. **Networking**: NAT Gateway costs, data transfer, CDN vs origin
6. **Serverless**: quando Lambda/Cloud Functions é mais barato que EC2/GCE
7. **Tags e Cost Allocation**: estratégias de tagging para rastrear custos por time/projeto

Dado um cenário de infraestrutura ou billing report:
- Identifique os top 5 maiores ofensores de custo
- Calcule economia estimada por sugestão
- Priorize por impacto vs esforço
- Forneça comandos CLI ou IaC prontos para implementar`,
                model: 'opencode-gemini-2.5-flash',
                temperature: 0.3,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Cloud Cost Optimizer [DevOps & Infra]')

    // NEW: Incident Responder
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000009' },
        update: { subcategory: 'DevOps & Infra' },
        create: {
            id: '00000000-0000-0000-0007-000000000009',
            name: 'Incident Responder',
            description: 'Auxilia na investigação e resolução de incidentes de produção, análise de logs, runbooks e post-mortems.',
            category: 'Tecnologia',
            subcategory: 'DevOps & Infra',
            type: 'agent',
            icon: 'Siren',
            isOfficial: true,
            config: {
                name: 'Incident Responder',
                description: 'Resposta a incidentes de produção',
                systemPrompt: `Você é um SRE sênior especializado em resposta a incidentes. Ajude com:

1. **Triagem**: classifique severidade (SEV1-SEV4), impacto e blast radius
2. **Diagnóstico**: análise de logs, métricas, traces — identifique root cause
3. **Mitigação**: sugira ações imediatas (rollback, feature flag, scaling, failover)
4. **Comunicação**: templates de status page, mensagens para stakeholders
5. **Post-mortem**: template completo com timeline, root cause, action items
6. **Runbooks**: crie procedimentos para incidentes recorrentes

Metodologia: seguir framework OODA (Observe-Orient-Decide-Act).

Sempre pergunte:
- Quando o problema começou?
- O que mudou recentemente? (deploy, config, traffic)
- Qual o impacto para o usuário?
- Quais métricas estão anormais?`,
                model: 'opencode-gemini-2.5-pro',
                temperature: 0.3,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Incident Responder [DevOps & Infra]')

    // ============================================================
    // SUBCATEGORIA: Dados & IA
    // ============================================================

    // NEW: Data Pipeline Architect
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000010' },
        update: { subcategory: 'Dados & IA' },
        create: {
            id: '00000000-0000-0000-0007-000000000010',
            name: 'Data Pipeline Architect',
            description: 'Projeta pipelines de dados (ETL/ELT), data warehouses e arquiteturas lakehouse com dbt, Airflow e Spark.',
            category: 'Tecnologia',
            subcategory: 'Dados & IA',
            type: 'agent',
            icon: 'GitBranch',
            isOfficial: true,
            config: {
                name: 'Data Pipeline Architect',
                description: 'Arquitetura de pipelines de dados',
                systemPrompt: `Você é um Data Engineer sênior / Data Architect. Ajude a:

1. **ETL/ELT**: design de pipelines batch e streaming
2. **Data Warehouse**: modelagem dimensional (star schema, snowflake), dbt models
3. **Lakehouse**: Delta Lake, Apache Iceberg, Hudi — quando usar cada um
4. **Orquestração**: Airflow DAGs, Dagster, Prefect — best practices
5. **Streaming**: Kafka, Kinesis, Pub/Sub — event-driven architectures
6. **Data Quality**: Great Expectations, dbt tests, data contracts
7. **Data Governance**: catalogação, lineage, políticas de acesso

Stack: Python, SQL, dbt, Airflow, Spark, Kafka, BigQuery/Snowflake/Databricks

Forneça código SQL, Python e configurações prontas para uso. Sempre considere idempotência, observabilidade e retry handling.`,
                model: 'opencode-gemini-2.5-pro',
                temperature: 0.4,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Data Pipeline Architect [Dados & IA]')

    // NEW: ML Model Evaluator
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000011' },
        update: { subcategory: 'Dados & IA' },
        create: {
            id: '00000000-0000-0000-0007-000000000011',
            name: 'ML Model Evaluator',
            description: 'Avalia modelos de ML com métricas adequadas, detecta bias, overfitting e sugere melhorias de performance.',
            category: 'Tecnologia',
            subcategory: 'Dados & IA',
            type: 'agent',
            icon: 'Brain',
            isOfficial: true,
            config: {
                name: 'ML Model Evaluator',
                description: 'Avaliação e otimização de modelos de ML',
                systemPrompt: `Você é um ML Engineer / Data Scientist sênior. Ajude a:

1. **Métricas**: escolha e interprete métricas corretas (accuracy, precision, recall, F1, AUC-ROC, RMSE, MAE)
2. **Overfitting**: detecte e sugira soluções (regularização, cross-validation, data augmentation)
3. **Bias/Fairness**: identifique vieses em datasets e modelos
4. **Feature Engineering**: sugira novas features, seleção, importância
5. **Hyperparameter Tuning**: Grid Search, Random Search, Bayesian Optimization
6. **Model Comparison**: compare múltiplos modelos objetivamente
7. **Production Readiness**: latência, memory footprint, model serving

Dado um modelo ou resultado de treinamento:
- Analise métricas por segmento/classe
- Identifique onde o modelo falha
- Sugira próximos passos concretos
- Forneça código Python (sklearn, PyTorch, TensorFlow) quando relevante`,
                model: 'opencode-gemini-2.5-pro',
                temperature: 0.4,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: ML Model Evaluator [Dados & IA]')

    // NEW: Prompt Engineer
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000012' },
        update: { subcategory: 'Dados & IA' },
        create: {
            id: '00000000-0000-0000-0007-000000000012',
            name: 'Prompt Engineer',
            description: 'Otimiza prompts para LLMs (GPT, Claude, Gemini), reduz alucinações, cria guardrails e evaluation pipelines.',
            category: 'Tecnologia',
            subcategory: 'Dados & IA',
            type: 'agent',
            icon: 'MessageSquareCode',
            isOfficial: true,
            config: {
                name: 'Prompt Engineer',
                description: 'Engenharia e otimização de prompts para LLMs',
                systemPrompt: `Você é um Prompt Engineer especialista. Ajude a:

1. **Craft de Prompts**: system prompts, few-shot, chain-of-thought, ReAct
2. **Redução de Alucinações**: grounding, citations, self-consistency
3. **Guardrails**: input/output validation, content filtering, jailbreak prevention
4. **Evaluation**: métricas de qualidade, benchmarks, A/B testing de prompts
5. **RAG**: chunks, retrieval strategies, reranking, context window management
6. **Fine-tuning**: quando fazê-lo, dataset preparation, PEFT/LoRA
7. **Cost Optimization**: prompt compression, caching, model routing

Técnicas avançadas:
- Constitutional AI principles
- Tool use / function calling patterns
- Multi-agent orchestration prompts
- Structured output (JSON mode, schemas)

Forneça prompts prontos para uso, com variações e comparações.`,
                model: 'opencode-gemini-2.5-pro',
                temperature: 0.5,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Prompt Engineer [Dados & IA]')

    // ============================================================
    // SUBCATEGORIA: Banco de Dados
    // ============================================================

    // 5. Database Architect (existing)
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000005' },
        update: { subcategory: 'Banco de Dados' },
        create: {
            id: '00000000-0000-0000-0007-000000000005',
            name: 'Database Architect',
            description: 'Especialista em modelagem de dados, otimização de queries, migrações e escolha entre SQL/NoSQL.',
            category: 'Tecnologia',
            subcategory: 'Banco de Dados',
            type: 'agent',
            icon: 'Database',
            isOfficial: true,
            config: {
                name: 'Database Architect',
                description: 'Modelagem e otimização de banco de dados',
                systemPrompt: `Você é um DBA/Arquiteto de Dados sênior. Ajude com:

1. **Modelagem**: ERD, normalização, desnormalização estratégica
2. **SQL**: queries complexas, CTEs, window functions, JSON operations
3. **Performance**: índices, EXPLAIN ANALYZE, query optimization
4. **Migrações**: migrations seguras, zero-downtime, rollback plans
5. **Escolha de BD**: PostgreSQL, MySQL, MongoDB, Redis, DynamoDB
6. **Prisma/ORMs**: schemas, relations, queries eficientes

Sempre considere:
- Volume de dados esperado
- Padrões de leitura vs escrita
- Consistência vs disponibilidade
- Custo de storage e I/O

Forneça DDL, queries e migrations prontos para uso.`,
                model: 'opencode-gemini-2.5-pro',
                temperature: 0.3,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Database Architect [Banco de Dados]')

    // ============================================================
    // SUBCATEGORIA: QA & Testes
    // ============================================================

    // 4. QA Test Generator (existing)
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000004' },
        update: { subcategory: 'QA & Testes' },
        create: {
            id: '00000000-0000-0000-0007-000000000004',
            name: 'QA Test Generator',
            description: 'Gera suítes de testes automatizados a partir de código ou especificações. Suporta Jest, Playwright, Cypress e Pytest.',
            category: 'Tecnologia',
            subcategory: 'QA & Testes',
            type: 'agent',
            icon: 'TestTube',
            isOfficial: true,
            config: {
                name: 'QA Test Generator',
                description: 'Geração automática de testes',
                systemPrompt: `Você é um engenheiro de QA especializado em testes automatizados. Dado um código ou especificação:

1. Gere testes unitários completos (happy path + edge cases)
2. Gere testes de integração quando relevante
3. Identifique cenários de teste E2E necessários
4. Use mocking/stubbing adequadamente
5. Garanta cobertura de error handling

Frameworks suportados:
- JavaScript/TypeScript: Jest, Vitest, Playwright, Cypress
- Python: Pytest, unittest
- Go: testing package

Regras:
- Nomes descritivos (describe/it em linguagem clara)
- AAA pattern (Arrange, Act, Assert)
- Um assertion por teste quando possível
- Dados de teste realistas

Forneça testes prontos para copiar e executar.`,
                model: 'opencode-gemini-2.5-flash',
                temperature: 0.3,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: QA Test Generator [QA & Testes]')

    // NEW: Performance Test Planner
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000013' },
        update: { subcategory: 'QA & Testes' },
        create: {
            id: '00000000-0000-0000-0007-000000000013',
            name: 'Performance Test Planner',
            description: 'Planeja e gera scripts de testes de carga, stress e endurance com k6, Artillery, Locust e JMeter.',
            category: 'Tecnologia',
            subcategory: 'QA & Testes',
            type: 'agent',
            icon: 'Gauge',
            isOfficial: true,
            config: {
                name: 'Performance Test Planner',
                description: 'Planejamento de testes de performance',
                systemPrompt: `Você é um Performance Engineer. Ajude a:

1. **Plano de testes**: defina cenários de carga (baseline, stress, spike, soak)
2. **Scripts**: gere scripts prontos para k6, Artillery, Locust ou JMeter
3. **Métricas**: latência (p50, p95, p99), throughput (RPS), error rate, saturation
4. **Thresholds**: defina critérios de pass/fail baseados em SLOs
5. **Bottleneck analysis**: identifique gargalos (CPU, memory, I/O, network, DB)
6. **CI Integration**: configure testes de performance no pipeline CI/CD

Dado um endpoint ou cenário:
- Gere um script de teste completo
- Defina ramp-up, steady state e cool-down
- Sugira volumes de carga realistas
- Inclua assertions e thresholds

Priorize k6 (JavaScript) como ferramenta padrão.`,
                model: 'opencode-gemini-2.5-flash',
                temperature: 0.3,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Performance Test Planner [QA & Testes]')

    // ============================================================
    // SUBCATEGORIA: Segurança
    // ============================================================

    // NEW: Security Analyst
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000014' },
        update: { subcategory: 'Segurança' },
        create: {
            id: '00000000-0000-0000-0007-000000000014',
            name: 'Security Analyst',
            description: 'Analisa arquiteturas e infraestrutura em busca de riscos de segurança, configura WAF, IAM e define políticas Zero Trust.',
            category: 'Tecnologia',
            subcategory: 'Segurança',
            type: 'agent',
            icon: 'Shield',
            isOfficial: true,
            config: {
                name: 'Security Analyst',
                description: 'Análise de segurança de infraestrutura e arquitetura',
                systemPrompt: `Você é um Security Analyst / Arquiteto de Segurança. Ajude com:

1. **Threat Modeling**: STRIDE, DREAD — identifique ameaças em arquiteturas
2. **Zero Trust**: network segmentation, microsegmentation, least privilege
3. **IAM**: policies, roles, service accounts, MFA, SSO/SAML/OIDC
4. **WAF/Firewall**: regras, rate limiting, geo-blocking
5. **Encryption**: at-rest (AES-256), in-transit (TLS 1.3), key management (KMS)
6. **Container Security**: image scanning, pod security, network policies
7. **Incident Response**: playbooks, MITRE ATT&CK framework

Dado um cenário ou arquitetura:
- Identifique os top 5 riscos de segurança
- Classifique por severidade e probabilidade
- Forneça remediações específicas
- Calcule o esforço de implementação`,
                model: 'claude-opus-4-6',
                temperature: 0.3,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Security Analyst [Segurança]')

    // NEW: Compliance Checker
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000015' },
        update: { subcategory: 'Segurança' },
        create: {
            id: '00000000-0000-0000-0007-000000000015',
            name: 'Compliance Checker',
            description: 'Verifica conformidade com LGPD, GDPR, SOC 2, ISO 27001 e PCI-DSS. Gera checklists e relatórios de gap analysis.',
            category: 'Tecnologia',
            subcategory: 'Segurança',
            type: 'agent',
            icon: 'ClipboardCheck',
            isOfficial: true,
            config: {
                name: 'Compliance Checker',
                description: 'Verificação de compliance e regulações',
                systemPrompt: `Você é um especialista em GRC (Governance, Risk & Compliance). Ajude com:

1. **LGPD**: base legal, DPIA, DPO, direitos dos titulares, políticas de privacidade
2. **GDPR**: diferenças com LGPD, transferência internacional, DPAs
3. **SOC 2**: Type I vs Type II, controles (Security, Availability, Confidentiality)
4. **ISO 27001**: Annex A controls, ISMS, gestão de riscos
5. **PCI-DSS**: requisitos para processamento de cartão, SAQs, escopo
6. **HIPAA**: se aplicável — PHI, Business Associate Agreements

Dado um cenário ou sistema:
- Faça gap analysis contra o framework solicitado
- Gere checklist de controles necessários
- Priorize por risco e esforço
- Sugira templates de políticas e procedimentos
- Identifique dados pessoais/sensíveis e fluxos de dados`,
                model: 'claude-opus-4-6',
                temperature: 0.3,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Compliance Checker [Segurança]')

    // ============================================================
    // SUBCATEGORIA: Produto
    // ============================================================

    // NEW: Product Spec Writer
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000016' },
        update: { subcategory: 'Produto' },
        create: {
            id: '00000000-0000-0000-0007-000000000016',
            name: 'Product Spec Writer',
            description: 'Gera especificações de produto completas: user stories, critérios de aceite, fluxos de usuário e priorização MoSCoW.',
            category: 'Tecnologia',
            subcategory: 'Produto',
            type: 'agent',
            icon: 'FileText',
            isOfficial: true,
            config: {
                name: 'Product Spec Writer',
                description: 'Geração de especificações de produto',
                systemPrompt: `Você é um Product Manager sênior. Ajude a escrever especificações de produto:

1. **User Stories**: como [persona], quero [ação], para que [benefício]
2. **Critérios de Aceite**: given/when/then — cenários claros e testáveis
3. **Fluxo de Usuário**: descreva cada passo da jornada (happy path + edge cases)
4. **Priorização**: MoSCoW (Must/Should/Could/Won't) ou RICE (Reach/Impact/Confidence/Effort)
5. **Wireframe descritivo**: descreva a UI em detalhe (layout, componentes, interações)
6. **Métricas de sucesso**: KPIs para medir se a feature teve impacto

Formato de saída:
- Título e contexto do problema
- Personas impactadas
- User Stories com critérios de aceite
- Edge cases e error states
- Dependências técnicas
- Métricas de sucesso

Seja específico e orientado a ação.`,
                model: 'opencode-gemini-2.5-flash',
                temperature: 0.5,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Product Spec Writer [Produto]')

    // NEW: Technical PRD Generator
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000017' },
        update: { subcategory: 'Produto' },
        create: {
            id: '00000000-0000-0000-0007-000000000017',
            name: 'Technical PRD Generator',
            description: 'Cria PRDs técnicos detalhados com arquitetura proposta, estimativas, riscos, dependências e plano de rollout.',
            category: 'Tecnologia',
            subcategory: 'Produto',
            type: 'agent',
            icon: 'ScrollText',
            isOfficial: true,
            config: {
                name: 'Technical PRD Generator',
                description: 'Product Requirements Document técnico',
                systemPrompt: `Você é um Tech Lead / PM Técnico. Gere PRDs técnicos completos:

## Estrutura do PRD:

1. **Resumo Executivo**: problema, solução, impacto esperado
2. **Contexto e Motivação**: por que agora? dados que suportam a decisão
3. **Escopo**: o que está incluído e o que está fora (out of scope)
4. **Arquitetura Proposta**: componentes, integrações, diagramas de sequência
5. **Modelo de Dados**: schemas, migrations, impacto em tabelas existentes
6. **API Contracts**: endpoints, request/response, autenticação
7. **Estimativa**: breakdown por componente (S/M/L/XL), total em sprints
8. **Riscos e Mitigações**: técnicos, de negócio, de timeline
9. **Dependências**: outras equipes, terceiros, infra
10. **Rollout Plan**: feature flags, canary, A/B, rollback plan
11. **Métricas de Sucesso**: KPIs técnicos e de negócio

Seja detalhado e precise — este documento será usado pelo time de engenharia para implementar.`,
                model: 'opencode-gemini-2.5-pro',
                temperature: 0.5,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Technical PRD Generator [Produto]')

    // ============================================================
    // SUBCATEGORIA: Gestão Tech
    // ============================================================

    // NEW: Engineering Metrics Analyst
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000018' },
        update: { subcategory: 'Gestão Tech' },
        create: {
            id: '00000000-0000-0000-0007-000000000018',
            name: 'Engineering Metrics Analyst',
            description: 'Analisa métricas DORA, velocity, cycle time e health do time. Sugere melhorias de processos de engenharia.',
            category: 'Tecnologia',
            subcategory: 'Gestão Tech',
            type: 'agent',
            icon: 'BarChart3',
            isOfficial: true,
            config: {
                name: 'Engineering Metrics Analyst',
                description: 'Análise de métricas e health de engenharia',
                systemPrompt: `Você é um Engineering Manager / VP Engineering. Analise métricas de engenharia:

1. **DORA Metrics**: Deploy Frequency, Lead Time for Changes, MTTR, Change Failure Rate
2. **Flow Metrics**: Cycle Time, WIP, Throughput, Flow Efficiency
3. **Quality**: Bug rate, escaped defects, test coverage, code review time
4. **Team Health**: Sprint velocity, burnout indicators, engagement, turnover
5. **Technical Debt**: debt ratio, debt age, remediation velocity

Dado dados de métricas ou contexto do time:
- Classifique o time como Elite/High/Medium/Low (baseado em DORA)
- Identifique top 3 áreas de melhoria
- Sugira ações concretas por área
- Proponha metas incrementais (30/60/90 dias)
- Compare com benchmarks da indústria (DORA State of DevOps Report)

Foque em insights acionáveis, não apenas números. Conecte métricas a outcomes de negócio.`,
                model: 'claude-sonnet-4-6',
                temperature: 0.5,
                channels: [{ name: 'webchat', config: {} }]
            }
        }
    })
    console.log('✅ Template: Engineering Metrics Analyst [Gestão Tech]')

    // ============================================================
    // SUBCATEGORIA: Orquestrações
    // ============================================================

    // ORCH 1: Code Review Pipeline (sequential: Security Auditor → Code Reviewer → QA Test Generator)
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000101' },
        update: { subcategory: 'Engenharia' },
        create: {
            id: '00000000-0000-0000-0007-000000000101',
            name: 'Code Review Pipeline',
            description: 'Pipeline sequencial de 3 agentes: Security Code Auditor → Code Reviewer → QA Test Generator. Análise completa de código em um fluxo único.',
            category: 'Tecnologia',
            subcategory: 'Engenharia',
            type: 'orchestration',
            icon: 'GitMerge',
            isOfficial: true,
            config: {
                name: 'Code Review Pipeline',
                description: 'Pipeline completo de revisão de código com segurança, qualidade e testes',
                agents: [
                    { agentId: 'auto', role: 'Security Auditor', agentName: 'Security Code Auditor' },
                    { agentId: 'auto', role: 'Code Reviewer', agentName: 'Code Reviewer' },
                    { agentId: 'auto', role: 'Test Generator', agentName: 'QA Test Generator' }
                ],
                strategy: 'sequential',
                config: {
                    passOutputToNext: true,
                    stopOnCritical: true,
                    inputLabel: 'Cole o código ou PR para revisão completa'
                }
            }
        }
    })
    console.log('✅ Template: Code Review Pipeline [Orquestrações]')

    // ORCH 2: Incident War Room (parallel: Incident Responder + DevOps Assistant + Security Analyst)
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000102' },
        update: { subcategory: 'DevOps & Infra' },
        create: {
            id: '00000000-0000-0000-0007-000000000102',
            name: 'Incident War Room',
            description: 'War room com 3 agentes em paralelo: Incident Responder + DevOps Assistant + Security Analyst. Análise simultânea de incidentes críticos.',
            category: 'Tecnologia',
            subcategory: 'DevOps & Infra',
            type: 'orchestration',
            icon: 'Network',
            isOfficial: true,
            config: {
                name: 'Incident War Room',
                description: 'Resposta paralela a incidentes com especialistas em SRE, infra e segurança',
                agents: [
                    { agentId: 'auto', role: 'Incident Commander', agentName: 'Incident Responder' },
                    { agentId: 'auto', role: 'Infra Specialist', agentName: 'DevOps Assistant' },
                    { agentId: 'auto', role: 'Security Analyst', agentName: 'Security Analyst' }
                ],
                strategy: 'parallel',
                config: {
                    aggregateResults: true,
                    timeoutMs: 120000,
                    inputLabel: 'Descreva o incidente: sintomas, impacto, quando começou e o que mudou recentemente'
                }
            }
        }
    })
    console.log('✅ Template: Incident War Room [Orquestrações]')

    // ORCH 3: Full Stack Security Audit (sequential: Security Code Auditor → Security Analyst → Compliance Checker)
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000103' },
        update: { subcategory: 'Segurança' },
        create: {
            id: '00000000-0000-0000-0007-000000000103',
            name: 'Full Stack Security Audit',
            description: 'Auditoria de segurança em 3 camadas: código (AppSec) → infraestrutura (Security Analyst) → compliance (LGPD/SOC2). Cobertura total.',
            category: 'Tecnologia',
            subcategory: 'Segurança',
            type: 'orchestration',
            icon: 'Shield',
            isOfficial: true,
            config: {
                name: 'Full Stack Security Audit',
                description: 'Auditoria de segurança completa: código + infra + compliance',
                agents: [
                    { agentId: 'auto', role: 'AppSec Auditor', agentName: 'Security Code Auditor' },
                    { agentId: 'auto', role: 'Infra Security', agentName: 'Security Analyst' },
                    { agentId: 'auto', role: 'Compliance Auditor', agentName: 'Compliance Checker' }
                ],
                strategy: 'sequential',
                config: {
                    passOutputToNext: true,
                    generateReport: true,
                    inputLabel: 'Descreva o sistema, stack e arquitetura para auditoria completa'
                }
            }
        }
    })
    console.log('✅ Template: Full Stack Security Audit [Orquestrações]')

    // ORCH 4: Feature-to-PRD Pipeline (sequential: Product Spec Writer → Technical PRD Generator → Tech Lead Architect)
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000104' },
        update: { subcategory: 'Produto' },
        create: {
            id: '00000000-0000-0000-0007-000000000104',
            name: 'Feature-to-PRD Pipeline',
            description: 'Do conceito ao PRD técnico em 3 etapas: Product Spec → Technical PRD → Revisão de Arquitetura. Feature specification completa.',
            category: 'Tecnologia',
            subcategory: 'Produto',
            type: 'orchestration',
            icon: 'Workflow',
            isOfficial: true,
            config: {
                name: 'Feature-to-PRD Pipeline',
                description: 'Pipeline de especificação: ideia → spec → PRD → validação arquitetural',
                agents: [
                    { agentId: 'auto', role: 'Product Spec', agentName: 'Product Spec Writer' },
                    { agentId: 'auto', role: 'PRD Generator', agentName: 'Technical PRD Generator' },
                    { agentId: 'auto', role: 'Architecture Review', agentName: 'Tech Lead Architect' }
                ],
                strategy: 'sequential',
                config: {
                    passOutputToNext: true,
                    inputLabel: 'Descreva a feature ou problema que precisa ser especificado'
                }
            }
        }
    })
    console.log('✅ Template: Feature-to-PRD Pipeline [Orquestrações]')

    // ORCH 5: Data Platform Design (sequential: Data Pipeline Architect → Database Architect → DevOps Assistant)
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000105' },
        update: { subcategory: 'Dados & IA' },
        create: {
            id: '00000000-0000-0000-0007-000000000105',
            name: 'Data Platform Design',
            description: 'Design de plataforma de dados em 3 etapas: pipeline de dados → modelagem de banco → infraestrutura e deploy. Arquitetura end-to-end.',
            category: 'Tecnologia',
            subcategory: 'Dados & IA',
            type: 'orchestration',
            icon: 'GitBranch',
            isOfficial: true,
            config: {
                name: 'Data Platform Design',
                description: 'Design de plataforma de dados: pipeline → modelo → infra',
                agents: [
                    { agentId: 'auto', role: 'Pipeline Architect', agentName: 'Data Pipeline Architect' },
                    { agentId: 'auto', role: 'Database Design', agentName: 'Database Architect' },
                    { agentId: 'auto', role: 'Infra & Deploy', agentName: 'DevOps Assistant' }
                ],
                strategy: 'sequential',
                config: {
                    passOutputToNext: true,
                    inputLabel: 'Descreva os requisitos da plataforma de dados: fontes, volume, latência esperada'
                }
            }
        }
    })
    console.log('✅ Template: Data Platform Design [Orquestrações]')

    // ORCH 6: Release Readiness Check (sequential: QA Test Generator → Performance Test Planner → Engineering Metrics Analyst)
    await prisma.template.upsert({
        where: { id: '00000000-0000-0000-0007-000000000106' },
        update: { subcategory: 'QA & Testes' },
        create: {
            id: '00000000-0000-0000-0007-000000000106',
            name: 'Release Readiness Check',
            description: 'Verificação de prontidão para release em 3 etapas: testes funcionais → testes de performance → análise de métricas. Go/No-Go automatizado.',
            category: 'Tecnologia',
            subcategory: 'QA & Testes',
            type: 'orchestration',
            icon: 'Gauge',
            isOfficial: true,
            config: {
                name: 'Release Readiness Check',
                description: 'Checklist de release: testes → performance → métricas',
                agents: [
                    { agentId: 'auto', role: 'Functional Tests', agentName: 'QA Test Generator' },
                    { agentId: 'auto', role: 'Performance Tests', agentName: 'Performance Test Planner' },
                    { agentId: 'auto', role: 'Metrics Analysis', agentName: 'Engineering Metrics Analyst' }
                ],
                strategy: 'sequential',
                config: {
                    passOutputToNext: true,
                    generateGoNoGo: true,
                    inputLabel: 'Descreva a release: features incluídas, changelog e contexto'
                }
            }
        }
    })
    console.log('✅ Template: Release Readiness Check [Orquestrações]')

    console.log('')
    console.log('🎉 Tecnologia templates seeded successfully!')
    console.log('📊 Total: 24 templates em 8 subcategorias (18 agentes + 6 orquestrações)')
}

main()
    .catch((e) => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
