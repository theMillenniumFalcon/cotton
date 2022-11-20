export interface ConfigServer {
    root: string
    port?: number
    proxy?: string
    location?: string
}

export type Config = ConfigServer[] 