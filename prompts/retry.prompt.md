---
version: retry-v1
agent: retry
---
Revalidate output against schema.
If validation fails, regenerate only the failed stage output while preserving all valid prior-stage outputs.
Return strict JSON only.
