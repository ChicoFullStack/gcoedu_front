import os

filepath = r"d:\projeto_moises\gcoedu-frontend\src\utils\userHierarchy.ts"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace specific strings exactly
content = content.replace('api.get(`/school`);', 'api.get(`/api/v1/tenant/schools`);')
content = content.replace("api.get('/school');", "api.get('/api/v1/tenant/schools');")
content = content.replace('api.get(`/school/${', 'api.get(`/api/v1/tenant/schools/${')
content = content.replace("api.get(`/teacher/${", "api.get(`/api/v1/tenant/teachers/${")
content = content.replace("api.get('/teacher')", "api.get('/api/v1/tenant/teachers')")
content = content.replace("api.get('/school-teacher',", "api.get('/api/v1/tenant/teachers',")
content = content.replace("api.get(`/city/${", "api.get(`/city/${") # city is fine

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print(f"Patched userHierarchy.ts")
