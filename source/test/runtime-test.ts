import {expect,sinon,supertest,chai} from "rokot-test";
import {ExpressRouteBuilder} from "../expressRouteBuilder";
import {RuntimeControllerMetadataCompiler} from "../compilers/runtimeCompiler";
import * as _ from "underscore";
import "./example/controllers";
import "./example/middleware";
import * as fs from "fs";
import {ConsoleLogger,Logger} from "rokot-log";
import {ApiControllerExplorer,ApiControllerVisitor} from "../shared";
import {RouteBuilder,MiddlewareProvider} from "../routeBuilder";
import {IApiControllerCompiler,IApiControllerRoute, IApiRequestHandler, IApiControllerClassConstructor, IApiControllerRouteVerb, IApiType, TypeKind, IApiController, IApi} from "../core";

function compile(name: string, compiler: IApiControllerCompiler, debug = false) {
  const compiled = compiler.compile();
  if (debug) {
    fs.writeFileSync(name, JSON.stringify(compiled, null, 2))
  }
  //compiler.logger.getLogs(debug ? LogLevel.Warn : LogLevel.Warn).forEach(l => console.log(l));
  return compiled;
}

export class TestRouteBuilder extends RouteBuilder {
  routes: IApiControllerRoute[] = []
  routeRequests: IApiControllerRoute[] = []
  constructor(logger: Logger, controllerConstructor?: IApiControllerClassConstructor) {
    super(logger, controllerConstructor)
  }

  protected createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any>) : Function {
    this.routeRequests.push(route);
    this.logger.trace(`Creating Request Handler ${route.name}`)
    return () => {
      this.logger.trace(`Invoking ${route.name}`)
      routeHandler(null);
    }
  }

  protected setupRoute(route: IApiControllerRoute, routeVerb: IApiControllerRouteVerb, requestHandlers: Function[]){
    this.routes.push(route);
    this.logger.trace(`Setup of ${route.name} ${routeVerb.verb}: ${routeVerb.route}`)
  }
}

class Helper{
  static compareArrayValues<T, TValue>(descriptionLeft: string, left: T[], descriptionRight: string, right: T[], compareValue: (t: T) => TValue, compareValues?: (l: T, r: T, compare: TValue) => void){
    Helper.compareArrays(descriptionRight, right, left, compareValue)
    Helper.compareArrays(descriptionLeft, left, right, compareValue, compareValues)
  }

  static compareArrays<T, TValue>(description: string, left: T[], right: T[], compareValue: (t: T) => TValue, compareValues?: (l: T, r: T, compare: TValue) => void){
    if (left === right) {
      return;
    }

    right.forEach(lm => {
      const compare = compareValue(lm);
      const rm = _.find(left, m => compareValue(m) === compare)
      expect(rm).to.not.eq(undefined, `${description} missing ${compare}`);
      if (compareValues) {
        compareValues(lm, rm, compare)
      }
    })
  }
}

function getRefTypes(items: IApiType[]) {
  return items.filter(i => i.kind === TypeKind.InterfaceRef || i.kind === TypeKind.EnumRef)
}

function isEnumInterfaceTypes(item: IApiType) {
  return item.kind === TypeKind.Interface || item.kind === TypeKind.Enum;
}

function getEnumInterfaceTypes(items: IApiType[]) {
  return items.filter(i => isEnumInterfaceTypes(i))
}

function isEnumRef(type: IApiType, compare: IApiType){
  return type.kind === TypeKind.EnumRef && compare.kind === TypeKind.Enum;
}

function isInterfaceRef(type: IApiType, compare: IApiType){
  return type.kind === TypeKind.InterfaceRef && compare.kind === TypeKind.Interface;
}

function matchType(items: IApiType[], type: IApiType) {
  return _.find(items, t => t.name === type.name && (t.kind === type.kind || isInterfaceRef(type, t) || isEnumRef(type, t)))
}

function collectTypes(controllers: IApiController[]) {
  const types = ApiControllerExplorer.gatherRouteTypes(controllers);
  return ApiControllerExplorer.gatherTypes(types);
}

describe("Middleware Provider test", () => {
  it("should find all routes middleware", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const reflectCompiler = new RuntimeControllerMetadataCompiler(logger)
    var api = compile("out/reflected.json", reflectCompiler)
    expect(api.errors.length).to.eq(0, `Should get no errors`)

    var mw = new MiddlewareProvider(logger)
    var middleware = mw.get(api.controllers);
    expect(_.keys(middleware).length).to.greaterThan(0, `Should have metadata`)
    for (var key in middleware) {
      expect(_.isFunction(middleware[key])).to.be.true;
    }
  });
})

describe("Route Builder test", () => {
  it("should build routes from the Api", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const reflectCompiler = new RuntimeControllerMetadataCompiler(logger)
    var api = compile("out/reflected.json", reflectCompiler)
    var builder = new TestRouteBuilder(logger);
    var ok = builder.build(api);
    expect(ok).to.be.true;
    var rC = 0;
    var rvC = 0;
    ApiControllerExplorer.forEachControllerRoute(api.controllers, (c,r) =>{
      rC += 1;
      rvC += r.routeVerbs.length;
    })
    expect(builder.routes.length).to.be.eq(rvC, "Should have one route per controller route verb")
    expect(builder.routeRequests.length).to.be.eq(rC, "Should have one routeRequests per controller route")
  });
})

describe("Controller Metadata Compiler test", () => {
  let reflected: IApi;
  let sourceCode: IApi;

  it("'Runtime' should compile without failure or errors", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const reflectCompiler = new RuntimeControllerMetadataCompiler(logger)
    reflected = compile("out/reflected.json", reflectCompiler, true)
    expect(reflected.errors.length).to.eq(0, `Runtime Compiler should not get errors`)
  });

  it("'Runtime' should have Controller Class", () => {
    reflected.controllers.forEach(m => expect(m.controllerClass, `${m.name} Controller Constructor`).to.be.not.undefined)
  });

  it("'Runtime' should not have type information", () => {
    expect(reflected.referenceTypes).to.be.undefined
    var rts = ApiControllerExplorer.gatherRouteTypes(reflected.controllers);
    expect(rts.length).to.be.eq(0, "Controllers should have no types")
  });
})
