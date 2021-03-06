import * as _ from "underscore";
import {INewable,INewableConstructor,AllowedHttpVerbs, HttpVerb,IMiddlewareKey} from "./core";

export class Shared {
  static construct<T>(controllerClass: INewable<T>, controllerName: string, controllerConstructor?: INewableConstructor<T>): T {
    return controllerConstructor ? controllerConstructor(controllerClass, controllerName) : new controllerClass();
  }

  static defaultVerbs(memberName: string) {
    if (AllowedHttpVerbs.indexOf(memberName as HttpVerb) > -1) {
      return [memberName as HttpVerb];
    }
    return ["get" as HttpVerb];
  }

  static defaultRoute() {
    return "";
  }

  static defaultMiddleware() : IMiddlewareKey[] | undefined {
    return undefined;
  }

  static defaultContentType() : string {
    return "application/json";
  }

  private static ensureSlash(route?: string) {
    if (!route) {
      return ""
    }
    if (route.indexOf("/") !== 0) {
      return `/${route}`
    }
    return route
  }

  private static isEmptyRoute(route?: string) {
    return !route || route === "/"
  }

  static makeRoute(routePrefix?: string, memberRoute?: string) : string {
    if (this.isEmptyRoute(routePrefix)) {
      if (this.isEmptyRoute(memberRoute)) {
        return "/"
      }

      return this.ensureSlash(memberRoute);
    }
    if (this.isEmptyRoute(memberRoute)) {
      return this.ensureSlash(routePrefix)
    }

    return `${this.ensureSlash(routePrefix)}${this.ensureSlash(memberRoute)}`
  }

  static makeRouteName(controllerName: string, name: string) {
    return controllerName ? `${controllerName}_${name}` : name;
  }
}
