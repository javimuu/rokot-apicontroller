import {INewableApiController, IApiController,IApiControllerRoute, IMiddewareFunction} from "./core";
import 'reflect-metadata';
import {DecoratorStore, IPropertyMetadata} from "./decoration";
import {Shared} from "./shared";

interface IApiRoute {
  path: string
  func: Function
}

interface IApiRouteMiddleware {
  keys: string[]
}

interface IApiRouteVerb {
  verbs: HttpVerb[]
}

interface IApiItemDecoration extends IPropertyMetadata {
  route?: IApiRoute
  middleware?: IApiRouteMiddleware
  verb?: IApiRouteVerb
}

interface IApiDecoration {
  name: string
  routePrefix?: string
  middlewares?: string[]
  controllerClass: INewableApiController;
  items?: IApiItemDecoration[]
}

const apiDecorators = new DecoratorStore<IApiDecoration>("controller")

export const apiControllers: IApiController[] = []
export const middlewares: IMiddewareFunction[] = []

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
  const routeVerbs = Shared.makeRouteVerbs(acceptVerbs, route);
  // routeVerbs.forEach(rv => {
  //   this.logger.trace(`-- (${rv.verb}: ${rv.route})`)
  // })
  let middlewares: string[];
  if (api.middlewares) {
    if (middlewareKeys) {
      middlewares = api.middlewares.concat(middlewareKeys);
    } else{
      middlewares = api.middlewares;
    }
  } else{
    middlewares = middlewareKeys;
  }
  return {
    name,
    memberName: apiItem.propertyName,
    routeVerbs,
    middlewares,
    func: apiItem.route.func
  };
}

export class Api{
  middlewareFunction(key: string) {
    return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
      middlewares.push({key,func: target[methodName]});
    }
  }

  include(name: string, routePrefix?: string, middlewares?: string[]) {
    return apiDecorators.fromClass(name, (t) => {
      return {name, middlewares, routePrefix, controllerClass:t as any}
    }, makeApiController, ["route", "middleware", "verb"])
  }

  route(path?: string) {
    return apiDecorators.propCollect<IApiRoute>("route", (t, propertyName, type) => ({propertyName, path, func: t[propertyName]}))
  }

  middleware(...middlewares: string[]) {
    return apiDecorators.propCollect<IApiRouteMiddleware>("middleware", (t, propertyName, type) => ({propertyName, keys: middlewares}))
  }

  acceptVerbs(...verbs: HttpVerb[]) {
    return apiDecorators.propCollect<IApiRouteVerb>("verb", (t, propertyName, type) => ({propertyName, verbs}))
  }
}


export const api = new Api()
// NOTE: Its important to keep AllowedHttpVerbs and HttpVerbs in sync
export const AllowedHttpVerbs = ["options", "get", "head", "post", "put", "delete", "patch"]
export type HttpVerb = "options" | "get" | "head" | "post" | "put" | "delete" | "patch"
//export type MetadataKeyType = string | number | symbol;
// export class MetadataKeys {
//   static controller = "controller"
//   static routePrefix = "routePrefix"
//   static middlewareKeys = "middlewareKeys"
//   static middleware = "middleware"
//   static acceptVerbs = "acceptVerbs"
//   static route = "route"
// }
//
// export interface IRegistry<TValue> {
//   register(name: string, value: TValue): void;
//   toValueArray(): TValue[];
//   asDictionary():{ [key: string]: TValue };
//   getKeyValueArray():{ key: string, value: TValue }[]
// }
//
// class Registry<TValue> implements IRegistry<TValue> {
//   private dictionary: { [key: string]: TValue } = {}
//   asDictionary(){
//     return this.dictionary;
//   }
//   register(key: string, value: TValue){
//     this.dictionary[key] = value;
//   }
//   toValueArray(): TValue[] {
//     var controllers: TValue[] = [];
//     for (var key in this.dictionary) {
//       controllers.push(this.dictionary[key])
//     }
//
//     return controllers;
//   }
//   getKeyValueArray(): {key: string, value: TValue}[] {
//     var controllers: { key: string, value: TValue }[] = [];
//     for (var key in this.dictionary) {
//       controllers.push({ key, value: this.dictionary[key] })
//     }
//     return controllers;
//   }
// }
//
// export const controllerRegistry: IRegistry<INewableApiController> = new Registry<INewableApiController>()
// export const middlewareRegistry: IRegistry<Function> = new Registry<Function>()
//
// export function controller(name: string,middlewares?: string[]): ClassDecorator {
//   return function(target: Function) {
//     controllerRegistry.register(name, target as INewableApiController);
//     Reflect.defineMetadata(MetadataKeys.controller, name, target);
//     if (middlewares && middlewares.length) {
//       Reflect.defineMetadata(MetadataKeys.middlewareKeys, middlewares, target);
//     }
//   }
// }
//
// export function routePrefix(path: string): ClassDecorator {
//   return function(target: Function) {
//     Reflect.defineMetadata(MetadataKeys.routePrefix, path, target);
//   }
// }
//
// export function middleware(key: string) {
//   return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
//     middlewareRegistry.register(key, target[methodName]);
//     Reflect.defineMetadata(MetadataKeys.middleware, key, target, methodName);
//   }
// }
//
// export function middlewareKeys(...middlewares: string[]) {
//   return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
//     Reflect.defineMetadata(MetadataKeys.middlewareKeys, middlewares, target, methodName);
//   }
// }
//
// export function acceptVerbs(...verbs: HttpVerb[]) {
//   return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
//     Reflect.defineMetadata(MetadataKeys.acceptVerbs, verbs, target, methodName);
//   }
// }
//
// export function route(path: string) {
//   return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
//     Reflect.defineMetadata(MetadataKeys.route, path, target, methodName);
//   };
// }
