import os, re

files_to_patch = [
    r"d:\projeto_moises\gcoedu-frontend\src\pages\cadastros\Gestao.tsx",
    r"d:\projeto_moises\gcoedu-frontend\src\pages\cadastros\Turmas.tsx",
    r"d:\projeto_moises\gcoedu-frontend\src\pages\cadastros\Students.tsx"
]

imports = """
import { schoolApi } from "@/services/tenant/schoolApi";
import { schoolClassApi } from "@/services/tenant/schoolClassApi";
import { studentApi } from "@/services/tenant/studentApi";
import { teacherApi } from "@/services/tenant/teacherApi";
"""

def patch_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Add imports after the last import
    if "import { schoolApi }" not in content:
        last_import = content.rfind("import ")
        end_of_line = content.find("\n", last_import)
        content = content[:end_of_line+1] + imports + content[end_of_line+1:]

    # Gestao.tsx replacements
    content = re.sub(r'api\.get\(\s*["\']/school["\']\s*\)', r'schoolApi.findAll().then(data => ({ data }))', content)
    content = re.sub(r'api\.post\(\s*["\']/school["\']\s*,\s*(.*?)\)', r'schoolApi.create(\1)', content)
    content = re.sub(r'api\.delete\(\s*[`"\']/school/\$\{?([a-zA-Z0-9_]+)\}?[`"\']\s*\)', r'schoolApi.delete(\1)', content)
    
    # Turmas (classes) replacements
    content = re.sub(r'api\.get\(\s*[`"\']/classes/school/\$\{?([a-zA-Z0-9_]+)\}?[`"\']\s*\)', r'schoolClassApi.findAll(\1).then(data => ({ data }))', content)
    content = re.sub(r'api\.post\(\s*["\']/classes["\']\s*,\s*(.*?)\)', r'schoolClassApi.create(\1)', content)
    content = re.sub(r'api\.put\(\s*[`"\']/classes/\$\{?([a-zA-Z0-9_]+)\}?[`"\']\s*,\s*(.*?)\)', r'schoolClassApi.update(\1, \2)', content)
    content = re.sub(r'api\.delete\(\s*[`"\']/classes/\$\{?([a-zA-Z0-9_]+)\}?[`"\']\s*\)', r'schoolClassApi.delete(\1)', content)
    
    # Teachers replacements
    content = re.sub(r'api\.get\(\s*[`"\']/teacher/school/\$\{?([a-zA-Z0-9_]+)\}?[`"\']\s*\)', r'teacherApi.findAll(\1).then(data => ({ data }))', content)
    
    # Students replacements
    content = re.sub(r'api\.get\(\s*[`"\']/students/school/\$\{?([a-zA-Z0-9_]+)\}?[`"\']\s*\)', r'studentApi.findAll(\1).then(data => ({ data }))', content)
    content = re.sub(r'api\.post\(\s*["\']/students["\']\s*,\s*(.*?)\)', r'studentApi.create(\1)', content)
    content = re.sub(r'api\.put\(\s*[`"\']/students/\$\{?([a-zA-Z0-9_]+)\}?[`"\']\s*,\s*(.*?)\)', r'studentApi.update(\1, \2)', content)
    content = re.sub(r'api\.delete\(\s*[`"\']/students/\$\{?([a-zA-Z0-9_]+)\}?[`"\']\s*\)', r'studentApi.delete(\1)', content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Patched {os.path.basename(filepath)}")

for f in files_to_patch:
    patch_file(f)
