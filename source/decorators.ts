import {IApiControllerClass} from "./core";
import 'reflect-metadata';

// NOTE: Its important to keep AllowedHttpVerbs and HttpVerbs in sync
export const AllowedHttpVerbs = ["options", "get", "head", "post", "put", "delete", "patch"]
export type HttpVerb = "options" | "get" | "head" | "post" | "put" | "delete" | "patch"
//export type MetadataKeyType = string | number | symbol;
export class MetadataKeys {
  static controller = "controller"
  static routePrefix = "routePrefix"
  static middlewareKeys = "middlewareKeys"
  static middleware = "middleware"
  static acceptVerbs = "acceptVerbs"
  static route = "route"
}

export interface IRegistry<TValue> {
  register(name: string, value: TValue): void;
  toValueArray(): TValue[];
  asDictionary():{ [key: string]: TValue };
  getKeyValueArray():{ key: string, value: TValue }[]
}

class Registry<TValue> implements IRegistry<TValue> {
  private dictionary: { [key: string]: TValue } = {}
  asDictionary(){
    return this.dictionary;
  }
  register(key: string, value: TValue){
    this.dictionary[key] = value;
  }
  toValueArray(): TValue[] {
    var controllers: TValue[] = [];
    for (var key in this.dictionary) {
      controllers.push(this.dictionary[key])
    }

    return controllers;
  }
  getKeyValueArray(): {key: string, value: TValue}[] {
    var controllers: { key: string, value: TValue }[] = [];
    for (var key in this.dictionary) {
      controllers.push({ key, value: this.dictionary[key] })
    }
    return controllers;
  }
}

export const controllerRegistry: IRegistry<IApiControllerClass> = new Registry<IApiControllerClass>()
export const middlewareRegistry: IRegistry<Function> = new Registry<Function>()

export function controller(name: string,middlewares?: string[]): ClassDecorator {
  return function(target: Function) {
    controllerRegistry.register(name, target as IApiControllerClass);
    Reflect.defineMetadata(MetadataKeys.controller, name, target);
    if (middlewares && middlewares.length) {
      Reflect.defineMetadata(MetadataKeys.middlewareKeys, middlewares, target);
    }
  }
}

export function routePrefix(path: string): ClassDecorator {
  return function(target: Function) {
    Reflect.defineMetadata(MetadataKeys.routePrefix, path, target);
  }
}

export function middleware(key: string) {
  return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
    middlewareRegistry.register(key, target[methodName]);
    Reflect.defineMetadata(MetadataKeys.middleware, key, target, methodName);
  }
}

export function middlewareKeys(...middlewares: string[]) {
  return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
    Reflect.defineMetadata(MetadataKeys.middlewareKeys, middlewares, target, methodName);
  }
}

export function acceptVerbs(...verbs: HttpVerb[]) {
  return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
    Reflect.defineMetadata(MetadataKeys.acceptVerbs, verbs, target, methodName);
  }
}

export function route(path: string) {
  return function(target: any, methodName: string, descriptor?: PropertyDescriptor) {
    Reflect.defineMetadata(MetadataKeys.route, path, target, methodName);
  };
}
