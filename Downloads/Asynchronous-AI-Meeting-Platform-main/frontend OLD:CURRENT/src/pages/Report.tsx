import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export function Report() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await axios.get(`/api/meetings/${id}/report`);
      setData(data);
    })();
  }, [id]);

  if (!data) return <p>Loading...</p>;

  const v = data.visualMap as { nodes: { id: string; label: string }[]; edges: { from: string; to: string }[] };

  return (
    <div>
      <h3>Final Report</h3>
      <p>{data.summary}</p>
      <h4>Highlights</h4>
      <ul>{data.highlights.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
      <h4>Decisions</h4>
      <ul>{data.decisions.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
      <h4>Action Items</h4>
      <ul>{data.actionItems.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
      <h4>Conversation Map</h4>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {v.nodes.map((n) => (
          <div key={n.id} style={{ border: '1px solid #ccc', padding: 6 }}>{n.label}</div>
        ))}
      </div>
    </div>
  );
}
