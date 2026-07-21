import { formatIntention, parseIntention, isStructuredIntention } from "./implementationIntention";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const formatted = formatIntention("after coffee", "write 300 words");
assert(formatted === "When after coffee, I will write 300 words", "format");

const parsed = parseIntention(formatted);
assert(parsed.when === "after coffee", "parse when");
assert(parsed.action === "write 300 words", "parse action");
assert(isStructuredIntention(formatted), "structured");
assert(!isStructuredIntention("just write"), "unstructured");
assert(parseIntention("plain action").action === "plain action", "plain fallback");
assert(formatIntention("", "only action") === "only action", "empty when");

console.log("implementationIntention self-check ok");
