import json

vocab = []
with open(r"C:\Users\yanie\Desktop\NAPLAN\NAPLAN_Vocabulary.md", "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("| ") and "|" in line[2:]:
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 3 and parts[1] not in ("单词", "------", "---", ""):
                word = parts[1]
                meaning = parts[2]
                if word and meaning:
                    vocab.append({"w": word, "m": meaning})

with open(r"C:\Users\yanie\Desktop\naplan-vocab\vocab.js", "w", encoding="utf-8") as f:
    f.write("const VOCAB = ")
    json.dump(vocab, f, ensure_ascii=False, indent=None)
    f.write(";")

print(f"Extracted {len(vocab)} words")
