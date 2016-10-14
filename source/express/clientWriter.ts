import * as _ from "underscore";
import * as fs from "fs";
import {IApiClient, IApiClientRoute} from "../client/apiClientBuilder";
import * as pathToRegexp from 'path-to-regexp'
import {FileStreamWriter} from "../fileStreamWriter";

/** Writes the api client to a single file, you need to override Fetcher.request to implement fetch */
export interface IExpressClientWriterOptions {
  genericResponseWrapper?: (type: string) => string
  mode?: "All" | "Definitions" | "Controllers"
}
export function expressClientWriter(outFile: string, apiClient: IApiClient, options?: IExpressClientWriterOptions, ...imports: string[]) {
  return FileStreamWriter.write(outFile, stream => {
    const mode = options && options.mode || "All"
    if (mode !== "Definitions") {
      if (imports) {
        imports.forEach(i => {
          stream.write(`${i}\n`);
        })
      }
    }

    if (mode !== "Controllers") {
      apiClient.refs.forEach(r => {
        if (mode === "Definitions") {
          stream.write(`${r.indexOf("enum ") === 0 ? "declare " : ""}${r}\n`);
          return
        }
        stream.write(`export ${r}\n`);
      })
    }

    if (mode !== "Definitions") {

      const responseType = options && options.genericResponseWrapper ? options.genericResponseWrapper("T") : "T"

      stream.write(`
export interface IFetcher {
  request<T>(url: string, verb: string, contentType: string, body?: any): Promise<${responseType}>
  buildQueryString?(query?: any): string
}

export class Qs {
  private static buildQueryStringValue(value: any, key: string) {
    return value
  }

  static buildQueryString(query?: any) {
    if (!query) {
      return ""
    }

    const qs = Object.keys(query).map(k => {
      return \`\${k}=\${Qs.buildQueryStringValue(query[k], k)}\`
    }).join("&")

    return qs.length ? \`?\${qs}\` : ""
  }
}

function optionalParam(parameter) {
  return parameter ? \`/\${parameter}\` : ""
}

`);
      apiClient.controllers.forEach(controller => {
        stream.write(`
export class ${controller.typeName} {
  constructor(private fetcher: IFetcher){}
`);
        stream.write(controller.routes.map(r => {
          const verbs = r.verbs
          let route = resolveRoutePath(r)
          if (!isVoid(r.queryType)) {
            route += "${this.fetcher.buildQueryString(query)}"
          }
          const responseType = options && options.genericResponseWrapper ? options.genericResponseWrapper(r.responseType) : r.responseType
          //const rt = console.log(keys)//.compile(r.route)
          const params = _.filter([formatTypeParam("body", r.bodyType), formatTypeParam("params", r.paramsType), formatTypeParam("query?", r.queryType)], q => !!q).join(",")
          return verbs.map((verb, index) => `
  ${r.name}${index > 0 ? "_" + verb : ""}(${params}): Promise<${responseType}> {
    return this.fetcher.request<${r.responseType}>(\`${route}\`, "${verb}", "${r.contentType}"${isVoid(r.bodyType) ? "" : ", body"})
  }`).join("\n")
        }).join("\n"));
        stream.write(`
}`);
      })

      stream.write(`
export class ApiClient {
  constructor(private fetcher: IFetcher){}
`);

      apiClient.controllers.forEach(controller => {
        stream.write(`
  ${makeInstanceName(controller.typeName)} = new ${controller.typeName}(this.fetcher)
  `);
      })

      stream.write(`
}
//export const apiClient = new ApiClient()
`);
    }
  })

}

function makeInstanceName(name: string) {
  const idx = name.indexOf("Controller")
  if (idx > -1) {
    name = name.substr(0, idx)
  }
  return name.substr(0, 1).toLowerCase() + name.substr(1)
}

function resolveRoutePath(r: IApiClientRoute) {
  let route = r.route;
  const keys: { name: string, optional: boolean }[] = []
  pathToRegexp(route, keys as any)
  keys.forEach(k => {
    if (k.optional) {
      route = route.replace(`/:${k.name}?`, `\${optionalParam(params.${k.name})}`)
      return
    }
    route = route.replace(":" + k.name, `\${params.${k.name}}`)
  })
  return route
}

function isVoid(type: string) {
  return !type || type === "void"
}

function formatTypeParam(name: string, type: string) {
  if (isVoid(type)) {
    return;
  }
  return `${name}: ${type}`
}
