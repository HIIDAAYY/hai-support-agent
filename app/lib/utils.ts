import { queryPineconeWithTextInNamespace } from "@/lib/pinecone";
import { ragCache } from "./rag-cache";
import { logger } from "./logger";

export interface RAGSource {
  id: string;
  fileName: string;
  snippet: string;
  score: number;
}

/**
 * Retrieve context from Pinecone for ONE clinic.
 *
 * Retrieval is namespace-only. There used to be four fallback branches here
 * that queried Pinecone without a namespace and leaned on a `source: "clinic"`
 * metadata filter instead. Those reached the unnamed default namespace, which
 * holds pre-isolation leftovers spanning many clinics — so a single answer
 * could be assembled from several clinics' knowledge bases at once.
 *
 * A request that cannot name its clinic now returns empty context rather than
 * guessing. For a multi-tenant bot, saying nothing beats answering as the wrong
 * clinic.
 */
export async function retrieveContextFromPinecone(
  query: string,
  n: number = 6,
  sourceFilter?: string | { kb: string; clinicId: string | null },
): Promise<{
  context: string;
  isRagWorking: boolean;
  ragSources: RAGSource[];
}> {
  try {
    logger.info("Querying Pinecone", {
      query: query.slice(0, 50),
      filter: sourceFilter ? JSON.stringify(sourceFilter) : "none"
    });

    // 🔒 NAMESPACE-BASED ISOLATION (Multi-tenant safe)
    const namespace =
      typeof sourceFilter === "object" &&
      sourceFilter !== null &&
      "kb" in sourceFilter &&
      sourceFilter.kb === "clinic"
        ? sourceFilter.clinicId
        : null;

    if (!namespace) {
      logger.warn("No clinic namespace resolved - returning empty context", {
        filter: sourceFilter ? JSON.stringify(sourceFilter) : "none",
      });
      return { context: "", isRagWorking: false, ragSources: [] };
    }

    logger.info(`Using Pinecone NAMESPACE for clinic isolation`, { namespace });
    const results = await queryPineconeWithTextInNamespace(query, namespace, n);

    // Parse Pinecone results with enhanced metadata
    const ragSources: RAGSource[] = results.matches
      .filter((match: any) => match.metadata?.text)
      .map((match: any, index: number) => ({
        id: match.id || `pinecone-${index}`,
        fileName:
          match.metadata?.title ||
          match.metadata?.category ||
          "Knowledge Base",
        snippet: match.metadata?.text || "",
        score: match.score || 0,
        source: match.metadata?.source || "default",
        clinicId: match.metadata?.clinicId, // NEW: Include clinicId
        clinicName: match.metadata?.clinicName, // NEW: Include clinicName
      }));

    logger.info("Pinecone query results", {
      count: ragSources.length,
      filtered: !!sourceFilter
    });

    // Build context from results
    const context = ragSources.map((source) => source.snippet).join("\n\n");

    return {
      context,
      isRagWorking: ragSources.length > 0,
      ragSources,
    };
  } catch (error) {
    logger.error("Pinecone RAG Error", error);
    return { context: "", isRagWorking: false, ragSources: [] };
  }
}

/**
 * Auto-detect knowledge base based on query content
 * Returns object with kb type and specific clinicId, or undefined if no clinic keywords detected
 * Now supports multi-clinic detection!
 */
