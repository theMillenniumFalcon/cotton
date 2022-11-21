import express, { Express, Request, Response } from "express";
import { existsSync } from "fs";
import proxy from "express-http-proxy";
import { exit } from "process";
import { isBool, isNumber, isString } from "../utils";

import { ConfigServer } from "../types";

export default class Server {
    private config: ConfigServer
    private serverNumber: number
    private server: Express
    private currentRequestPath: string

    constructor(config: ConfigServer, serverNumber: number) {
        this.config = config
        this.serverNumber = serverNumber
        this.server = express()
        this.currentRequestPath = ""
        this.checkConfig()

        if (this.config.proxy) {
            this.server.use(this.config.location as string, proxy(this.config.proxy))
        }

        this.setupRoutes();
        this.start()
    }

    // checks if the configuration has errors, and formats the data
    private checkConfig(): void {
        if (this.config.proxy && this.config.port) {
            this.error("There cannot be both a 'proxy' and a 'root' in the same server.")
        }
        if (this.config.proxy && this.config.headers !== undefined) {
            this.error("The 'headers' configuration cannot be used in the same server as a 'proxy'.)")
        }

        if (!this.config.proxy && !this.config.root) {
            this.error("A 'root' or 'proxy' is required in order to start a server.")
        }

        if (this.config.proxy && !isString(this.config.proxy)) {
            this.error("'proxy' must be of type string.")
        }

        if (this.config.root && !isString(this.config.root)) {
            this.error("'root' must be of type string.")
        }

        if (this.config.port !== undefined && !isNumber(this.config.port)) {
            this.error("'port' must be of type number.")
        }

        if (this.config.location && !isString(this.config.location)) {
            this.error("'location' must be of type string.")
        }

        if (this.config.redirectHtmlExtension && !isBool(this.config.redirectHtmlExtension)) {
            this.error("'redirectHtmlExtension must be of type boolean.'")
        }

        if (this.config.notFoundPath && !isString(this.config.notFoundPath)) {
            this.error("'notFoundPath must be of type string.'")
        }

        if (this.config.internalErrorPath && !isString(this.config.internalErrorPath)) {
            this.error("'internalErrorPath' must be of type string.")
        }

        if (this.config.forbiddenPath && !isString(this.config.forbiddenPath)) {
            this.error("'forbiddenPath' must be of type string.")
        }

        if (this.config.allowedFileTypes && this.config.forbiddenFileTypes) {
            this.error("There can only be 'allowedFileTypes' or 'forbiddenFileTypes', not both.")
        }

        this.config.location = this.removeOuterSlashes(this.config.location)
        this.config.notFoundPath = this.removeOuterSlashes(this.config.notFoundPath)
        this.config.internalErrorPath = this.removeOuterSlashes(this.config.internalErrorPath)
        this.config.forbiddenPath = this.removeOuterSlashes(this.config.forbiddenPath)
    }

    // Remove all outer slashes of from a string
    private removeOuterSlashes(url: string | undefined): string {
        if (url === "/" || !url) return "/"
        while (url[0] === "/") {
            url = url?.substring(1)
        }

        while (url[url.length - 1] === "/") {
            url = url?.slice(0, -1)
        }

        return url
    }

    // creates routes for the server
    private setupRoutes(): void {
        this.server.get("*", (req, res) => {
            const filePath = `${this.config.root}/${req.originalUrl}`

            if (existsSync(filePath)) {
                // if (this.extensionsEnabled) {
                //     if (this.checkForExtensions(req, res)) return
                // }

                this.sendFile(res, filePath)
            } else if (existsSync(filePath + ".html")) {
                if (req.originalUrl === "/index") {
                    res.redirect("/");
                } else {
                    this.sendFile(res, filePath + ".html")
                }
            } else {
                res.status(404).send("<h1>404 Not Found</h1>")
            }
        })
    }

    private sendFile(res: Response, path: string): void {
        res.sendFile(path, null, (err) => {
            if (err) {
                res.status(404).send("<h1>404 Not Found</h1>")
            }
        })
    }

    private checkForExtensions(req: Request, res: Response): boolean {
        const lastDotIndex = req.originalUrl.lastIndexOf('.')

        if (lastDotIndex !== -1) {
            const removedExtensionUrl = req.originalUrl.substring(0, lastDotIndex)
            if (removedExtensionUrl === "/index") {
                res.redirect("/")
            } else {
                res.redirect(removedExtensionUrl)
            }

            return true
        } else {
            return false
        }
    }

    private error(message: string) {
        console.error("\x1b[31m", "[ERROR]:", "\x1b[0m", message, `(server #${this.serverNumber})`)
        console.log("Program has exited.")
        exit(1)
    }
}