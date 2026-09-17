import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# 1. Remove unused Menu import
content = content.replace("import { Menu } from 'lucide-react';\n", "")

# 2. Fix GraphPage call
content = content.replace(
    "<GraphPage records={records} genders={genders} />",
    "<GraphPage records={records} onClose={() => setMainTab('IN')} />"
)

# 3. Create handleOK which wraps handleSave / handleUpdate
old_handlers = """  const handleSave = () => {
    if (!personOne.trim() || !personTwo.trim()) return;
    
    // Add missing names
    const newNames = [...names];
    if (!newNames.includes(personOne)) newNames.push(personOne);
    if (!newNames.includes(personTwo)) newNames.push(personTwo);

    // Save record
    const newRecords = [...records, { personOne, personTwo, score, relationshipStatus }];
    
    // Add default genders for new names
    const newGenders = { ...genders };
    if (!newGenders[personOne]) newGenders[personOne] = 'Boy';
    if (!newGenders[personTwo]) newGenders[personTwo] = 'Boy';

    saveToStorage(newNames, newRecords, newGenders);

    // Reset input states
    setPersonOne('');
    setPersonTwo('');
    setScore(5);
    setRelationshipStatus('None');
    setConflictRecord(null);
    inputOneRef.current?.focus();
    setActiveField('ONE');
  };

  const handleUpdate = () => {
    if (!conflictRecord) return;
    const updated = records.map(r => r === conflictRecord ? { ...r, score, relationshipStatus } : r);
    saveToStorage(names, updated, genders);
    setConflictRecord(null);
    setPersonOne('');
    setPersonTwo('');
    setScore(5);
    setRelationshipStatus('None');
    inputOneRef.current?.focus();
    setActiveField('ONE');
  };

  const handleCancelConflict = () => {
    setPersonOne('');
    setPersonTwo('');
    setScore(5);
    setRelationshipStatus('None');
    setConflictRecord(null);
    inputOneRef.current?.focus();
  };"""

new_handlers = old_handlers + """
  const handleOK = () => {
    if (conflictRecord) {
      handleUpdate();
    } else {
      handleSave();
    }
  };
"""

content = content.replace(old_handlers, new_handlers)

# Replace onClick={handleAdd} with onClick={handleOK}
content = content.replace("onClick={handleAdd}", "onClick={handleOK}")

with open("src/App.tsx", "w") as f:
    f.write(content)
