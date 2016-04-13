import * as _ from "underscore";
import {AllowedHttpVerbs} from "./decorators";
import {IApiController, IApiControllerRoute, IApiType, TypeKind, IApiControllerClass, IApiControllerClassConstructor} from "./core";

export class ApiControllerVisitor{
  private static array(type: IApiType, value: string){
    if (type.isArray) {
        return `[${value}]`
    }
    return value;
  }

  static createTypeFromReference(type: IApiType, referenceTypes: IApiType[]) {
    var i = _.find(referenceTypes, rt => rt.name === type.name && rt.kind === (type.kind === TypeKind.InterfaceRef ? TypeKind.Interface : TypeKind.Enum));
    return this.cloneType(type, i);
  }

  static replaceGenericTypes(clone: IApiType,referenceArgs: IApiType[], replaceArgs: IApiType[]) {
    var params = ApiControllerExplorer.gatherTypes([clone]).filter(t => t.kind === TypeKind.TypeParam);
    params.forEach(p => {
      var idx = referenceArgs.map(a => a.name).indexOf(p.name);
      if (idx === -1) {
        console.log("Cannot find referenceArgs:", referenceArgs, replaceArgs)
        return;
      }
      var a = replaceArgs[idx];
      p.name = a.name;
      //p.isArray = a.isArray;
      p.kind = a.kind;
      p.args = a.args;
      p.subTypes = a.subTypes;
      p.members = a.members;
    })
  }

  static cloneType(type: IApiType, referenceType: IApiType) {
    var clone: IApiType = _.extend({}, referenceType);
    clone.isArray = type.isArray;
    if (type.args) {
      clone.args = type.args;
      this.replaceGenericTypes(clone, referenceType.args, type.args);
    }
    return clone;
  }

  static makeTypeValue(type: IApiType, referenceTypes: IApiType[]): string{
  //   return this.getTypeValue(type, referenceTypes)
  // }
  // private static getTypeValue(type: IApiType, referenceTypes: IApiType[]): string{
    switch (type.kind){
      case TypeKind.Simple:
        switch (type.name){
          case "any":
            return this.array(type, "{}");
          case "string":
            return this.array(type, `"value"`);
          case "boolean":
            return this.array(type, `false`);
          case "number":
            return this.array(type, `1`);
          case "void":
            return `null`;
        }
        return `null`;
      case TypeKind.InterfaceRef:
        return this.makeTypeValue(this.createTypeFromReference(type, referenceTypes), referenceTypes);
      case TypeKind.TypeParam:
        return type.name;
      case TypeKind.Union:
        //return type.subTypes.map(m => this.makeTypeValue(m, referenceTypes)).join(" | ")
      case TypeKind.Intersection:
        //return type.subTypes.map(m => this.makeTypeValue(m, referenceTypes)).join(" & ")
        return this.makeTypeValue(type.subTypes[0], referenceTypes)
      case TypeKind.Anonymous:
      case TypeKind.Interface:
        return this.array(type, "{" + type.members.map(m => `"${m.name}" : ${this.makeTypeValue(m.type, referenceTypes)}`).join(",") + "}")
      case TypeKind.EnumRef:
          return this.makeTypeValue(this.createTypeFromReference(type, referenceTypes), referenceTypes);
      case TypeKind.Enum:
        return this.array(type, `${type.members[0].value}`)
      default:
        return `/* ERROR */ ${type.name}: ${type.kind}`
    }
  }
}

export class ApiControllerExplorer{
  static forEachControllerRoute(apiControllers: IApiController[], action: (c: IApiController, r: IApiControllerRoute) => void){
    apiControllers.forEach(c => c.routes.forEach(r => action(c,r)))
  }

  static gatherUntypedRoutes(apiControllers: IApiController[]){
    const types: IApiControllerRoute[] = []
    ApiControllerExplorer.forEachControllerRoute(apiControllers, (c,r) => {
      if (!r.types) {
        types.push(r)
        return;
      }
    })
    return types;
  }

  static gatherRouteTypes(apiControllers: IApiController[]){
    const types: IApiType[] = []
    ApiControllerExplorer.forEachControllerRoute(apiControllers, (c,r) => {
      if (!r.types) {
        return;
      }
      types.push(r.types.request)
      types.push(r.types.response)
      types.push(r.types.params)
      types.push(r.types.queryString)
    })
    return types;
  }

  static gatherTypes(types: IApiType[]){
    var items: IApiType[] = [];
    types.forEach(type => {
      this.collect([type], items);
    })
    return items;
  }
  private static collect(types: IApiType[], collector: IApiType[]) {
    types.forEach(m => {
      collector.push(m);
      if (m.extends) {
        this.collect(m.extends, collector);
      }
      if (m.subTypes) {
        this.collect(m.subTypes, collector);
      }
      if (m.args) {
        this.collect(m.args, collector);
      }
      if (m.members && m.kind !== TypeKind.Enum) {
        this.collect(m.members.map(t => t.type), collector);
      }
    })
  }

  static getAllMiddlewareKeys(apiControllers: IApiController[]) {
    const middleware: string[] = []
    apiControllers.forEach(controller => {
      controller.routes.forEach(route => {
        if (route.middlewares) {
          route.middlewares.forEach(key => {
            if (middleware.indexOf(key) === -1) {
              middleware.push(key);
            }
          })
        }
      })
    })
    return middleware;
  }
}

export class Shared {
  static construct(controllerClass: IApiControllerClass, controllerName: string, controllerConstructor: IApiControllerClassConstructor) {
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

  static makeRouteVerbs(acceptVerbs: string[], route: string) {
    return acceptVerbs.map(verb => { return { route, verb } });
  }
}
