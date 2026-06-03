import json

log_path = r"C:\Users\Aarushi Sachdeva\.gemini\antigravity-ide\brain\feb6bc35-c8d0-464f-97fc-cd8b560ecbdb\.system_generated\logs\transcript.jsonl"
out_path = r"c:\Users\Aarushi Sachdeva\OneDrive\Desktop\ai-agents-hackathon-2026-luna\services\api\scratch\prompt.txt"

with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        if '"step_index":628' in line:
            data = json.loads(line)
            with open(out_path, "w", encoding="utf-8") as out:
                out.write(data["content"])
            print("Successfully extracted prompt.")
            break
