// ── Roadmap types shared across pages, components, and export utilities ──

export interface RoadmapItem {
  title: string;
  description: string;
  priority?: string;
  confidence?: string;
}

export interface Roadmap {
  id: string;
  project_id: string;
  title: string;
  now_items: RoadmapItem[];
  next_items: RoadmapItem[];
  later_items: RoadmapItem[];
  plan_30_days: RoadmapItem[];
  plan_60_days: RoadmapItem[];
  plan_90_days: RoadmapItem[];
  risks: RoadmapItem[];
  dependencies: RoadmapItem[];
  success_metrics: RoadmapItem[];
  is_mock?: boolean;
  created_at: string;
}

