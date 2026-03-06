import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({ baseURL: API_URL });

export async function searchDatasets(params: {
  q: string;
  country?: string;
  category?: string;
  format?: string;
  source?: string;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get("/search", { params });
  return data;
}

export async function fetchDataset(id: string) {
  const { data } = await api.get(`/datasets/${id}`);
  return data;
}

export async function fetchRecentDatasets() {
  const { data } = await api.get("/datasets", { params: { limit: 6, offset: 0 } });
  return data;
}

export async function fetchStats() {
  const { data } = await api.get("/stats");
  return data;
}

export async function fetchCategories() {
  const { data } = await api.get("/categories");
  return data;
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function fetchAdminStats() {
  const { data } = await api.get("/admin/stats");
  return data;
}

export async function fetchSearchLogs(limit = 50, offset = 0) {
  const { data } = await api.get("/admin/search-logs", { params: { limit, offset } });
  return data;
}

export async function fetchAdminReviews(limit = 50, offset = 0) {
  const { data } = await api.get("/admin/reviews", { params: { limit, offset } });
  return data;
}

export async function deleteReview(id: number) {
  const { data } = await api.delete(`/admin/reviews/${id}`);
  return data;
}

export async function fetchIndexStatus() {
  const { data } = await api.get("/admin/index/status");
  return data;
}

export async function triggerIndexation(source: "worldbank" | "hdx" | "all") {
  const { data } = await api.post(`/admin/index/${source}`);
  return data;
}

export async function submitReview(review: {
  dataset_id?: string;
  dataset_title?: string;
  rating: number;
  comment?: string;
  author?: string;
}) {
  const { data } = await api.post("/reviews", review);
  return data;
}

export async function fetchDatasetReviews(datasetId: string) {
  const { data } = await api.get(`/reviews/dataset/${datasetId}`);
  return data as { id: number; rating: number; comment: string | null; author: string; created_at: string }[];
}

export async function fetchEmbedStatus() {
  const { data } = await api.get("/admin/embed/status");
  return data as { status: string; done: number; total: number; error: string | null; last_run: string | null };
}

export async function triggerEmbeddings() {
  const { data } = await api.post("/admin/embed/all");
  return data;
}
