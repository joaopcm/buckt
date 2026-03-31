import { Hono } from "hono"
import create from "./create"
import list from "./list"
import del from "./delete"

const app = new Hono()

app.route("/", create)
app.route("/", list)
app.route("/", del)

export default app