export function detectKnowledgeBase(
  query: string
): { kb: string; clinicId: string | null } | undefined {
  const lowerQuery = query.toLowerCase();

  // CLINIC-SPECIFIC KEYWORDS (check first for specific clinic detection)
  const CLINIC_DETECTION_MAP: Record<string, string[]> = {
    // DEMO (temporary) — Vorta Beauty Clinic
    "vorta-clinic": [
      "vorta",
      "vorta beauty",
      "vortabeautyclinic",
    ],
    "glow-clinic": [
      "glow",
      "glow aesthetic",
      "senopati",
      "blok m",
      "dr amanda",
      "amanda kusuma",
    ],
    "click-house": [
      "click house",
      "permanent hair removal",
      "hair removal click",
    ],
    "beautylosophy-clinic": [
      "beautylosophy",
      "the clinic beautylosophy",
      "one stop aesthetic",
      "bedah plastik beautylosophy",
    ],
    "jakarta-aesthetic": [
      "jakarta aesthetic",
      "filler botox award",
      "gunawarman",
      "golden record award",
    ],
    "b-clinic": [
      "b clinic",
      "b multi medika",
      "slimming",
      "face contouring",
      "v-shape",
    ],
    "airin-skin": [
      "airin",
      "airin skin",
      "skincare racikan",
      "racikan personal",
    ],
    "zap-premiere": [
      "zap",
      "zap premiere",
      "laser kompleks",
      "melasma",
    ],
    "dermies-max": [
      "dermies",
      "dermies max",
      "gen z clinic",
      "modern clinic",
    ],
    "ovela-clinic": [
      "ovela",
      "holistik",
      "iv therapy",
      "infus vitamin",
      "tebet ovela",
    ],
    "beyoutiful-clinic": [
      "beyoutiful",
      "dr tompi",
      "tompi",
      "bedah plastik tompi",
      "pakubuwono",
      "pik beyoutiful",
    ],
    "gloskin-aesthetic": [
      "gloskin",
      "gloskin aesthetic",
      "art and science",
      "world class aesthetic",
    ],
    "nmw-skincare": [
      "nmw",
      "nmw skin care",
      "harga terjangkau",
      "pionir klinik",
    ],
    "kusuma-beauty": [
      "kusuma beauty",
      "kusuma clinic",
      "legendaris 1999",
      "sejak 1999",
    ],
    "derma-express": [
      "derma express",
      "cakep terjangkau",
      "dermal filler murah",
    ],
    "jasper-skincare": [
      "jasper",
      "jasper skincare",
      "ahli jerawat",
      "apotek internal",
    ],
    "sozo-skin": [
      "sozo",
      "sozo skin",
      "transparansi harga",
      "biolight face",
      "tebet sozo",
    ],
    "maharis-clinic": [
      "maharis",
      "kevin maharis",
      "dr kevin",
      "laser premium",
    ],
    "promec-clinic": [
      "promec",
      "aptos",
      "tanam benang",
      "thread lift",
      "pondok indah promec",
    ],
    "euroskinlab": [
      "euroskinlab",
      "euro skin",
      "standar eropa",
      "teknologi eropa",
    ],
    "youth-beauty": [
      "youth beauty",
      "youth and beauty",
      "picoway",
      "ultherapy",
      "laser tercanggih",
      "kemang youth",
    ],
    "queen-plastic": [
      "queen plastic",
      "queen surgery",
      "bedah estetika",
      "legendaris 1993",
      "sejak 1993 queen",
      "sunter queen",
    ],
    "sample-ortodonti": [
      "behel",
      "kawat gigi",
      "ortodonti",
      "braces",
      "damon",
      "ceramic bracket",
      "invisalign",
      "clear aligner",
    ],
    "sample-spkk": [
      "spkk",
      "spdve",
      "sawo no 15",
      "sawo 15 menteng",
      "penyakit kulit",
      "kelamin",
      "flek hitam",
      "melasma",
      "laser q-switched",
      "fractional co2",
      "eksim",
      "psoriasis",
    ],
    "sample-spgk": [
      "spgk",
      "gizi klinik",
      "dokter gizi",
      "obesitas",
      "analisis komposisi tubuh",
      "bia",
      "meal plan",
      "gula darah drop",
      "hipoglikemia",
    ],
    "sample-hijab-shop": [
      "hijab",
      "jilbab",
      "pashmina",
      "khimar",
      "bergo",
      "voal premium",
      "toko hijab",
      "shopee brand_hijab",
      "reseller hijab",
    ],
  };

  // Check for specific clinic keywords first
  for (const [clinicId, keywords] of Object.entries(CLINIC_DETECTION_MAP)) {
    if (keywords.some((kw) => lowerQuery.includes(kw))) {
      console.log(`🔍 KB Detection - Query: "${query.slice(0, 50)}..."`);
      console.log(`🏥 Auto-detected SPECIFIC clinic: ${clinicId}`);
      return { kb: "clinic", clinicId };
    }
  }

  // GENERIC CLINIC KEYWORDS (fallback to search all clinics)
  const genericClinicKeywords = [
    "klinik",
    "clinic",
    "dokter",
    "doctor",
    "gigi",
    "dental",
    "teeth",
    "tooth",
    "perawatan wajah",
    "facial",
    "skin",
    "kulit",
    "beauty treatment",
    "botox",
    "filler",
    "whitening",
    "pemutihan",
    "scaling",
    "bleaching",
    "cabut gigi",
    "tambal",
    "filling",
    "implant",
    "veneer",
    "crown",
    "behel",
    "kawat gigi",
    "braces",
    "konsultasi dokter",
    "appointment",
    "janji temu",
    "jadwal praktek",
    "jadwal dokter",
    "booking",
    "acne",
    "jerawat",
    "komedo",
    "pori-pori",
    "flek hitam",
    "aging",
    "keriput",
    "wrinkle",
    "laser",
    "peeling",
    "mesotherapy",
    "microdermabrasi",
    "carbon laser",
    "sakit gigi",
    "gusi",
    "gum",
    "karang gigi",
    "gigi berlubang",
    "rontgen gigi",
    "perawatan kecantikan",
    "treatment",
    "terapi",
    "prosedur medis",
    "estetika",
  ];

  const genericMatches = genericClinicKeywords.filter((kw) =>
    lowerQuery.includes(kw)
  ).length;

  console.log(`🔍 KB Detection - Query: "${query.slice(0, 50)}..."`);
  console.log(`   Generic clinic matches: ${genericMatches}`);

  if (genericMatches > 0) {
    console.log("🏥 Auto-detected: GENERIC clinic (search all clinics)");
    return { kb: "clinic", clinicId: null }; // null = search all clinics
  }

  // NO CLINIC KEYWORDS - return undefined
  console.log("❌ No clinic keywords detected - no KB used");
  return undefined;
}

