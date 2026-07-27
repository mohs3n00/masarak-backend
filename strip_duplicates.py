import re

schema_path = r'E:\Masarak\backend\prisma\schema.prisma'

with open(schema_path, 'r', encoding='utf-8') as f:
    schema = f.read()

# I will find the User model and remove any duplicates
# Let's just find the entire User block and fix it.
user_block_match = re.search(r'model User \{(.*?)\n\}', schema, re.DOTALL)
if user_block_match:
    lines = user_block_match.group(1).split('\n')
    unique_lines = []
    seen = set()
    for line in lines:
        stripped = line.strip()
        # if it's a relation field line like `cartItems CartItem[]`
        if stripped and len(stripped.split()) >= 2:
            key = stripped.split()[0]
            # some keys are safe to repeat if they are empty or comments
            if key.startswith('//') or key.startswith('@') or key == '':
                unique_lines.append(line)
            else:
                if key not in seen:
                    seen.add(key)
                    unique_lines.append(line)
        else:
            unique_lines.append(line)
    
    new_user_block = "model User {" + '\n'.join(unique_lines) + "\n}"
    schema = schema.replace("model User {" + user_block_match.group(1) + "\n}", new_user_block)

# Do the same for Course
course_block_match = re.search(r'model Course \{(.*?)\n\}', schema, re.DOTALL)
if course_block_match:
    lines = course_block_match.group(1).split('\n')
    unique_lines = []
    seen = set()
    for line in lines:
        stripped = line.strip()
        if stripped and len(stripped.split()) >= 2:
            key = stripped.split()[0]
            if key.startswith('//') or key.startswith('@') or key == '':
                unique_lines.append(line)
            else:
                if key not in seen:
                    seen.add(key)
                    unique_lines.append(line)
        else:
            unique_lines.append(line)
    
    new_course_block = "model Course {" + '\n'.join(unique_lines) + "\n}"
    schema = schema.replace("model Course {" + course_block_match.group(1) + "\n}", new_course_block)

with open(schema_path, 'w', encoding='utf-8') as f:
    f.write(schema)

print("Duplicates stripped safely!")
