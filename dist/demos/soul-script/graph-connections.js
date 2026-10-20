// A graph payload is indexed once and shared by the view and its existing detail panel.
const indexes = new WeakMap();
export function getGraphIndex(data) {
 if (!data) return {nodesById:new Map(), connectionsById:new Map(), selectionFor:()=>null};
 if (indexes.has(data)) return indexes.get(data);
 const nodesById=new Map(data.nodes.map(node=>[node.id,node]));
 const connectionsById=new Map(Object.entries(data.connectionIndex||{}));
 const selections=new Map();
 for(const [id,connections] of connectionsById) {
  const source=nodesById.get(id);
  selections.set(id,{source,connections,targets:connections.map(c=>nodesById.get(c.targetId)),ids:new Set([id,...connections.map(c=>c.targetId)])});
 }
 const index={nodesById,connectionsById,selectionFor:id=>selections.get(id)||null};
 indexes.set(data,index);return index;
}
