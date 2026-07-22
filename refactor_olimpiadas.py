import os, re

filepath = r"d:\projeto_moises\gcoedu-frontend\src\services\olimpiadasApi.ts"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace all occurrences of API base paths
content = re.sub(r'([\'"`])/test([\'"`\/?])', r'\1/api/v1/tenant/tests\2', content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print(f"Patched {os.path.basename(filepath)}")
