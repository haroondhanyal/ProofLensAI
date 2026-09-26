export type Evidence = {
  title: string;
  description: string;
  severity: string;
};

export type Scan = {
  scan_id: string;
  scan_type: string;
  risk_score: number;
  risk_level: string;
  confidence: string;
  summary: string;
  evidence: Evidence[];
  recommendations: string[];
  created_at?: string;
  is_demo?: boolean;
  is_saved?: boolean;
  is_shared?: boolean;
  analysis_meta?: {
    local_ai?: { status?: string; model?: string; insight?: string };
    page_fetch?: { status?: string; final_url?: string; http_status?: number; redirect_count?: number };
    image_metadata?: Record<string, string>;
    c2pa_status?: string;
    claim_sources?: { publisher: string; url: string; title: string; review_date: string; rating: string }[];
    local_signatures?: { status?: string; matches?: string[] };
    hostname?: string;
    fetch_status?: string;
    sha256?: string;
    declared_mime_type?: string;
    embedded_urls?: string[];
    extracted_text?: string;
    qr_destination?: string | null;
    yara?: { status?: string; matches?: string[] };
    antivirus?: { status?: string; scanner?: string; signature?: string };
    media_provider?: {
      status?: string;
      ai_generated?: { label?: string; confidence?: number } | null;
      deepfake?: { label?: string; confidence?: number } | null;
    };
  };
};

export type ScanMode = 'url' | 'message' | 'screenshot' | 'qr' | 'image' | 'file' | 'store' | 'product' | 'claim';
