/**
 * WebMCP (rascunho W3C Web Machine Learning CG) — ferramentas para agentes de IA no navegador.
 * Saída silenciosa quando o navegador não expõe a API. Não altera a UI nem o SEO.
 *
 * Nenhuma ferramenta envia mensagem: a de maior valor apenas gera o link do WhatsApp
 * e a pessoa decide abrir. Dados vêm das Content Collections (ver WebMcp.astro).
 */

interface Opcao {
  slug: string;
  nome: string;
}

interface WebMcpData {
  empresa: {
    nome: string;
    telefone: string;
    whatsapp: string;
    orcamento: string;
  };
  servicos: Opcao[];
  areas: Opcao[];
}

interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, boolean>;
  execute: (args: Record<string, unknown>, ctx?: { signal?: AbortSignal }) => Promise<unknown>;
}

interface ModelContextLike {
  registerTool: (tool: ToolDescriptor, options?: { signal?: AbortSignal }) => unknown;
}

function readData(): WebMcpData | null {
  try {
    const raw = document.getElementById('webmcp-data')?.textContent;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WebMcpData;
    if (!parsed.empresa || !Array.isArray(parsed.servicos) || !Array.isArray(parsed.areas)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function asSlug(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function init(): Promise<void> {
  const mc = ((document as unknown as { modelContext?: ModelContextLike }).modelContext ??
    (navigator as unknown as { modelContext?: ModelContextLike }).modelContext) as
    | ModelContextLike
    | undefined;
  if (!mc || typeof mc.registerTool !== 'function') return;

  const data = readData();
  if (!data) return;

  const { empresa } = data;
  const servicoSlugs = data.servicos.map((s) => s.slug);
  const areaSlugs = data.areas.map((a) => a.slug);

  await mc.registerTool({
    name: 'listar_servicos_e_areas',
    description: `Lista os serviços e as cidades de ${empresa.nome} e os dados de contato. Use os campos slug na ferramenta gerar_link_whatsapp.`,
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    execute: async () => data,
  });

  await mc.registerTool({
    name: 'gerar_link_whatsapp',
    description: `Gera o link do WhatsApp de ${empresa.nome} para pedir orçamento. Não envia nada: a pessoa precisa abrir o link e confirmar a mensagem.`,
    inputSchema: {
      type: 'object',
      properties: {
        servico: {
          type: 'string',
          enum: servicoSlugs,
          description: 'Slug do serviço, obtido em listar_servicos_e_areas. Opcional.',
        },
        area: {
          type: 'string',
          enum: areaSlugs,
          description: 'Slug da cidade, obtido em listar_servicos_e_areas. Opcional.',
        },
      },
    },
    annotations: { readOnlyHint: true },
    execute: async (args) => {
      const servicoSlug = asSlug(args?.servico);
      const areaSlug = asSlug(args?.area);
      const servico = servicoSlug ? data.servicos.find((s) => s.slug === servicoSlug) : undefined;
      const area = areaSlug ? data.areas.find((a) => a.slug === areaSlug) : undefined;

      if (servicoSlug && !servico) return { erro: 'servico_invalido', validos: servicoSlugs };
      if (areaSlug && !area) return { erro: 'area_invalida', validos: areaSlugs };

      let mensagem = 'Olá, gostaria de um orçamento sem compromisso.';
      if (servico) mensagem += ` Serviço: ${servico.nome}.`;
      if (area) mensagem += ` Cidade: ${area.nome}.`;

      return {
        whatsappUrl: `https://wa.me/${empresa.whatsapp}?text=${encodeURIComponent(mensagem)}`,
        mensagem,
      };
    },
  });
}

void init().catch(() => {
  /* WebMCP é opcional: falha de registro não pode afetar a página */
});
