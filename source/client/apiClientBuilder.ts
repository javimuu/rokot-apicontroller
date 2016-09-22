import * as ts from "typescript";
import * as _ from "underscore";
import * as fs from "fs";
import {ITypeReg, ApiReflector} from "./apiReflector";
import {Logger} from "bunyan";
import {IApi,IMiddlewareKey} from "../core";

export interface IApiClientRoute {
  name: string
  route: string
  verbs: string[]
  contentType: string
  middleware: IMiddlewareKey[] | undefined
  bodyType: string
  queryType: string
  paramsType: string
  responseType: string
}

export interface IApiClientController {
  typeName: string
  routes: IApiClientRoute[]
}

export interface IApiClient {
  refs: string[]
  controllers: IApiClientController[]
}

function makeRef(source: string) {
  const src = source.trim()
  const idx = src.indexOf("export ")
  if (idx > -1) {
    return src.substr(idx + 7)
  }
  return src;
}

function getTypeArgument(node: ts.TypeReferenceNode, index: number){
  if (!node || !node.typeArguments) {
    return "";
  }
  return node.typeArguments[index].getText();
}

function findRoute(api: IApi, typeName: string, memberName: string) {
  const found = _.find(api.controllers, c => c.name === typeName)
  if (!found) {
    return;
  }
  return _.find(found.routes, r => r.memberName === memberName)
}

/** Builds api clients using type information obtained by reflecting the ApiController source code*/
export class ApiClientBuilder{
  constructor(private logger: Logger){}

  build(sourcePaths: string[], api: IApi): IApiClient {
    const reflector = new ApiReflector(this.logger, sourcePaths);
    const result = reflector.reflect();
    const apiClient: IApiClient = { refs: result.dependencies.map(r => makeRef(r.node.getFullText())), controllers: [] }

    result.api.forEach(i => {
      const cls = i.node as ts.ClassDeclaration
      const controller: IApiClientController = { typeName: i.name, routes: [] };
      const routes = cls.members.filter(m => {
        const items = ApiReflector.getApiAttr(m.decorators, "route");
        return items && items.length > 0
      }) as ts.MethodDeclaration[]
      routes.forEach(r => {
        const rt = r.parameters[0].type as ts.TypeReferenceNode;
        const typeArgCount = rt.typeArguments ? rt.typeArguments.length : 0
        const name = (r.name as ts.Identifier).text;
        let body = "void"
        let indexStart = 0;
        if (typeArgCount === 4) {
          body = getTypeArgument(rt, 0)
          indexStart = 1;
        } else if (typeArgCount !== 3) {
          this.logger.error(`Unable to extract types from controller type '${controller.typeName}' member: '${name}'`)
          return
        }

        const response = getTypeArgument(rt, indexStart)
        const params = getTypeArgument(rt, indexStart + 1)
        const query = getTypeArgument(rt, indexStart + 2)
        const route = findRoute(api, controller.typeName, name)
        if (!route) {
          this.logger.error(`Unable to find api route/verbs for controller type '${controller.typeName}' member: '${name}'`)
          return
        }

        controller.routes.push({
          name,
          contentType: route.contentType,
          middleware: route.middlewares,
          bodyType: body,
          queryType: query,
          paramsType: params,
          responseType: response,
          verbs: route.verbs,
          route: route.route
        })
      })

      if (controller.routes.length) {
        apiClient.controllers.push(controller)
      }
    })
    return apiClient;
  }
}
