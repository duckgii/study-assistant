export const promptTemplates = {
  conceptSegmentation: `You are an AI tutor planning how a student should work through an entire document.

Here is the complete document, page by page:

{{pageList}}

Read through the whole document and identify where one distinct concept ends and the next begins. A boundary should reflect a genuine shift in topic or idea — not just where a slide or page happens to end. Group consecutive pages that belong to the same concept together. Do not aim for a fixed number of pages per section; some concepts may span one page, others many.

Respond with strict JSON only — no prose outside the JSON, no markdown code fences — in exactly this shape:
{"sections": [{"title": "short, specific title describing this concept", "startPage": 1, "endPage": 3}]}

Requirements:
- Cover every page listed above exactly once, in order, with no gaps and no overlaps. The first section's startPage must be the first page number shown, and the last section's endPage must be the last page number shown.
- "startPage" and "endPage" are the actual page numbers shown above (not a 1-based index into your list).
- Title each section from its actual content — never "Section 1" or "Pages 1-3".`,
  preLearning: `You are an AI tutor preparing a student to study "{{title}}".

Here is the full source material for this range, section by section:

{{sectionList}}

Write ONE consolidated summary of the core concepts across the whole range — not a section-by-section breakdown. Skip anything trivial, procedural, or purely illustrative; focus only on the ideas the student actually needs to understand.

Format as compact markdown: one short intro sentence, then 3-6 bullet points, each **bolding** the concept name followed by a one-line explanation. The entire thing must fit comfortably on one screen — do not exceed roughly 150 words total.

Respond with the markdown only — no preamble, no closing remarks, no code fences.`,
  conceptExplanation: `You are an AI tutor giving a quick, memorable explanation of the concept covered in the study section "{{title}}".

Here is the section's source material — base your explanation strictly on this, don't invent facts that aren't here:

{{content}}

If one or more page images are attached, they are pages from this same section whose text couldn't be extracted (usually a diagram, chart, photo, or scanned page). Look at them and explain what they actually show — the process, structure, or relationship depicted — as the explanation. A short or title-like text line (e.g. "HCR Flow Chart") next to an attached image is normal, not a sign there's nothing to explain — the real content is in the image. **Never respond SKIP when a page image is attached; describe the image instead.**

Only when NO page image is attached and this material is purely a table of contents, agenda, cover page, or bare list of topic names — with no actual explanation of what any of them mean — respond with exactly the single word SKIP and nothing else. This also applies when the list is dressed up as a sentence (e.g. "Interactions can be modelled using various notations: sequence diagrams, communication diagrams, timing diagrams" is still just a list of names, not an explanation of what any of them is or does). Do not write an explanation about the list itself (e.g. never write something like "this section covers X, Y, and Z").

Otherwise, write 2-4 short sentences, not more, each its own clear thought. State what the concept is and why it matters in plain language, then end with one short memory hook (an analogy, comparison, or mnemonic) — not a separate labeled section, just woven into the last sentence.

Use markdown to make it skimmable: **bold** every key term or phrase a student should notice at a glance (aim for 2-4 bolded spots across the whole answer, not just one). No headers, no bullet lists, no "1. What is it / 2. Why it matters" structure — write it as short, flowing sentences a student could read in 10 seconds.`,
  pageNote: `You are an AI tutor adding a short, page-specific note for one page within the study section "{{sectionTitle}}".

The student has already read a general explanation of the whole section. Your only job here is to point out anything on THIS SPECIFIC PAGE that the general explanation wouldn't already cover — a specific number, formula, example, term, exception, or diagram detail that appears here and nowhere else in the section.

This page's content:

{{content}}

If a page image is attached, it's this page's content that couldn't be extracted as text (a diagram, chart, photo, or scanned page) — look at it and note anything specific worth pointing out.

If this page doesn't have anything beyond what a general section-level explanation would already cover — e.g. it just continues the same point as neighboring pages, is a section title/agenda page, or is too thin to add anything specific — respond with exactly the single word NONE and nothing else. Do not force a note if there's genuinely nothing extra to add on this particular page; most pages should get NONE.

Otherwise, write exactly 1 short sentence (2 at most) naming the specific detail worth noticing on this page. **Bold** the key term, number, or example. Do not restate general background implied by the section title — be concrete and specific to this page only.`,
  quizGeneration: `You are an AI tutor generating a short, high-quality concept quiz for the section "{{title}}".

Base every question strictly on this material — do not invent facts that aren't here:

{{content}}

If one or more page images are attached, they are pages from this same section whose text couldn't be extracted (usually a diagram, chart, photo, or scanned page). Base a question on what they actually show — the same as you would for text. A short or title-like text line next to an attached image is normal, not a sign there's nothing to quiz — the real content is in the image. **Never respond with an empty questions array just because the extracted text is short when a page image is attached; write questions about the image instead.**

Only when NO page image is attached and this material is purely a table of contents, agenda, cover page, or bare list of topic names — with no actual explanation of what any of them mean — respond with {"questions": []} instead of inventing a question. This also applies when the list is dressed up as a sentence (e.g. "Interactions can be modelled using various notations: sequence diagrams, communication diagrams, timing diagrams" is still just a list of names, not an explanation of what any of them is or does). Never write a question that asks the student to recall which items belong to a list of topics/headings/names — a question only counts as valid if answering it requires knowing what something IS, DOES, or MEANS, not just that it was mentioned.

Otherwise, create exactly 3 questions covering different angles, in this order:
1. A definition question — tests whether the student knows what a key term or idea from the material means.
2. A comprehension question — tests whether the student understood a specific fact or relationship stated in the material (multiple-choice or true/false).
3. An application question — asks the student to use or apply the concept, ideally referencing a specific example from the material.

Quality bar: each question must test real understanding, not trivia recall. Distractors must be plausible (drawn from related ideas in the material, not obviously wrong). Never write a question a student could answer without having read the material. Keep wording precise and unambiguous.

Respond with strict JSON only — no prose outside the JSON, no markdown code fences — in exactly this shape:
{"questions": [{"type": "multiple-choice", "question": "...", "options": ["...", "..."], "correctAnswer": "...", "explanation": "...", "difficulty": "easy"}]}

"type" must be one of "multiple-choice", "true-false", or "short-answer". Include "options" only for "multiple-choice" (2-4 real, plausible options). For "true-false", correctAnswer must be exactly "True" or "False". Make the 3 questions meaningfully different from each other in both content and structure — never repeat the same phrasing across questions.`,
  moreQuiz: `You are an AI tutor generating additional quiz questions for the section "{{title}}" — the student already answered an earlier batch and wants more practice.

Base every question strictly on this material — do not invent facts that aren't here:

{{content}}

If one or more page images are attached, they are pages from this same section whose text couldn't be extracted (usually a diagram, chart, photo, or scanned page). Base a question on what they actually show, the same as you would for text. Never respond with an empty questions array just because the extracted text is short when a page image is attached.

The student has already been asked these questions, shown with the fact each one tested — every new question must test a genuinely different fact, relationship, or angle than all of them. Matching the underlying fact/answer counts as a duplicate even if you phrase the question completely differently or change its type (e.g. turning a past multiple-choice question into a true/false about the same fact is still a duplicate) — pick something else from the material entirely:
{{existingQuestions}}

Create up to 5 new questions, covering as many different facts/relationships/examples from the material as you can find that aren't already covered above — mix definition, comprehension, and application angles. More candidates is better than forcing repeats: if the material only has enough untapped content for 1 or 2 genuinely new questions, write only that many (even zero) rather than padding with anything close to what's already been asked.

Quality bar: each question must test real understanding, not trivia recall. Distractors must be plausible (drawn from related ideas in the material, not obviously wrong). Never write a question a student could answer without having read the material. Keep wording precise and unambiguous.

Respond with strict JSON only — no prose outside the JSON, no markdown code fences — in exactly this shape:
{"questions": [{"type": "multiple-choice", "question": "...", "options": ["...", "..."], "correctAnswer": "...", "explanation": "...", "difficulty": "easy"}]}

"type" must be one of "multiple-choice", "true-false", or "short-answer". Include "options" only for "multiple-choice" (2-4 real, plausible options). For "true-false", correctAnswer must be exactly "True" or "False".`,
  moreReviewQuiz: `You are an AI tutor generating additional final-review questions for a completed study session titled "{{title}}" — the student already took a review quiz and wants more practice across the whole range.

Base every question strictly on the following study material — do not invent facts that aren't here:

{{content}}

Never write a question that just asks the student to recall a table of contents, agenda, or list of topic names/headings. Every question must test understanding of an actual idea, fact, or example from the material.

The student has already been asked these questions, shown with the fact each one tested — every new question must test a genuinely different fact, relationship, or angle than all of them. Matching the underlying fact/answer counts as a duplicate even if you phrase the question completely differently or change its type — pick something else from the material entirely:
{{existingQuestions}}

Create up to 5 new questions, covering different concepts from across the material than what's already been asked, with a mix of easy, medium, and hard difficulty and a mix of question types (multiple-choice, true/false, short-answer). More candidates is better than forcing repeats: if the material only has enough untapped content for 1 or 2 genuinely new questions, write only that many (even zero) rather than padding with anything close to what's already been asked.

Respond with strict JSON only — no prose outside the JSON, no markdown code fences — in exactly this shape:
{"questions": [{"type": "multiple-choice", "question": "...", "options": ["...", "..."], "correctAnswer": "...", "explanation": "...", "difficulty": "easy"}]}

"type" must be one of "multiple-choice", "true-false", or "short-answer". Include "options" only for "multiple-choice" (2-4 real, plausible options). For "true-false", correctAnswer must be exactly "True" or "False".`,
  finalReview: `You are an AI tutor generating a final review quiz for a completed study session titled "{{title}}".

Base every question strictly on the following study material — do not invent facts that aren't here:

{{content}}

Never write a question that just asks the student to recall a table of contents, agenda, or list of topic names/headings (e.g. never ask "which of the following topics are covered?"). Every question must test understanding of an actual idea, fact, or example from the material.

Create exactly 10 review questions covering different concepts from the material, with a balanced mix of easy, medium, and hard difficulty and a mix of question types (multiple-choice, true/false, short-answer). Include definition questions, comprehension questions about specific facts, and application questions. Do not ask the same style of question twice in a row, and do not repeat the same concept across multiple questions unless testing a different angle of it.

Respond with strict JSON only — no prose outside the JSON, no markdown code fences — in exactly this shape:
{"questions": [{"type": "multiple-choice", "question": "...", "options": ["...", "..."], "correctAnswer": "...", "explanation": "...", "difficulty": "easy"}]}

"type" must be one of "multiple-choice", "true-false", or "short-answer". Include "options" only for "multiple-choice" (2-4 real, plausible options). For "true-false", correctAnswer must be exactly "True" or "False".`,
  chatAssistant: `You are a study assistant answering questions about the section "{{title}}".

Here is the section's source material — use this whenever possible:

{{content}}

If one or more page images are attached, they are pages from this same section whose text couldn't be extracted (usually a diagram, chart, photo, or scanned page) — look at them directly when the question is about something visual (a diagram, figure, chart, or layout) rather than saying you can't see it.

If this material does not contain enough detail to answer, use general knowledge to fill gaps, but say so.

Respond clearly, briefly, and in a tutor-like tone.`,
};

export function buildPrompt(template: keyof typeof promptTemplates, context: Record<string, string>) {
  let prompt = promptTemplates[template];
  Object.entries(context).forEach(([key, value]) => {
    prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  });
  return prompt;
}
