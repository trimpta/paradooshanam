import { useMemo } from 'react';
import { ConnectionRecord } from './App';
import { CardHeader } from './CardHeader';

export function RelationshipStatusPage({ records, onClose }: { records: ConnectionRecord[], onClose: () => void }) {
  const data = useMemo(() => {
    const relationships = records.filter(r => r.relationshipStatus && r.relationshipStatus !== 'None');
    
    const inRelationship = relationships.filter(r => r.relationshipStatus === 'In a Relationship');
    const complicated = relationships.filter(r => r.relationshipStatus === 'Complicated');
    const talkingStage = relationships.filter(r => r.relationshipStatus === 'Talking Stage');
    
    return {
      inRelationship,
      complicated,
      talkingStage
    };
  }, [records]);

  const renderSection = (title: string, symbol: string, colorClass: string, items: ConnectionRecord[]) => (
    <div className="mb-8">
      <h3 className={`font-bold mb-1 border-b border-zinc-800 pb-1 ${colorClass}`}>
        {title} <span className="ml-2 font-normal">{symbol}</span>
      </h3>
      {items.length === 0 ? (
        <div className="text-zinc-500 italic text-sm mt-3">No connections with this status.</div>
      ) : (
        <div className="flex flex-col gap-2 mt-3">
          {items.map((r, i) => (
            <div key={i} className="flex justify-between items-center text-sm border-l-2 pl-3 border-zinc-800 bg-zinc-900/20 p-2">
              <span className="text-zinc-300 font-bold">{r.personOne}</span>
              <span className="text-zinc-500 mx-2">—</span>
              <span className="text-zinc-300 font-bold">{r.personTwo}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="absolute inset-0 bg-zinc-950 text-green-500 font-mono flex flex-col z-50">
      <CardHeader title="Relationship Statuses" onClose={onClose} />
      
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {renderSection("In a Relationship", "<3", "text-pink-500 border-pink-900/50", data.inRelationship)}
          {renderSection("Complicated", "</3", "text-red-700 border-red-900/50", data.complicated)}
          {renderSection("Talking Stage", "^_^", "text-cyan-400 border-cyan-900/50", data.talkingStage)}
        </div>
      </div>
    </div>
  );
}
