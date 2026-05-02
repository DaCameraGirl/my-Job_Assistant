# Centific Text Response Evaluator

Local web app that follows the **Text Response Evaluation (Dec 2025)** workflow:

- Summarize transcript (30-word cap)
- Decide Pass vs Reject
- List reject reasons
- If pass, choose best response from 4 options
- Suggest MCQ answer from transcript-only content

## Run

1. Open `index.html` in your browser.
2. Paste transcript and click **Evaluate Transcript**.
3. Add 4 candidate responses and click **Pick Best Response**.
4. Add MCQ + 4 choices and click **Suggest Best Answer**.

## Notes

- This is a rubric-driven heuristic evaluator (deterministic checks).
- The second PDF (`When to Release Tasks.pdf`) appears image-only; OCR was unavailable in this environment, so release-specific policy hooks are not yet integrated.
- If you share text/OCR for that PDF, I can add exact release gating logic next.
