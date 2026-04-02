import { Hono } from "hono"
import upload from "./upload"
import list from "./list"
import get from "./get"
import del from "./delete"

const app = new Hono()

app.route("/", upload)
app.route("/", list)
app.route("/", get)
app.route("/", del)

export default app
