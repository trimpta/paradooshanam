import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Add handleOK right before handleCancelConflict
insert_pos = content.find("const handleCancelConflict = () => {")

if insert_pos != -1:
    new_handle_ok = """const handleOK = () => {
    if (conflictRecord) {
      handleUpdate();
    } else {
      handleSave();
    }
  };

  """
    content = content[:insert_pos] + new_handle_ok + content[insert_pos:]

# Remove unused handleCancelConflict
content = re.sub(r"const handleCancelConflict = \(\) => \{.*?\};", "", content, flags=re.DOTALL)

with open("src/App.tsx", "w") as f:
    f.write(content)
