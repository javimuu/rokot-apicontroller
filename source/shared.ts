import * as _ from "underscore";
import {AllowedHttpVerbs} from "./decorators";
import {INewable,INewableConstructor} from "./core";

export class Shared {
  static construct<T>(controllerClass: INewable<T>, controllerName: string, controllerConstructor: INewableConstructor<T>): T {
    return controllerConstructor ? controllerConstructor(controllerClass, controllerName) : new controllerClass();
  }

  static defaultVerbs(memberName: string) {
    if (AllowedHttpVerbs.indexOf(memberName) > -1) {
      return [memberName];
    }
    return ["get"];
  }

  static defaultRoute() {
    return "";
  }

  static defaultMiddleware() : string[] {
    return undefined;
  }

  private static ensureSlash(route: string) {
    if (route.indexOf("/") !== 0) {
      return `/${route}`
    }
    return route
  }

  private static isEmptyRoute(route: string) {
    return !route || route === "/"
  }

  static makeRoute(routePrefix: string, memberRoute: string) {
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
