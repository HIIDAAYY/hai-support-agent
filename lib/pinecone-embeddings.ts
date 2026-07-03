import { Pinecone } from "@pinecone-database/pinecone";

/**
 * Embeddings via Pinecone Inference (multilingual-e5-large, 1024-dim).
 * Replaces the OpenAI embedding path — keeps the whole RAG stack on a single
 * vendor (Pinecone) with a generous free tier and strong multilingual (ID/EN)
 * quality. e5 models are asymmetric: use inputType "passage" when indexing
 * documents and "query" when embedding a user question.
 */

const MODEL = "multilingual-e5-large";
const EMBED_BATCH = 50; // inputs per inference call (stay well under model limits)

let pineconeInstance: Pinecone | null = null;

function getClient(): Pinecone {
  if (!pineconeInstance) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not defined in environment variables");
    }
    pineconeInstance = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pineconeInstance;
}

/**
 * Embed a single text. Default inputType "query" (the common query path).
 */
export async function getPineconeEmbedding(
  text: string,
  inputType: "query" | "passage" = "query"
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  const res: any = await getClient().inference.embed(MODEL, [text], {
    inputType,
    truncate: "END",
  });

  const values = res?.data?.[0]?.values;
  if (!values) {
    throw new Error("Failed to generate embedding: empty response from Pinecone Inference");
  }
  return values as number[];
}

/**
 * Embed many texts (batched). Default inputType "passage" (the indexing path).
 */
export async function getPineconeEmbeddings(
  texts: string[],
  inputType: "query" | "passage" = "passage"
): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    throw new Error("Texts array cannot be empty");
  }

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const res: any = await getClient().inference.embed(MODEL, batch, {
      inputType,
      truncate: "END",
    });
    for (const item of res?.data ?? []) {
      if (!item?.values) {
        throw new Error("Failed to generate embeddings: empty item from Pinecone Inference");
      }
      out.push(item.values);
    }
  }
  return out;
}
