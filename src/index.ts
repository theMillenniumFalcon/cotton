import { readFileSync } from "fs";
import { Config } from "./types";
import Server from "./server";

const CONFIG_PATH = "./config/index.json";

const config: Config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"))

config.forEach((server) => {
    new Server(server)
})