import {IApiController,IApiControllerRoute, IMiddewareFunction,INewable,MiddewareProviderType,IMiddewareProvider, MiddewareFunctionDictionary} from "./core";
import 'reflect-metadata';
import {DecoratorStore, IPropertyMetadata} from "./decoration";
import {Shared} from "./shared";

interface IApiRoute {
  path: string
  func: Function
}

interface IApiRouteMiddleware {
  keys: MiddewareProviderType[]
}

interface IApiValidator<T> {
  validate : IApiValidatorFunction<T>
}

export interface IApiValidatorFunction<T> {
  (item: T): T
}

interface IApiRouteVerb {
  verbs: HttpVerb[]
}

interface IApiItemDecoration extends IPropertyMetadata {
  route?: IApiRoute
  middleware?: IApiRouteMiddleware
  verb?: IApiRouteVerb
  bodyValidator?: IApiValidator<any>
  queryValidator?: IApiValidator<any>
  paramsValidator?: IApiValidator<any>
}

interface IApiDecoration {
  name: string
  routePrefix?: string
  middlewares?: MiddewareProviderType[]
  controllerClass: INewable<IApiController>;
  items?: IApiItemDecoration[]
}

const apiDecorators = new DecoratorStore<IApiDecoration>("controller")

export const apiControllers: IApiController[] = []
export const middlewareFunctions: MiddewareFunctionDictionary = {}

export function registerMiddlewareFunction(key: string, func: Function) {
  middlewareFunctions[key] = {key, func}
}

export function registerMiddlewareProvider(key: string, func: Function, paramMin: number, paramMax = paramMin) {
  middlewareFunctions[key] = {key, func,paramMin,paramMax}
}

function makeApiController(decorator: IApiDecoration): IApiController {
  const c = {
    name:decorator.name,
    routes: decorator.items.map(i => buildApiControllerRoute(i, decorator)),
    controllerClass: decorator.controllerClass
  }

  apiControllers.push(c)
  return c
}

function buildApiControllerRoute(apiItem: IApiItemDecoration, api: IApiDecoration): IApiControllerRoute {
  const memberRoute = apiItem.route ? apiItem.route.path : Shared.defaultRoute()
  const middlewareKeys = apiItem.middleware ? apiItem.middleware.keys : Shared.defaultMiddleware()
  const acceptVerbs = apiItem.verb ? apiItem.verb.verbs : Shared.defaultVerbs(apiItem.propertyName)
  const name = Shared.makeRouteName(api.name, apiItem.propertyName);
  const route = Shared.makeRoute(api.routePrefix, memberRoute);
  const verbs = acceptVerbs;
  let middlewares: MiddewareProviderType[];
  if (api.middlewares) {
    if (middlewareKeys) {
      middlewares = [...api.middlewares, ...middlewareKeys];
    } else{
      middlewares = api.middlewares;
    }
  } else{
    middlewares = middlewareKeys;
  }
  return {
    name,
    memberName: apiItem.propertyName,
    route,
    verbs,
    middlewares,
    func: apiItem.route.func,
    validateBody: apiItem.bodyValidator && apiItem.bodyValidator.validate,
    validateParams: apiItem.paramsValidator && apiItem.paramsValidator.validate,
    validateQuery: apiItem.queryValidator && apiItem.queryValidator.validate,
  };
}

export class Api{
  middlewareFunction(key: string) {
    return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
      registerMiddlewareFunction(key, target[methodName]);
    }
  }

  middlewareProviderFunction(key: string, paramMin: number, paramMax = paramMin) {
    return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
      registerMiddlewareProvider(key,target[methodName],paramMin,paramMax)
    }
  }

  include(name: string, routePrefix?: string, middlewares?: string[]) {
    return apiDecorators.fromClass(name, (t) => {
      return {name, middlewares, routePrefix, controllerClass:t as any}
    }, makeApiController, ["route", "middleware", "verb", "bodyValidator", "queryValidator", "paramsValidator"])
  }

  route(path?: string) {
    return apiDecorators.memberCollect<IApiRoute>("route", (t, propertyName, type) => ({propertyName, path, func: t[propertyName]}))
  }

  middleware(...middlewares: MiddewareProviderType[]) {
    return apiDecorators.memberCollect<IApiRouteMiddleware>("middleware", (t, propertyName, type) => ({propertyName, keys: middlewares}))
  }

  acceptVerbs(...verbs: HttpVerb[]) {
    return apiDecorators.memberCollect<IApiRouteVerb>("verb", (t, propertyName, type) => ({propertyName, verbs}))
  }

  bodyValidator<T>(validate: IApiValidatorFunction<T>) {
    return this.validator<T>(validate, "bodyValidator")
  }

  queryValidator<T>(validate: IApiValidatorFunction<T>) {
    return this.validator<T>(validate, "queryValidator")
  }

  paramsValidator<T>(validate: IApiValidatorFunction<T>) {
    return this.validator<T>(validate, "paramsValidator")
  }

  private validator<T>(validate: IApiValidatorFunction<T>, itemType: string) {
    return apiDecorators.memberCollect<IApiValidator<T>>(itemType, (t, propertyName, type) => ({propertyName, validate}))
  }
}


export const api = new Api()
// NOTE: Its important to keep AllowedHttpVerbs and HttpVerbs in sync
export const AllowedHttpVerbs = ["options", "get", "head", "post", "put", "delete", "patch"]
export type HttpVerb = "options" | "get" | "head" | "post" | "put" | "delete" | "patch"
