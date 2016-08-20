import {expect,sinon,supertest,chai} from "rokot-test";
//import {ExpressRouteBuilder} from "../expressRouteBuilder";
import {ApiControllerCompiler} from "../apiControllerCompiler";
import * as _ from "underscore";
// import "./example/controllers";
// import "./example/middleware";
import * as fs from "fs";
import {ConsoleLogger,Logger} from "rokot-log";
//import {ApiControllerExplorer} from "../shared";
import {RouteBuilder} from "../routeBuilder";
import {MiddlewareProvider} from "../middlewareProvider";
import {api,apiControllers,middlewares} from "../decorators";
import {IApiRequest,IMiddewareFunction, IApiVoidRequest, IApiControllerCompiler,IApiControllerRoute, IApiRequestHandler, INewableApiControllerConstructor, IApiControllerRouteVerb, IApiController, IApi} from "../core";
// function compile(name: string, compiler: IApiControllerCompiler, debug = false) {
//   const compiled = compiler.compile();
//   if (debug) {
//     fs.writeFileSync(name, JSON.stringify(compiled, null, 2))
//   }
//   //compiler.logger.getLogs(debug ? LogLevel.Warn : LogLevel.Warn).forEach(l => console.log(l));
//   return compiled;
// }

// export class TestRouteBuilder extends RouteBuilder {
//   routes: IApiControllerRoute[] = []
//   routeRequests: IApiControllerRoute[] = []
//   constructor(logger: Logger, middlewares: IMiddewareFunction[], controllerConstructor?: INewableApiControllerConstructor) {
//     super(logger, middlewares, controllerConstructor)
//   }
//
//   protected createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any>) : Function {
//     this.routeRequests.push(route);
//     this.logger.trace(`Creating Request Handler ${route.name}`)
//     return () => {
//       this.logger.trace(`Invoking ${route.name}`)
//       routeHandler(null);
//     }
//   }
//
//   protected setupRoute(route: IApiControllerRoute, routeVerb: IApiControllerRouteVerb, requestHandlers: Function[]){
//     this.routes.push(route);
//     this.logger.trace(`Setup of ${route.name} ${routeVerb.verb}: ${routeVerb.route}`)
//   }
// }
//
// class Helper{
//   static compareArrayValues<T, TValue>(descriptionLeft: string, left: T[], descriptionRight: string, right: T[], compareValue: (t: T) => TValue, compareValues?: (l: T, r: T, compare: TValue) => void){
//     Helper.compareArrays(descriptionRight, right, left, compareValue)
//     Helper.compareArrays(descriptionLeft, left, right, compareValue, compareValues)
//   }
//
//   static compareArrays<T, TValue>(description: string, left: T[], right: T[], compareValue: (t: T) => TValue, compareValues?: (l: T, r: T, compare: TValue) => void){
//     if (left === right) {
//       return;
//     }
//
//     right.forEach(lm => {
//       const compare = compareValue(lm);
//       const rm = _.find(left, m => compareValue(m) === compare)
//       expect(rm).to.not.eq(undefined, `${description} missing ${compare}`);
//       if (compareValues) {
//         compareValues(lm, rm, compare)
//       }
//     })
//   }
// }

// function getRefTypes(items: IApiType[]) {
//   return items.filter(i => i.kind === TypeKind.InterfaceRef || i.kind === TypeKind.EnumRef)
// }
//
// function isEnumInterfaceTypes(item: IApiType) {
//   return item.kind === TypeKind.Interface || item.kind === TypeKind.Enum;
// }
//
// function getEnumInterfaceTypes(items: IApiType[]) {
//   return items.filter(i => isEnumInterfaceTypes(i))
// }
//
// function isEnumRef(type: IApiType, compare: IApiType){
//   return type.kind === TypeKind.EnumRef && compare.kind === TypeKind.Enum;
// }
//
// function isInterfaceRef(type: IApiType, compare: IApiType){
//   return type.kind === TypeKind.InterfaceRef && compare.kind === TypeKind.Interface;
// }
//
// function matchType(items: IApiType[], type: IApiType) {
//   return _.find(items, t => t.name === type.name && (t.kind === type.kind || isInterfaceRef(type, t) || isEnumRef(type, t)))
// }
//
// function collectTypes(controllers: IApiController[]) {
//   const types = ApiControllerExplorer.gatherRouteTypes(controllers);
//   return ApiControllerExplorer.gatherTypes(types);
// }

middlewares.push({key: "four", func: (req: Express.Request, res: Express.Response, next: () => void) => {
  console.log("four")
  next();
}})

class Middleware {
  @api.middlewareFunction("one")
  static one = (req: Express.Request, res: Express.Response, next: () => void) => {
    console.log("one")
    next();
  }

