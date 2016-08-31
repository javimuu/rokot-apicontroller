import {HttpVerb,AllowedHttpVerbs, IApiController,IApiControllerRoute, IMiddewareFunction,INewable,IMiddlewareKey, MiddewareFunctionDictionary} from "./core";
import 'reflect-metadata';
import {DecoratorStore, IPropertyMetadata} from "./decoration";
import {Shared} from "./shared";

interface IApiRoute {
  path: string
  func: Function
}

interface IApiRouteMiddleware {
  keys: IMiddlewareKey[]
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
interface IApiRouteContentType {
  contentType: string
}

interface IApiItemDecoration extends IPropertyMetadata {
  route?: IApiRoute
  middleware?: IApiRouteMiddleware
  verb?: IApiRouteVerb
  contentType?: IApiRouteContentType
  bodyValidator?: IApiValidator<any>
  queryValidator?: IApiValidator<any>
  paramsValidator?: IApiValidator<any>
}

interface IApiDecoration {
  name: string
  routePrefix?: string
  middlewares?: IMiddlewareKey[]
  controllerClass: INewable<IApiController>;
  items?: IApiItemDecoration[]
}

const apiDecorators = new DecoratorStore<IApiDecoration>("controller")

/** the complete set of Api Controllers that have been loaded (indicated via @api.controller) */
export const apiControllers: IApiController[] = []

/** the complete set of Middleware functions that have been loaded (indicated via @api.middlewareFunction or @api.middlewareProviderFunction) */
export const middlewareFunctions: MiddewareFunctionDictionary = {}

/** Register a named middleware function */
export function registerMiddlewareFunction(key: string, func: Function) {
  middlewareFunctions[key] = {key, func}
}

/** Register a function that can be called with a specified min/max number of parameters that will return a middleware function */
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
  const contentType = apiItem.contentType ? apiItem.contentType.contentType : Shared.defaultContentType()
  const acceptVerbs = apiItem.verb ? apiItem.verb.verbs : Shared.defaultVerbs(apiItem.propertyName)
  const name = Shared.makeRouteName(api.name, apiItem.propertyName);
  const route = Shared.makeRoute(api.routePrefix, memberRoute);
  const verbs = acceptVerbs;
  let middlewares: IMiddlewareKey[];
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
    contentType,
    middlewares,
    func: apiItem.route.func,
    validateBody: apiItem.bodyValidator && apiItem.bodyValidator.validate,
    validateParams: apiItem.paramsValidator && apiItem.paramsValidator.validate,
    validateQuery: apiItem.queryValidator && apiItem.queryValidator.validate,
  };
}

function buildMiddlewareKey(key: string, params: any[]): IMiddlewareKey {
  if (!params || !params.length) {
    return {key}
  }
  return {key, params}
}

export interface IMiddlewareKeyBuilder {
  add(key: string, ...params: any[]): IMiddlewareKeyBuilder
}

class MiddewareKeyBuilder implements IMiddlewareKeyBuilder {
  keys: IMiddlewareKey[] = []
  add(key: string, ...params: any[]): IMiddlewareKeyBuilder{
    this.keys.push(buildMiddlewareKey(key, params))
    return this;
  }
}

export class Api{
  /** Indicate a named middleware function */
  middlewareFunction(key: string) {
    return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
      registerMiddlewareFunction(key, target[methodName]);
    }
  }

  /** Indicate that this function can be called with a specified min/max number of parameters, and will return a middleware function */
  middlewareProviderFunction(key: string, paramMin: number, paramMax = paramMin) {
    return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
      registerMiddlewareProvider(key,target[methodName],paramMin,paramMax)
    }
  }

  /** Indictes a class (the Api Controller) whose members provide REST route methods */
  controller(name: string, routePrefix?: string, middlewareBuilder?: (b: IMiddlewareKeyBuilder) => void) {
    return apiDecorators.fromClass(name, (t) => {
      let middlewares: IMiddlewareKey[];
      if (middlewareBuilder) {
        const mwb = new MiddewareKeyBuilder()
        middlewareBuilder(mwb)
        middlewares = mwb.keys
      }
      return {name, middlewares, routePrefix, controllerClass:t as any}
    }, makeApiController, ["route", "middleware", "verb", "bodyValidator", "queryValidator", "paramsValidator", "contentType"])
  }

  /** Indicates an Api Controller route (expressing the route path as something your engines routing understands) (can define ONLY ONCE per route - last one wins!) */
  route(path?: string) {
    return apiDecorators.memberCollect<IApiRoute>("route", (t, propertyName, type) => ({propertyName, path, func: t[propertyName]}))
  }

  /** Associate ONE middleware with the route (can define multiple per route)*/
  middleware(key: string, ...params: any[]) {
    return apiDecorators.memberCollect<IApiRouteMiddleware>("middleware", (t, propertyName, type) => ({propertyName, keys: [buildMiddlewareKey(key, params)]}))
  }

  /** Implicity define the REST verb(s) to be used by the route (can define ONLY ONCE per route - last one wins!)*/
  verbs(...verbs: HttpVerb[]) {
    return apiDecorators.memberCollect<IApiRouteVerb>("verb", (t, propertyName, type) => ({propertyName, verbs}))
  }
  contentType(contentType: string) {
    return apiDecorators.memberCollect<IApiRouteContentType>("contentType", (t, propertyName, type) => ({propertyName, contentType}))
  }

  /** Define a validator function for the request body (can define ONLY ONCE per route - last one wins!)*/
  bodyValidator<T>(validate: IApiValidatorFunction<T>) {
    return this.validator<T>(validate, "bodyValidator")
  }

  /** Define a validator function for the request query string (can define ONLY ONCE per route - last one wins!)*/
  queryValidator<T>(validate: IApiValidatorFunction<T>) {
    return this.validator<T>(validate, "queryValidator")
  }

  /** Define a validator function for the expected url parameters (can define ONLY ONCE per route - last one wins!)*/
  paramsValidator<T>(validate: IApiValidatorFunction<T>) {
    return this.validator<T>(validate, "paramsValidator")
  }

  private validator<T>(validate: IApiValidatorFunction<T>, itemType: string) {
    return apiDecorators.memberCollect<IApiValidator<T>>(itemType, (t, propertyName, type) => ({propertyName, validate}))
  }
}

/** The decorators required to define Api Controllers */
export const api = new Api()
