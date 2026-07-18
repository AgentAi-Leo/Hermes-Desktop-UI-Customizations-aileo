# AI Morning Brief — strict data contract

Research today’s AI news for founders/operators. Return changing editorial data only. Never produce HTML, Markdown, CSS, JavaScript, layout, controls, CSV, portfolio data, or template instructions.

Use the current date and timestamps in `America/Los_Angeles`. Use real HTTPS sources and do not invent facts or URLs. If you cannot verify enough information for every required field, fail explicitly instead of fabricating a payload.

Your complete final response must contain exactly one marker pair and valid JSON between it:

```text
<<<HERMES_BRIEF_AI_JSON>>>
{
  "contract_version": "ai-brief-data-v1",
  "kind": "ai",
  "date": "YYYY-MM-DD",
  "timezone": "America/Los_Angeles",
  "generated_at": "ISO-8601 timestamp with offset",
  "founder_takeaways": [
    {"headline": "...", "detail": "..."}
  ],
  "topics": [
    {
      "number": 1,
      "headline": "...",
      "summary": "...",
      "why_it_matters": "...",
      "actionable_implication": "...",
      "sources": [{"label": "...", "url": "https://..."}]
    }
  ]
}
<<<END_HERMES_BRIEF_AI_JSON>>>
```

Hard requirements:

- Exactly seven `founder_takeaways`.
- Exactly seven `topics`, numbered 1 through 7 in order.
- At least one verified HTTPS source per topic.
- No unknown JSON properties.
- JSON strings must not contain raw control characters.
- No prose outside the marker pair.
