'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
type Report = {scan_id:string;scan_type:string;risk_score:number;risk_level:string;confidence:string;summary:string;evidence:{title:string;description:string;severity:string;source:string}[];recommendations:string[];sources?:{publisher:string;url:string;title:string;review_date:string;rating:string}[];created_at:string};

export default function SharedReport() {
  const {shareId} = useParams<{shareId:string}>();
  const [report,setReport] = useState<Report|null>(null);
  const [error,setError] = useState('');
  useEffect(()=>{fetch(`${API}/public/reports/${encodeURIComponent(shareId)}`).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.detail||'This report is unavailable.');setReport(body.data)}).catch(e=>setError(e instanceof Error?e.message:'This report is unavailable.'))},[shareId]);
  const risk=report?.risk_level==='LOW'?'low':report?.risk_level==='CAUTION'?'caution':'high';
  return <main className="proof-page"><header><Link href="/" className="brand"><span className="brand-icon"><ShieldCheck size={21}/></span><span>ProofLens<span className="brand-ai">AI</span></span></Link><span>Shared verification report</span></header>{error?<section className="proof-card"><h1>Report unavailable</h1><p>{error}</p><p>This link may have been revoked by its owner.</p></section>:!report?<section className="proof-card"><p>Loading report…</p></section>:<section className={`proof-card ${risk}`}><div className="eyebrow">PROOFLENS VERIFICATION · {report.scan_id}</div><h1>{report.risk_level.replace('_',' ')} RISK <span>{report.risk_score}/100</span></h1><div className="proof-meta">{report.scan_type} · Confidence {report.confidence} · {new Date(report.created_at).toLocaleDateString()}</div><p>{report.summary}</p><h2>Evidence</h2>{report.evidence.map((item,i)=><article className="proof-evidence" key={i}>{item.severity==='INFO'?<CheckCircle2 size={17}/>:<AlertTriangle size={17}/>}<div><b>{item.title}</b><p>{item.description}</p><small>{item.source} · {item.severity}</small></div></article>)}{report.sources?.length?<><h2>Published fact-check reviews</h2>{report.sources.map((source,i)=><article className="proof-evidence" key={`source-${i}`}><div><a href={source.url} target="_blank" rel="noreferrer"><b>{source.publisher}: {source.title||source.rating}</b></a><p>Publisher rating: {source.rating}{source.review_date?` · ${source.review_date}`:''}</p></div></article>)}</>:null}<h2>Recommended actions</h2><ul>{report.recommendations.map(item=><li key={item}>{item}</li>)}</ul><p className="proof-limit">This shared report does not contain the original submitted message, image, or link. Risk scores are indicators, not probabilities. Low risk does not guarantee safety.</p></section>}<footer>ProofLens provides evidence, not certainty. Verify sensitive requests through official channels.</footer></main>
}
