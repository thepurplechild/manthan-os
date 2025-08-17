import axios from "axios";
const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8081";
export const api = axios.create({ baseURL: base });
