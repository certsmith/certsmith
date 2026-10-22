import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("guides", "routes/guides.tsx", [
    index("routes/guides._index.tsx"),
    route(":slug", "routes/guides.$slug.tsx"),
  ]),
] satisfies RouteConfig
