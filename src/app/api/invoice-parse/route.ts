import { storageBucketInvoices } from "@/lib/db-tables";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

const parsedSchema = z.object({
  amount: z.number().positive(),
  date: z.string().min(4),
  description: z.string(),
  suggestedCategoryName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { path?: string };
    const path = body.path?.trim();
    if (!path) {
      return NextResponse.json({ error: "path obrigatório" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const prefix = `${user.id}/`;
    if (!path.startsWith(prefix)) {
      return NextResponse.json({ error: "Caminho inválido" }, { status: 403 });
    }

    const lower = path.toLowerCase();
    if (lower.endsWith(".pdf")) {
      return NextResponse.json(
        {
          error:
            "PDF não suportado nesta versão. Envie foto da nota (PNG ou JPEG).",
        },
        { status: 415 },
      );
    }

    const { data: file, error: dlErr } = await supabase.storage
      .from(storageBucketInvoices)
      .download(path);

    if (dlErr || !file) {
      return NextResponse.json(
        { error: dlErr?.message ?? "Falha ao baixar arquivo" },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/jpeg";
    const base64 = buf.toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada no servidor" },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você extrai dados de notas fiscais brasileiras (cupom, NFC-e, etc.).
Responda APENAS um JSON com os campos:
{"amount": number (total pago em reais, número decimal),
 "date": string (ISO 8601 date YYYY-MM-DD se possível),
 "description": string (nome do estabelecimento ou resumo curto),
 "suggestedCategoryName": string opcional (ex.: Mercado, Restaurante, Transporte)}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extraia os dados desta imagem de nota fiscal.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "Resposta vazia do modelo" },
        { status: 502 },
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "JSON inválido do modelo" },
        { status: 502 },
      );
    }

    const parsed = parsedSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados incompletos", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    return NextResponse.json(parsed.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
