import axios from "axios";
const base = process.env.NEXT_PUBLIC_API_BASE || "https://manthan-backend-524579286496.asia-south1.run.app";
export const api = axios.create({ baseURL: base });
