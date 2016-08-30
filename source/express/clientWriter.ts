import * as ts from "typescript";
import * as _ from "underscore";
import * as fs from "fs";
import {IApiClient} from "../client/apiClientBuilder";
import * as pathToRegexp from 'path-to-regexp'
import {FileStreamWriter} from "../fileStreamWriter";

export function expressClientWriter(outFile: string, apiClient: IApiClient) {
  return FileStreamWriter.write(outFile, stream => {
    apiClient.refs.forEach(r => {
      stream.write(`export ${r}\n`);
    })

    stream.write(`
export class Fetcher {
  static request = (url: string, verb: string, body?: any): Promise<any> => {
    return null;
  }

  static buildQueryString = (query: any) => {
    const qs = Object.keys(query).map(k => {
      return \`\${k}=\${query[k]}\`
    }).join("&")
    return qs.length ? \`?\${qs}\` : ""
  }
}
`);
    apiClient.controllers.forEach(apiClient => {
      stream.write(`
export class ${apiClient.typeName} {
`);
      stream.write(apiClient.routes.map(r => {
        const verbs = r.verbs
        const keys:{name:string, optional: boolean}[]=[]
        let route = r.route;
        pathToRegexp(route, keys as any)
        keys.forEach(k => {
          if (k.optional) {
            route = route.replace(`/:${k.name}?` , `\${params.${k.name} ? "/" + params.${k.name} : ""}`)
            return
          }
          route = route.replace(":" + k.name, `\${params.${k.name}}`)
        })
        if (!isVoid(r.queryType)) {
          route += "${Fetcher.buildQueryString(query)}"
        }
        //const rt = console.log(keys)//.compile(r.route)
        const params = _.filter([formatTypeParam("body", r.bodyType), formatTypeParam("params", r.paramsType), formatTypeParam("query?", r.queryType)], q => !!q).join(",")
        return verbs.map((verb, index) => `
    ${r.name}${index > 0 ? "_" + verb : ""}(${params}): Promise<${r.responseType}> {
      const route = \`${route}\`
      return Fetcher.request(route, "${verb}"${isVoid(r.bodyType) ? "" : ", body" })
    }`).join("\n")
      }).join("\n"));
      stream.write(`
}`);
    })
  })
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
