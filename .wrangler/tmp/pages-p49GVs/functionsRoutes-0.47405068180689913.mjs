import { onRequestGet as __api_leaderboard_ts_onRequestGet } from "/Volumes/SDcard/CODE-SD/Celina52/functions/api/leaderboard.ts"
import { onRequestOptions as __api_leaderboard_ts_onRequestOptions } from "/Volumes/SDcard/CODE-SD/Celina52/functions/api/leaderboard.ts"
import { onRequestPost as __api_leaderboard_ts_onRequestPost } from "/Volumes/SDcard/CODE-SD/Celina52/functions/api/leaderboard.ts"

export const routes = [
    {
      routePath: "/api/leaderboard",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_leaderboard_ts_onRequestGet],
    },
  {
      routePath: "/api/leaderboard",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_leaderboard_ts_onRequestOptions],
    },
  {
      routePath: "/api/leaderboard",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_leaderboard_ts_onRequestPost],
    },
  ]