  @api.middlewareFunction("two")
  static two(req: Express.Request, res: Express.Response, next: () => void) {
    console.log("two")
    next();
  }

  @api.middlewareFunction("three")
  three(req: Express.Request, res: Express.Response, next: () => void) {
    console.log("three")
    next();
  }
}


@api.include("middleware", "/middleware", ["one", "two"])
class MiddlewareController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  @api.middleware("three")
  get(req: IApiVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IApiRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("missingMiddleware", "/missingMiddleware", ["one", "two"])
class MissingMiddlewareController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  @api.middleware("five")
  get(req: IApiVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IApiRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("simple", "/simple")
class SimpleController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  get(req: IApiVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get")
  getAll(req: IApiRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("simpleClash")
class SimpleRouteClashController {
  @api.route("simple/:id")
  @api.acceptVerbs("get", "options")
  get(req: IApiVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IApiRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("noVerbs")
class NoVerbsRouteController {
  @api.route()
  get(req: IApiVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  post(req: IApiRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

describe("middlewares", () => {
  it("should find 4 middlewares", () => {
    expect(middlewares.length).to.eq(4, middlewares.map(m => m.key).join(","))

    expect(middlewares.filter(m => !!m.func).length).to.eq(4, "Should have a function on each middleware")
  })
})
describe("ApiControllerCompiler", () => {
  it("should find 2 routes on 'noVerbs' controller", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const simpleOnly = apiControllers.filter(a => a.name === "noVerbs")
    const mws = []
    const reflectCompiler = new ApiControllerCompiler(logger)
    const api = reflectCompiler.compile(simpleOnly,mws)
    //var api = compile("out/reflected.json", reflectCompiler)
    expect(api.errors.length).to.eq(0, `Should get no errors`)
    expect(api.controllers.length).to.eq(1, `Should get 1 controller`)
    expect(api.controllers[0].routes.length).to.eq(2, `Should get 2 routes`)
    expect(api.controllers[0].routes.filter(m => !!m.func).length).to.eq(2, "Should have a function on each route")
    expect(api.controllers[0].routes[0].name).to.eq("noVerbs_get", `1st route should be 'get'`)
    expect(api.controllers[0].routes[0].routeVerbs.length).to.eq(1, `1st route should have 1 verb`)
    expect(api.controllers[0].routes[0].routeVerbs[0].verb).to.eq("get", `1st route should have get verb`)
    expect(api.controllers[0].routes[1].name).to.eq("noVerbs_post", `2nd route should be 'get'`)
    expect(api.controllers[0].routes[1].routeVerbs.length).to.eq(1, `2nd route should have 1 verb`)
    expect(api.controllers[0].routes[1].routeVerbs[0].verb).to.eq("post", `2nd route should have post verb`)

    var mw = new MiddlewareProvider(logger, mws)
    var middleware = mw.get(simpleOnly);
    expect(_.keys(middleware).length).to.eq(0, `Should have no middleware`)
    for (var key in middleware) {
      expect(_.isFunction(middleware[key])).to.be.true;
    }
  });
  it("should find 2 routes on 'simple' controller", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const simpleOnly = apiControllers.filter(a => a.name === "simple")
    const mws = []
    const reflectCompiler = new ApiControllerCompiler(logger)
    const api = reflectCompiler.compile(simpleOnly,mws)
    //var api = compile("out/reflected.json", reflectCompiler)
    expect(api.errors.length).to.eq(0, `Should get no errors`)
    expect(api.controllers.length).to.eq(1, `Should get 1 controller`)
    expect(api.controllers[0].routes.length).to.eq(2, `Should get 2 routes`)
    expect(api.controllers[0].routes.filter(m => !!m.func).length).to.eq(2, "Should have a function on each route")
    expect(api.controllers[0].routes[0].name).to.eq("simple_get", `1st route should be 'get'`)
    expect(api.controllers[0].routes[0].routeVerbs.length).to.eq(2, `1st route should have 2 verbs`)
    expect(api.controllers[0].routes[0].routeVerbs[0].verb).to.eq("get", `1st route should have get verb`)
    expect(api.controllers[0].routes[0].routeVerbs[1].verb).to.eq("options", `1st route should have get verb`)
    expect(api.controllers[0].routes[1].name).to.eq("simple_getAll", `2nd route should be 'get'`)
    expect(api.controllers[0].routes[1].routeVerbs.length).to.eq(1, `2nd route should have 1 verb`)
    expect(api.controllers[0].routes[0].routeVerbs[0].verb).to.eq("get", `1st route should have get verb`)

    var mw = new MiddlewareProvider(logger, mws)
    var middleware = mw.get(simpleOnly);
    expect(_.keys(middleware).length).to.eq(0, `Should have no middleware`)
    for (var key in middleware) {
      expect(_.isFunction(middleware[key])).to.be.true;
    }
  });

  it("should find 2 routes on 'middleware' controller with metadata", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const middlewareOnly = apiControllers.filter(a => a.name === "middleware")
    const reflectCompiler = new ApiControllerCompiler(logger)
    const api = reflectCompiler.compile(middlewareOnly,middlewares.map(m => m.key))
    //var api = compile("out/reflected.json", reflectCompiler)
    expect(api.errors.length).to.eq(0, `Should get no errors`)
    expect(api.controllers.length).to.eq(1, `Should get 1 controller`)
    expect(api.controllers[0].routes.length).to.eq(2, `Should get 2 routes`)
    expect(api.controllers[0].routes.filter(m => !!m.func).length).to.eq(2, "Should have a function on each route")
    expect(api.controllers[0].routes[0].name).to.eq("middleware_get", `1st route should be 'get'`)
    expect(api.controllers[0].routes[0].middlewares.length).to.eq(3, `1st route should have 3 middleware`)
    expect(api.controllers[0].routes[1].name).to.eq("middleware_getAll", `2nd route should be 'get'`)
    expect(api.controllers[0].routes[1].middlewares.length).to.eq(2, `2nd route should have 2 middleware`)

    var mw = new MiddlewareProvider(logger, middlewares)
    var middleware = mw.get(middlewareOnly);
    expect(_.keys(middleware).length).to.eq(3, `Should have 3 middleware`)
  });

  it("should fail on 'simple' and 'simpleClash' routes - two clashes (1 route with 2 verbs)", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const simpleAndClashOnly = apiControllers.filter(a => a.name === "simple" || a.name === "simpleClash")
    const reflectCompiler = new ApiControllerCompiler(logger)
    const api = reflectCompiler.compile(simpleAndClashOnly,[""])
    //var api = compile("out/reflected.json", reflectCompiler)
    expect(api.errors.length).to.eq(2, `Should get 2 errors`)
    //console.log(api.errors)
  });
  it("should fail on 'missingMiddleware' route - 1 missing middleware", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const missingMiddlewareOnly = apiControllers.filter(a => a.name === "missingMiddleware")
    const reflectCompiler = new ApiControllerCompiler(logger)
    const api = reflectCompiler.compile(missingMiddlewareOnly,middlewares.map(m => m.key))
    //var api = compile("out/reflected.json", reflectCompiler)
    expect(api.errors.length).to.eq(1, `Should get 1 errors`)
    //console.log(api.errors)
  });
})

// describe("Route Builder test", () => {
//   it("should build routes from the Api", () => {
//     const logger = ConsoleLogger.create("test",{level:"info"});
//     const reflectCompiler = new RuntimeControllerMetadataCompiler(apiControllers,middlewares,logger)
//     var api = compile("out/reflected.json", reflectCompiler)
//     var builder = new TestRouteBuilder(logger);
//     var ok = builder.build(api);
//     expect(ok).to.be.true;
//     var rC = 0;
//     var rvC = 0;
//     ApiControllerExplorer.forEachControllerRoute(api.controllers, (c,r) =>{
//       rC += 1;
//       rvC += r.routeVerbs.length;
//     })
//     expect(builder.routes.length).to.be.eq(rvC, "Should have one route per controller route verb")
//     expect(builder.routeRequests.length).to.be.eq(rC, "Should have one routeRequests per controller route")
//   });
// })
//
// describe("Controller Metadata Compiler test", () => {
//   let reflected: IApi;
//   let sourceCode: IApi;
//
//   it("'Runtime' should compile without failure or errors", () => {
//     const logger = ConsoleLogger.create("test",{level:"info"});
//     const reflectCompiler = new RuntimeControllerMetadataCompiler(apiControllers,middlewares,logger)
//     reflected = compile("out/reflected.json", reflectCompiler, true)
//     expect(reflected.errors.length).to.eq(0, `Runtime Compiler should not get errors`)
//   });
//
//   it("'Runtime' should have Controller Class", () => {
//     reflected.controllers.forEach(m => expect(m.controllerClass, `${m.name} Controller Constructor`).to.be.not.undefined)
//   });
//
//   // it("'Runtime' should not have type information", () => {
//   //   expect(reflected.referenceTypes).to.be.undefined
//   //   var rts = ApiControllerExplorer.gatherRouteTypes(reflected.controllers);
//   //   expect(rts.length).to.be.eq(0, "Controllers should have no types")
//   // });
// })
