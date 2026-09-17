with open("src/App.tsx", "r") as f:
    content = f.read()

import re
# Replace handleUpdate with handleOK in the popup
content = re.sub(r"handleUpdate\(\)", "handleOK()", content)

with open("src/App.tsx", "w") as f:
    f.write(content)
