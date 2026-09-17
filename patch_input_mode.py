import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Remove showAddForm completely
content = re.sub(r"const \[showAddForm, setShowAddForm\] = useState\(false\);", "", content)
content = re.sub(r"setShowAddForm\(true\);", "", content)
content = re.sub(r"setShowAddForm\(false\);", "", content)

# 2. Remove the top Main Header entirely
main_header_regex = r"\{\/\* Main Header \*\/\}.*?<\/div>"
content = re.sub(main_header_regex, "", content, flags=re.DOTALL)

# 3. Remove the [+] FAB button
fab_regex = r"\{\/\* FAB for Add Connection \*\/\}.*?<\/button>\s*\)\}"
content = re.sub(fab_regex, "", content, flags=re.DOTALL)

# 4. Modify the Top Inputs to be always visible (no showAddForm wrap)
content = content.replace("{showAddForm && (", "(")

# 5. Fix handleFocus to force Person 1 focus if either is tapped (but only if keyboard wasn't open to start the flow)
# Actually, if we force focus on ONE every time they tap, they can never edit TWO!
# The spec said: "Tapping either the Person 1 or Person 2 input at the top of the screen will automatically activate the Person 1 field, opening the keyboard and triggering Input Mode."
# Wait, if they are already in Input Mode, can they tap Person 2 to edit Person 2? Yes!
# So we only force focus to ONE if NOT in input mode.
# Let's write a new handleFocus
old_handle_focus = """  const handleFocus = (field: 'ONE' | 'TWO') => {
    setActiveField(field);
    setConflictRecord(null);
  };"""

new_handle_focus = """  const handleFocus = (field: 'ONE' | 'TWO') => {
    if (!isInputMode && field === 'TWO') {
      // Force start at Person 1 if initiating input mode from scratch
      inputOneRef.current?.focus();
      setActiveField('ONE');
    } else {
      setActiveField(field);
    }
    setConflictRecord(null);
  };"""

content = content.replace(old_handle_focus, new_handle_focus)

# 6. Keyboard Hide (Cancellation)
# We need an effect that watches `isKeyboardOpen`. If it becomes false, clear inputs.
keyboard_effect = """  useEffect(() => {
    if (!isKeyboardOpen) {
      setPersonOne('');
      setPersonTwo('');
      setScore(5);
      setRelationshipStatus('None');
      inputOneRef.current?.blur();
      inputTwoRef.current?.blur();
    }
  }, [isKeyboardOpen]);
"""
# inject right after const isInputMode = isKeyboardOpen;
content = content.replace(
    "const isInputMode = isKeyboardOpen;\n",
    "const isInputMode = isKeyboardOpen;\n" + keyboard_effect
)

# 7. Add Search/Filter static card at the top of the cards list.
# 8. Middle autocomplete filter exclusion.
# 9. Bottom bar: IN/OUT toggle and Menu button.
# 10. Input Controls Bar (Score, Relationship, OK).

with open("src/App.tsx", "w") as f:
    f.write(content)
