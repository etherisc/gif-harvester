import * as dotenv from 'dotenv';

dotenv.config();

export const DUNE_API_BASE_URL = process.env.DUNE_API_BASE_URL || "https://api.dune.com/api";
export const DUNE_API_KEY = process.env.DUNE_API_KEY || "";

export const DUNE_QUERY_ID_BASE_LATEST_BLOCK = process.env.DUNE_QUERY_ID_BASE_LATEST_BLOCK || "4243294";
