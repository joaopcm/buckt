import { Hono } from "hono"
import create from "./create"
import list from "./list"
import get from "./get"
import del from "./delete"

const app = new Hono()

app.route("/", create)
app.route("/", list)
app.route("/", get)
app.route("/", del)

export default app