/**
 * Main retrieve context function - routes every lookup to Pinecone.
 *
 * - knowledgeBaseId={ kb: "clinic", clinicId: "glow-clinic" }: query that
 *   clinic's namespace. This is the only shape that retrieves anything.
 * - anything else (undefined, the bare string "clinic", a generic detection
 *   with clinicId: null, some other named source): empty context.
 *
 * The chat route always supplies a clinicId — it falls back to
 * DEFAULT_TENANT_ID when the request omits one — so in practice every real
 * lookup takes the namespaced path.
 */
export async function retrieveContext(
  query: string,
  knowledgeBaseId?: string | { kb: string; clinicId: string | null },
  n: number = 6,
): Promise<{
  context: string;
  isRagWorking: boolean;
  ragSources: RAGSource[];
}> {
  // Check cache first
  const cached = ragCache.get(knowledgeBaseId, query);
  if (cached) {
    return cached;
  }

  const clinicId =
    typeof knowledgeBaseId === "object" &&
    knowledgeBaseId !== null &&
    "kb" in knowledgeBaseId &&
    knowledgeBaseId.kb === "clinic"
      ? knowledgeBaseId.clinicId
      : null;

  if (!clinicId) {
    // No clinic to scope the search to. Answering from an unscoped index would
    // mean pulling other clinics' content, so return nothing instead.
    console.log(
      `❌ No clinic namespace resolved (${JSON.stringify(knowledgeBaseId)}) - returning empty context`
    );
    return { context: "", isRagWorking: false, ragSources: [] };
  }

  console.log(`🏥 Using Pinecone for Clinic RAG (namespace: ${clinicId})`);
  const result = await retrieveContextFromPinecone(query, n, knowledgeBaseId);
  ragCache.set(knowledgeBaseId, query, result);
  return result;
}
