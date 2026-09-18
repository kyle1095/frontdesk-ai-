import { parseKnowledgeText } from "../src/knowledge-base";
import { retrieveFromKnowledgeBase } from "../src/server/retrieval";

const entries = parseKnowledgeText(`Title: Shipping
Q: How long does shipping take?
A: Standard shipping arrives in three to five business days.
Keywords: shipping, delivery, arrive

Q: How do I return an item?
A: Start a return from your Orders page within 30 days.`);

if (entries.length !== 2)
  throw new Error(`expected 2 entries, got ${entries.length}`);
if (entries[0]?.title !== "Shipping") throw new Error("title parser failed");
if (
  retrieveFromKnowledgeBase("When will my delivery arrive?", entries)?.entry
    .title !== "Shipping"
) {
  throw new Error("custom retrieval failed to find shipping entry");
}
if (retrieveFromKnowledgeBase("Can you recommend a restaurant?", entries)) {
  throw new Error("unrelated question should remain unanswered");
}

console.log(
  `knowledge-base check passed (${entries.length} parsed entries; grounded match and handoff boundary verified)`,
);
