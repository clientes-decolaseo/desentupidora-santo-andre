import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const maxPalavras = (max: number) =>
  z.string().refine(
    (valor) => valor.trim().split(/\s+/).filter(Boolean).length <= max,
    { message: `Deve ter no máximo ${max} palavras` },
  );

const servicos = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/servicos' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string().max(160),
    shortCopy: maxPalavras(20),
    order: z.number(),
  }),
});

const areas = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/areas' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    cidade: z.string(),
    description: z.string(),
  }),
});

export const collections = { servicos, areas };
