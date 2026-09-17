with open("src/App.tsx", "r") as f:
    content = f.read()

bad_ok = """  const handleOK = () => {
    if (conflictRecord) {
      handleOK();
    } else {
      handleSave();
    }
  };"""

good_ok = """  const handleOK = () => {
    if (conflictRecord) {
      handleUpdate();
    } else {
      handleSave();
    }
  };"""

content = content.replace(bad_ok, good_ok)

with open("src/App.tsx", "w") as f:
    f.write(content)
