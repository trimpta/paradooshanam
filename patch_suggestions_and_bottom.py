import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Update suggestions to exclude personOne when typing personTwo
old_suggestions = """  const suggestions = useMemo(() => {
    const currentInput = activeField === 'ONE' ? personOne : personTwo;
    const search = currentInput.toLowerCase();
    
    let filtered = names.filter(n => n.toLowerCase().includes(search));"""

new_suggestions = """  const suggestions = useMemo(() => {
    const currentInput = activeField === 'ONE' ? personOne : personTwo;
    const search = currentInput.toLowerCase();
    
    let filtered = names.filter(n => n.toLowerCase().includes(search));
    
    // Spec: Person 1 is excluded from Person 2's suggestions
    if (activeField === 'TWO') {
      filtered = filtered.filter(n => n.toLowerCase() !== personOne.toLowerCase());
    }"""

content = content.replace(old_suggestions, new_suggestions)

# 2. Add Search/Filter card at the top of the cards list
# Currently it starts with:
# <div className="flex-1 overflow-hidden relative border-b border-green-900/50 bg-zinc-950">
#   {!showAddForm ? (
# wait, I already removed showAddForm! Let's see what is there now.
