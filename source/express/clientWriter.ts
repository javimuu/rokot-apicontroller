import * as _ from "underscore";
import * as fs from "fs";
import {IApiClient,IApiClientRoute} from "../client/apiClientBuilder";
import * as pathToRegexp from 'path-to-regexp'
import {FileStreamWriter} from "../fileStreamWriter";

/** Writes the api client to a single file, you need to override Fetcher.request to implement fetch */
export function expressClientWriter(outFile: string, apiClient: IApiClient, genericResponseWrapper?: (type: string) => string, ...imports: string[]) {
  return FileStreamWriter.write(outFile, stream => {
    if (imports) {
      imports.forEach(i => {
        stream.write(`${i}\n`);
      })
    }
    apiClient.refs.forEach(r => {
      stream.write(`export ${r}\n`);
    })

    const responseType = genericResponseWrapper ? genericResponseWrapper("T") : "T"

    stream.write(`
export class Fetcher {
  static request = <T>(url: string, verb: string, contentType: string, body?: any): Promise<${responseType}> => {
    return null;
  }

  static buildQueryStringValue = (value: any, key: string) => {
    return value
  }

  static buildQueryString = (query?: any) => {
    if (!query) {
      return ""
    }
    const qs = Object.keys(query).map(k => {
      return \`\${k}=\${Fetcher.buildQueryStringValue(query[k], k)}\`
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
`);
      stream.write(controller.routes.map(r => {
        const verbs = r.verbs
        let route = resolveRoutePath(r)
        if (!isVoid(r.queryType)) {
          route += "${Fetcher.buildQueryString(query)}"
        }
        const responseType = genericResponseWrapper ? genericResponseWrapper(r.responseType) : r.responseType
        //const rt = console.log(keys)//.compile(r.route)
        const params = _.filter([formatTypeParam("body", r.bodyType), formatTypeParam("params", r.paramsType), formatTypeParam("query?", r.queryType)], q => !!q).join(",")
        return verbs.map((verb, index) => `
  ${r.name}${index > 0 ? "_" + verb : ""}(${params}): Promise<${responseType}> {
    return Fetcher.request<${r.responseType}>(\`${route}\`, "${verb}", "${r.contentType}"${isVoid(r.bodyType) ? "" : ", body" })
  }`).join("\n")
      }).join("\n"));
      stream.write(`
}`);
    })

    stream.write(`
export class ApiClient {
`);

    apiClient.controllers.forEach(controller => {
      stream.write(`
  ${makeInstanceName(controller.typeName)} = new ${controller.typeName}()
  `);
    })

    stream.write(`
}
export const apiClient = new ApiClient()
`);

  })
}

function makeInstanceName(name: string){
  const idx = name.indexOf("Controller")
  if (idx > -1) {
      name = name.substr(0, idx)
  }
  return name.substr(0,1).toLowerCase() + name.substr(1)
}

function resolveRoutePath(r: IApiClientRoute) {
  let route = r.route;
  const keys:{name:string, optional: boolean}[]=[]
  pathToRegexp(route, keys as any)
  keys.forEach(k => {
    if (k.optional) {
      route = route.replace(`/:${k.name}?` , `\${optionalParam(params.${k.name})}`)
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
