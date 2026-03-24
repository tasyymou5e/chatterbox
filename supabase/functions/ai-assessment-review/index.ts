import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentType, assessmentName, scores, answers, categories } = await req.json();

    // Input validation
    const validTypes = ["atec", "dsm5_interview", "dsm5tr_clinician"];
    if (!validTypes.includes(assessmentType)) {
      return new Response(JSON.stringify({ error: "Invalid assessment type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!scores || !categories) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap payload size
    const payloadStr = JSON.stringify({ scores, answers, categories });
    if (payloadStr.length > 100000) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build category summaries for the prompt
    const categorySummaries = scores.categories
      .map((cat: { categoryId: string; categoryName: string; rawScore: number; maxScore: number; grade: string; label: string; percentage: number }) => {
        const catDef = categories.find((c: { id: string }) => c.id === cat.categoryId);
        const answeredQs = catDef?.questions
          ?.filter((q: { id: string }) => answers[q.id] !== undefined)
          ?.map((q: { id: string; text: string }) => `- "${q.text}": ${answers[q.id]}`)
          ?.join("\n") || "No individual answers available";

        return `### ${cat.categoryName}
Score: ${cat.rawScore} / ${cat.maxScore} (${cat.percentage}%)
Grade: ${cat.grade} - ${cat.label}

Individual responses:
${answeredQs}`;
      })
      .join("\n\n");

    const systemPrompt = `You are a compassionate, knowledgeable clinical assessment reviewer specializing in autism spectrum conditions. You are reviewing the results of the "${assessmentName}" assessment.

Your task is to provide a detailed, empathetic, professional review. You must:
1. Provide a narrative analysis for EACH category, explaining what the scores suggest in plain language
2. Be sensitive and supportive in tone — this may be read by the person assessed or their family
3. Highlight both strengths and areas of concern
4. Note patterns across categories
5. Always emphasize that this is a screening/evaluation tool and NOT a clinical diagnosis
6. Provide practical next steps or recommendations where appropriate

IMPORTANT: Return your response as valid JSON with this exact structure:
{
  "categories": {
    "category_id_1": "narrative for category 1...",
    "category_id_2": "narrative for category 2..."
  },
  "overall": "overall narrative summary..."
}

Use the category IDs exactly as provided. Each narrative should be 2-4 sentences.`;

    const userPrompt = `Please analyze these ${assessmentName} results:

Overall: Grade ${scores.overallGrade} - ${scores.overallLabel} (${scores.overallPercentage}%)

${categorySummaries}

Provide your review as the JSON structure specified.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "assessment_review",
              description: "Return the structured assessment review",
              parameters: {
                type: "object",
                properties: {
                  categories: {
                    type: "object",
                    description: "Map of category ID to narrative review string",
                    additionalProperties: { type: "string" },
                  },
                  overall: {
                    type: "string",
                    description: "Overall assessment narrative summary",
                  },
                },
                required: ["categories", "overall"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "assessment_review" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    
    // Extract from tool call
    let review: { categories: Record<string, string>; overall: string };
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      review = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      // Fallback: try to parse from content
      const content = aiResponse.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        review = JSON.parse(jsonMatch[0]);
      } else {
        review = {
          categories: {},
          overall: content || "AI analysis could not be structured. Please review the scores above.",
        };
      }
    }

    return new Response(JSON.stringify({ review }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assessment-review error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
