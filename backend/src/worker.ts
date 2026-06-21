import { env } from "./config/env"

console.log(`BookmarX worker started in ${env.NODE_ENV} mode`)

process.on("SIGINT", () => {
  console.log("BookmarX worker stopping")
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("BookmarX worker stopping")
  process.exit(0)
})
