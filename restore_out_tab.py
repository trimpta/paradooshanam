with open("old_app.tsx", "r") as f:
    old_content = f.read()

start_marker = "      ) : ("
end_marker = "      {/* Bottom: Header/Menu OR Score Selector */}"
start_idx = old_content.find(start_marker)
end_idx = old_content.find(end_marker)

old_out_block = old_content[start_idx:end_idx]

with open("src/App.tsx", "r") as f:
    current_content = f.read()

cur_start_idx = current_content.find(start_marker)
cur_end_idx = current_content.find(end_marker)

new_content = current_content[:cur_start_idx] + old_out_block + current_content[cur_end_idx:]

with open("src/App.tsx", "w") as f:
    f.write(new_content)
